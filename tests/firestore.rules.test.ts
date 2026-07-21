import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collectionGroup, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";

const projectId = "forth-rules-test";
const ownerId = "guild-owner";
const outsiderId = "outside-adventurer";
const ownerEmail = "owner@example.com";
const firstGuildId = "guild-123e4567-e89b-42d3-a456-426614174000";
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Firestore workspace rules", () => {
  it("provisions a complete UUID-keyed workspace with membership last", async () => {
    const ownerDb = testEnv.authenticatedContext(ownerId, { email: ownerEmail }).firestore();
    const workspace = doc(ownerDb, "workspaces", firstGuildId);

    // Mirrors the client provisioner. Membership is deliberately last so an
    // interrupted setup never appears as a usable guild in the directory.
    await assertSucceeds(setDoc(workspace, { ownerId, name: "Owner guild" }));
    await assertSucceeds(setDoc(doc(ownerDb, "workspaces", firstGuildId, "data", "current"), {
      state: { version: 2 },
    }));
    await assertSucceeds(setDoc(doc(ownerDb, "workspaces", firstGuildId, "members", ownerId), {
      uid: ownerId,
      email: ownerEmail,
      role: "owner",
    }));

    await assertSucceeds(getDoc(workspace));
    await assertSucceeds(getDoc(doc(ownerDb, "workspaces", firstGuildId, "members", ownerId)));
    await assertSucceeds(getDoc(doc(ownerDb, "workspaces", firstGuildId, "data", "current")));
  });

  it("denies an outsider from reading or writing another owner's workspace", async () => {
    const outsiderDb = testEnv.authenticatedContext(outsiderId).firestore();
    const privateWorkspace = doc(outsiderDb, "workspaces", ownerId);
    await assertFails(getDoc(privateWorkspace));
    await assertFails(setDoc(doc(outsiderDb, "workspaces", ownerId, "data", "current"), {
      state: { version: 2 },
    }));
  });

  it("binds a new workspace owner to the authenticated identity", async () => {
    const ownerDb = testEnv.authenticatedContext(ownerId, { email: ownerEmail }).firestore();
    const borrowedGuildId = "guild-223e4567-e89b-42d3-a456-426614174000";
    const borrowedBatch = writeBatch(ownerDb);
    borrowedBatch.set(doc(ownerDb, "workspaces", borrowedGuildId), {
      ownerId: outsiderId,
      name: "Wrong path",
    });
    borrowedBatch.set(doc(ownerDb, "workspaces", borrowedGuildId, "members", ownerId), {
      uid: ownerId,
      email: ownerEmail,
      role: "owner",
    });
    borrowedBatch.set(doc(ownerDb, "workspaces", borrowedGuildId, "data", "current"), {
      state: { version: 2 },
    });
    await assertFails(borrowedBatch.commit());

    // Human-readable or uid-like paths are legacy-only; new roots must use a
    // generated guild UUID even when the caller claims themselves as owner.
    await assertFails(setDoc(doc(ownerDb, "workspaces", "another-guild"), {
      ownerId,
      name: "A second guild",
    }));
  });

  it("blocks an attacker from pre-claiming another account's uid path", async () => {
    const attackerId = "path-attacker";
    const victimId = "future-victim-uid";
    const attackerEmail = "attacker@example.com";
    const attackerDb = testEnv.authenticatedContext(attackerId, { email: attackerEmail }).firestore();
    const attack = writeBatch(attackerDb);
    attack.set(doc(attackerDb, "workspaces", victimId), {
      ownerId: attackerId,
      name: "Pre-claimed victim path",
    });
    attack.set(doc(attackerDb, "workspaces", victimId, "members", attackerId), {
      uid: attackerId,
      email: attackerEmail,
      role: "owner",
    });
    attack.set(doc(attackerDb, "workspaces", victimId, "data", "current"), {
      state: { version: 2 },
    });
    await assertFails(attack.commit());

    await testEnv.withSecurityRulesDisabled(async (context) => {
      expect((await getDoc(doc(context.firestore(), "workspaces", victimId))).exists()).toBe(false);
    });
  });

  it("prevents an owner from changing the workspace owner id", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "workspaces", ownerId), {
        ownerId,
        name: "Owner guild",
      });
    });
    const ownerDb = testEnv.authenticatedContext(ownerId).firestore();
    await assertFails(setDoc(doc(ownerDb, "workspaces", ownerId), {
      ownerId: outsiderId,
      name: "Transferred guild",
    }));
  });

  it("lets a member use workspace data without granting owner controls", async () => {
    const memberId = "guild-member";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", ownerId), { ownerId, name: "Owner guild" });
      await setDoc(doc(adminDb, "workspaces", ownerId, "members", memberId), {
        uid: memberId,
        role: "member",
      });
      await setDoc(doc(adminDb, "workspaces", ownerId, "data", "current"), {
        state: { version: 2 },
      });
    });

    const memberDb = testEnv.authenticatedContext(memberId).firestore();
    await assertSucceeds(getDoc(doc(memberDb, "workspaces", ownerId)));
    await assertSucceeds(setDoc(doc(memberDb, "workspaces", ownerId, "data", "current"), {
      state: { version: 2, pace: 3 },
    }));
    await assertFails(setDoc(doc(memberDb, "workspaces", ownerId), {
      ownerId,
      name: "Renamed without permission",
    }, { merge: true }));
    await assertFails(setDoc(doc(memberDb, "workspaces", ownerId, "members", "new-member"), {
      uid: "new-member",
      role: "member",
    }));
  });

  it("denies unauthenticated access", async () => {
    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousDb, "workspaces", ownerId)));
  });

  it("lets an invited account discover and accept only its own invite", async () => {
    const memberId = "invitee";
    const memberEmail = "invitee@example.com";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", ownerId), { ownerId, name: "Owner guild" });
      await setDoc(doc(adminDb, "workspaces", ownerId, "invites", memberEmail), {
        email: memberEmail,
        workspaceName: "Owner guild",
      });
      await setDoc(doc(adminDb, "workspaces", ownerId, "data", "current"), { state: { version: 2 } });
    });

    const memberDb = testEnv.authenticatedContext(memberId, { email: memberEmail }).firestore();
    await assertSucceeds(getDoc(doc(memberDb, "workspaces", ownerId, "invites", memberEmail)));

    // A member write without consuming the invite would be a partial accept.
    await assertFails(setDoc(doc(memberDb, "workspaces", ownerId, "members", memberId), {
      uid: memberId,
      email: memberEmail,
      role: "member",
    }));

    const acceptance = writeBatch(memberDb);
    acceptance.set(doc(memberDb, "workspaces", ownerId, "members", memberId), {
      uid: memberId,
      email: memberEmail,
      role: "member",
    });
    acceptance.delete(doc(memberDb, "workspaces", ownerId, "invites", memberEmail));
    await assertSucceeds(acceptance.commit());

    // The post-commit shape is also what makes a repeated client call
    // idempotent: no invite remains, while the caller can still read their
    // existing member document and treat the operation as already complete.
    await assertFails(getDoc(doc(memberDb, "workspaces", ownerId, "invites", memberEmail)));
    await assertSucceeds(getDoc(doc(memberDb, "workspaces", ownerId, "members", memberId)));
    await assertSucceeds(getDocs(query(collectionGroup(memberDb, "members"), where("uid", "==", memberId))));
    await assertSucceeds(getDoc(doc(memberDb, "workspaces", ownerId, "data", "current")));
  });

  it("lets an invited account discover its invites through a collection-group query", async () => {
    const inviteeEmail = "summoned@example.com";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", ownerId), { ownerId, name: "Owner guild" });
      await setDoc(doc(adminDb, "workspaces", ownerId, "invites", inviteeEmail), {
        email: inviteeEmail,
        workspaceId: ownerId,
        workspaceName: "Owner guild",
        invitedBy: "Guild leader",
      });
      await setDoc(doc(adminDb, "workspaces", "second-guild"), { ownerId, name: "Second guild" });
      await setDoc(doc(adminDb, "workspaces", "second-guild", "invites", "someone-else@example.com"), {
        email: "someone-else@example.com",
        workspaceId: "second-guild",
        workspaceName: "Second guild",
        invitedBy: "Guild leader",
      });
    });

    const inviteeDb = testEnv.authenticatedContext("summoned-user", { email: inviteeEmail }).firestore();
    await assertSucceeds(getDocs(query(collectionGroup(inviteeDb, "invites"), where("email", "==", inviteeEmail))));
    await assertFails(getDocs(query(collectionGroup(inviteeDb, "invites"), where("email", "==", "someone-else@example.com"))));
    await assertFails(getDocs(collectionGroup(inviteeDb, "invites")));
    await assertFails(getDoc(doc(inviteeDb, "workspaces", "second-guild", "invites", "someone-else@example.com")));
  });

  it("denies signed-out and unscoped invite discovery", async () => {
    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(query(collectionGroup(anonymousDb, "invites"), where("email", "==", "anyone@example.com"))));
  });

  it("lets a recipient decline only their own invitation", async () => {
    const declinerEmail = "decliner@example.com";
    const bystanderEmail = "bystander@example.com";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", ownerId), { ownerId, name: "Owner guild" });
      await setDoc(doc(adminDb, "workspaces", ownerId, "invites", declinerEmail), {
        email: declinerEmail,
        workspaceId: ownerId,
        workspaceName: "Owner guild",
      });
      await setDoc(doc(adminDb, "workspaces", ownerId, "invites", bystanderEmail), {
        email: bystanderEmail,
        workspaceId: ownerId,
        workspaceName: "Owner guild",
      });
    });

    const declinerDb = testEnv.authenticatedContext("decliner-user", { email: declinerEmail }).firestore();
    await assertFails(deleteDoc(doc(declinerDb, "workspaces", ownerId, "invites", bystanderEmail)));
    await assertSucceeds(deleteDoc(doc(declinerDb, "workspaces", ownerId, "invites", declinerEmail)));
  });

  it("requires a brand-new account to provision a UUID guild atomically", async () => {
    const newUserId = "fresh-adventurer";
    const newUserEmail = "fresh@example.com";
    const db = testEnv.authenticatedContext(newUserId, { email: newUserEmail }).firestore();

    // Legacy self paths may still be read, but new uid-keyed roots are blocked.
    await assertSucceeds(getDoc(doc(db, "workspaces", newUserId)));
    await assertFails(setDoc(doc(db, "workspaces", newUserId), {
      ownerId: newUserId,
      name: "Fresh guild",
    }));

    const guildId = "guild-323e4567-e89b-42d3-a456-426614174000";
    await assertSucceeds(setDoc(doc(db, "workspaces", guildId), {
      ownerId: newUserId,
      name: "Fresh guild",
    }));
    await assertSucceeds(setDoc(doc(db, "workspaces", guildId, "data", "current"), {
      state: { version: 2 },
    }));
    await assertSucceeds(setDoc(doc(db, "workspaces", guildId, "members", newUserId), {
      uid: newUserId,
      email: newUserEmail,
      role: "owner",
    }));
    await assertSucceeds(getDoc(doc(db, "workspaces", guildId, "data", "current")));
  });

  it("does not let the own-workspace read rule expose another account's workspace", async () => {
    // The uid-keyed read allowance must be scoped to the caller's own id only.
    const stranger = testEnv.authenticatedContext("stranger", { email: "stranger@example.com" }).firestore();
    await assertFails(getDoc(doc(stranger, "workspaces", "someone-elses-uid")));
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "workspaces", "someone-elses-uid"), {
        ownerId: "someone-elses-uid",
        name: "Private guild",
      });
    });
    await assertFails(getDoc(doc(stranger, "workspaces", "someone-elses-uid")));
  });

  it("rejects a member self-join without an email-matched invite", async () => {
    const memberDb = testEnv.authenticatedContext("uninvited", { email: "uninvited@example.com" }).firestore();
    await assertFails(setDoc(doc(memberDb, "workspaces", ownerId, "members", "uninvited"), {
      uid: "uninvited",
      email: "uninvited@example.com",
      role: "member",
    }));
  });

  it("lets an owner cancel a pending invite but blocks outsiders (TICKET-008)", async () => {
    const inviteEmail = "cancel-me@example.com";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", ownerId), { ownerId, name: "Owner guild" });
      await setDoc(doc(adminDb, "workspaces", ownerId, "invites", inviteEmail), {
        email: inviteEmail,
        workspaceId: ownerId,
        workspaceName: "Owner guild",
      });
    });
    const outsiderDb = testEnv.authenticatedContext(outsiderId, { email: "outsider@example.com" }).firestore();
    await assertFails(deleteDoc(doc(outsiderDb, "workspaces", ownerId, "invites", inviteEmail)));
    const ownerDb = testEnv.authenticatedContext(ownerId).firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, "workspaces", ownerId, "invites", inviteEmail)));
  });

  it("blocks accepting an expired invite but allows a live one (TICKET-008)", async () => {
    const email = "timed@example.com";
    const memberId = "timed-user";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", ownerId), { ownerId, name: "Owner guild" });
      await setDoc(doc(adminDb, "workspaces", ownerId, "invites", email), {
        email,
        workspaceId: ownerId,
        workspaceName: "Owner guild",
        expiresAt: new Date(Date.now() - 60_000),
      });
    });
    const memberDb = testEnv.authenticatedContext(memberId, { email }).firestore();
    const expiredAcceptance = writeBatch(memberDb);
    expiredAcceptance.set(doc(memberDb, "workspaces", ownerId, "members", memberId), {
      uid: memberId,
      email,
      role: "member",
    });
    expiredAcceptance.delete(doc(memberDb, "workspaces", ownerId, "invites", email));
    await assertFails(expiredAcceptance.commit());
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "workspaces", ownerId, "invites", email), {
        email,
        workspaceId: ownerId,
        workspaceName: "Owner guild",
        expiresAt: new Date(Date.now() + 60_000),
      });
    });
    const liveAcceptance = writeBatch(memberDb);
    liveAcceptance.set(doc(memberDb, "workspaces", ownerId, "members", memberId), {
      uid: memberId,
      email,
      role: "member",
    });
    liveAcceptance.delete(doc(memberDb, "workspaces", ownerId, "invites", email));
    await assertSucceeds(liveAcceptance.commit());
  });

  it("still accepts a legacy invite that has no expiry field (TICKET-008)", async () => {
    const email = "legacy@example.com";
    const memberId = "legacy-user";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", ownerId), { ownerId, name: "Owner guild" });
      await setDoc(doc(adminDb, "workspaces", ownerId, "invites", email), {
        email,
        workspaceId: ownerId,
        workspaceName: "Owner guild",
      });
    });
    const memberDb = testEnv.authenticatedContext(memberId, { email }).firestore();
    const acceptance = writeBatch(memberDb);
    acceptance.set(doc(memberDb, "workspaces", ownerId, "members", memberId), {
      uid: memberId,
      email,
      role: "member",
    });
    acceptance.delete(doc(memberDb, "workspaces", ownerId, "invites", email));
    await assertSucceeds(acceptance.commit());
  });
});
