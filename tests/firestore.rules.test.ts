import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collectionGroup, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

const projectId = "forth-rules-test";
const ownerId = "guild-owner";
const outsiderId = "outside-adventurer";
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
  it("lets an authenticated owner provision and access only their workspace", async () => {
    const ownerDb = testEnv.authenticatedContext(ownerId).firestore();
    const workspace = doc(ownerDb, "workspaces", ownerId);
    await assertSucceeds(setDoc(workspace, { ownerId, name: "Owner guild" }));
    await assertSucceeds(setDoc(doc(ownerDb, "workspaces", ownerId, "members", ownerId), {
      uid: ownerId,
      role: "owner",
    }));
    await assertSucceeds(setDoc(doc(ownerDb, "workspaces", ownerId, "data", "current"), {
      state: { version: 2 },
    }));
    await assertSucceeds(getDoc(workspace));
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
    const ownerDb = testEnv.authenticatedContext(ownerId).firestore();
    await assertFails(setDoc(doc(ownerDb, "workspaces", "borrowed-id"), {
      ownerId: outsiderId,
      name: "Wrong path",
    }));
    await assertSucceeds(setDoc(doc(ownerDb, "workspaces", "another-guild"), {
      ownerId,
      name: "A second guild",
    }));
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
    await assertSucceeds(setDoc(doc(memberDb, "workspaces", ownerId, "members", memberId), {
      uid: memberId,
      email: memberEmail,
      role: "member",
    }));
    await assertSucceeds(deleteDoc(doc(memberDb, "workspaces", ownerId, "invites", memberEmail)));
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

  it("lets a brand-new account provision its own default workspace", async () => {
    const newUserId = "fresh-adventurer";
    const newUserEmail = "fresh@example.com";
    const db = testEnv.authenticatedContext(newUserId, { email: newUserEmail }).firestore();
    // Mirrors createWorkspaceAt(): read own (non-existent) workspace first, then
    // create it, the owner member document, and the initial state document.
    await assertSucceeds(getDoc(doc(db, "workspaces", newUserId)));
    await assertSucceeds(setDoc(doc(db, "workspaces", newUserId), {
      ownerId: newUserId,
      name: "Fresh guild",
    }));
    await assertSucceeds(setDoc(doc(db, "workspaces", newUserId, "members", newUserId), {
      uid: newUserId,
      email: newUserEmail,
      role: "owner",
    }));
    await assertSucceeds(getDoc(doc(db, "workspaces", newUserId, "data", "current")));
    await assertSucceeds(setDoc(doc(db, "workspaces", newUserId, "data", "current"), {
      state: { version: 2 },
    }));
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
});
