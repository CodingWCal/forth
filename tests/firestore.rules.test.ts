import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  loadWorkspaceStateFromDatabase,
  saveWorkspaceToDatabase,
  WorkspaceConflictError,
} from "../lib/firebase/workspace";
import type { WorkspaceState } from "../lib/types";

const projectId = "forth-rules-test";
const ownerId = "guild-owner";
const outsiderId = "outside-adventurer";
const ownerEmail = "owner@example.com";
const firstGuildId = "guild-123e4567-e89b-42d3-a456-426614174000";
let testEnv: RulesTestEnvironment;

function normalizedCurrent(revision = 0, pace: WorkspaceState["pace"] = "steady") {
  return { storageVersion: 1, schemaVersion: 2, revision, pace, sprite: "code-squire" };
}

function projectRecord(revision = 0) {
  return {
    id: "project-one",
    title: "Cohort platform",
    code: "COHORT",
    outcome: "Ship a dependable workspace.",
    color: "moss",
    targetDate: "2026-08-20",
    position: 0,
    revision,
  };
}

function workspaceFixture(): WorkspaceState {
  return {
    version: 2,
    pace: "steady",
    sprite: "code-squire",
    projects: [{
      id: "project-one",
      title: "Cohort platform",
      code: "COHORT",
      outcome: "Ship a dependable workspace.",
      color: "moss",
      targetDate: "2026-08-20",
    }],
    tasks: [],
  };
}

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
    const initialData = writeBatch(ownerDb);
    initialData.set(doc(ownerDb, "workspaces", firstGuildId, "data", "current"), normalizedCurrent());
    initialData.set(doc(ownerDb, "workspaces", firstGuildId, "projects", "project-one"), projectRecord());
    await assertSucceeds(initialData.commit());
    await assertSucceeds(setDoc(doc(ownerDb, "workspaces", firstGuildId, "members", ownerId), {
      uid: ownerId,
      email: ownerEmail,
      role: "owner",
    }));

    await assertSucceeds(getDoc(workspace));
    await assertSucceeds(getDoc(doc(ownerDb, "workspaces", firstGuildId, "members", ownerId)));
    await assertSucceeds(getDoc(doc(ownerDb, "workspaces", firstGuildId, "data", "current")));
    await assertSucceeds(getDoc(doc(ownerDb, "workspaces", firstGuildId, "projects", "project-one")));
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
        ...normalizedCurrent(),
      });
      await setDoc(doc(adminDb, "workspaces", ownerId, "projects", "project-one"), projectRecord());
    });

    const memberDb = testEnv.authenticatedContext(memberId).firestore();
    await assertSucceeds(getDoc(doc(memberDb, "workspaces", ownerId)));
    await assertSucceeds(runTransaction(memberDb, async (transaction) => {
      const currentRef = doc(memberDb, "workspaces", ownerId, "data", "current");
      const current = await transaction.get(currentRef);
      transaction.set(currentRef, normalizedCurrent(current.data()?.revision + 1, "full"));
      transaction.set(doc(memberDb, "workspaces", ownerId, "tasks", "member-task"), {
        id: "member-task",
        title: "Verify collaboration",
        projectId: "project-one",
        status: "ready",
        weight: 1,
        meaning: "Protect shared work.",
        assignee: "Guild member",
        isFocus: false,
        createdAt: "2026-07-21T12:00:00.000Z",
        revision: current.data()?.revision + 1,
      });
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
    const initialData = writeBatch(db);
    initialData.set(doc(db, "workspaces", guildId, "data", "current"), normalizedCurrent());
    initialData.set(doc(db, "workspaces", guildId, "projects", "project-one"), projectRecord());
    await assertSucceeds(initialData.commit());
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

  it("rejects a stale client instead of silently replacing a teammate's ticket (TICKET-001)", async () => {
    const workspaceId = "concurrency-workspace";
    const memberId = "concurrency-member";
    const base = workspaceFixture();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", workspaceId), { ownerId, name: "Concurrency guild" });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "members", memberId), {
        uid: memberId,
        role: "member",
      });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "data", "current"), normalizedCurrent());
      await setDoc(doc(adminDb, "workspaces", workspaceId, "projects", "project-one"), projectRecord());
    });

    const memberDb = testEnv.authenticatedContext(memberId).firestore();
    const firstTask = {
      id: "first-client-task",
      title: "Keep the first edit",
      projectId: "project-one",
      status: "done" as const,
      weight: 1 as const,
      meaning: "Prove completed work grows as separate records.",
      assignee: "First client",
      isFocus: false,
      archived: true,
      createdAt: "2026-07-21T12:00:00.000Z",
      completedAt: "2026-07-21T12:05:00.000Z",
    };
    const secondTask = {
      ...firstTask,
      id: "second-client-task",
      title: "Overwrite from stale client",
      assignee: "Second client",
    };

    await expect(saveWorkspaceToDatabase(
      memberDb,
      workspaceId,
      0,
      base,
      { ...base, tasks: [firstTask] },
    )).resolves.toMatchObject({ revision: 1 });

    await expect(saveWorkspaceToDatabase(
      memberDb,
      workspaceId,
      0,
      base,
      { ...base, tasks: [secondTask] },
    )).rejects.toBeInstanceOf(WorkspaceConflictError);

    const current = await getDoc(doc(memberDb, "workspaces", workspaceId, "data", "current"));
    expect(current.data()).toMatchObject({
      storageVersion: 1,
      revision: 1,
      pace: "steady",
      sprite: "code-squire",
    });
    expect(current.data()).not.toHaveProperty("state");
    expect((await getDoc(doc(memberDb, "workspaces", workspaceId, "tasks", firstTask.id))).exists()).toBe(true);
    expect((await getDoc(doc(memberDb, "workspaces", workspaceId, "tasks", secondTask.id))).exists()).toBe(false);
    expect((await getDocs(collection(memberDb, "workspaces", workspaceId, "tasks"))).size).toBe(1);
    await expect(loadWorkspaceStateFromDatabase(memberDb, workspaceId)).resolves.toEqual({
      state: { ...base, tasks: [firstTask] },
      revision: 1,
    });
  });

  it("persists the selected sprite in normalized workspace metadata", async () => {
    const workspaceId = "sprite-workspace";
    const memberId = "sprite-member";
    const base = workspaceFixture();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", workspaceId), { ownerId, name: "Sprite guild" });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "members", memberId), {
        uid: memberId,
        role: "member",
      });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "data", "current"), normalizedCurrent());
      await setDoc(doc(adminDb, "workspaces", workspaceId, "projects", "project-one"), projectRecord());
    });

    const memberDb = testEnv.authenticatedContext(memberId).firestore();
    const nextState: WorkspaceState = { ...base, sprite: "ambiguous-squire" };
    await expect(saveWorkspaceToDatabase(memberDb, workspaceId, 0, base, nextState))
      .resolves.toMatchObject({ state: nextState, revision: 1 });

    const current = await getDoc(doc(memberDb, "workspaces", workspaceId, "data", "current"));
    expect(current.data()).toMatchObject({
      storageVersion: 1,
      revision: 1,
      sprite: "ambiguous-squire",
    });
    await expect(loadWorkspaceStateFromDatabase(memberDb, workspaceId))
      .resolves.toEqual({ state: nextState, revision: 1 });
  });

  it("requires entity writes to advance the workspace revision atomically (TICKET-001)", async () => {
    const memberDb = testEnv.authenticatedContext("concurrency-member").firestore();
    await assertFails(setDoc(
      doc(memberDb, "workspaces", "concurrency-workspace", "tasks", "uncoupled-task"),
      {
        id: "uncoupled-task",
        title: "Bypass revision",
        projectId: "project-one",
        status: "ready",
        weight: 1,
        meaning: "This direct write must fail.",
        assignee: "Member",
        isFocus: false,
        createdAt: "2026-07-21T12:00:00.000Z",
        revision: 1,
      },
    ));
  });

  it("allows exactly one winner when two clients commit the same revision concurrently (TICKET-001)", async () => {
    const workspaceId = "parallel-concurrency-workspace";
    const memberId = "parallel-concurrency-member";
    const base = workspaceFixture();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", workspaceId), { ownerId, name: "Parallel guild" });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "members", memberId), {
        uid: memberId,
        role: "member",
      });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "data", "current"), normalizedCurrent());
      await setDoc(doc(adminDb, "workspaces", workspaceId, "projects", "project-one"), projectRecord());
    });

    const memberDb = testEnv.authenticatedContext(memberId).firestore();
    const taskFor = (id: string) => ({
      id,
      title: `Concurrent ticket ${id}`,
      projectId: "project-one",
      status: "ready" as const,
      weight: 1 as const,
      meaning: "Only one revision-zero transaction may win.",
      assignee: id,
      isFocus: false,
      createdAt: "2026-07-21T12:00:00.000Z",
    });
    const results = await Promise.allSettled([
      saveWorkspaceToDatabase(memberDb, workspaceId, 0, base, { ...base, tasks: [taskFor("alpha")] }),
      saveWorkspaceToDatabase(memberDb, workspaceId, 0, base, { ...base, tasks: [taskFor("beta")] }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(WorkspaceConflictError);
    expect((await getDocs(collection(memberDb, "workspaces", workspaceId, "tasks"))).size).toBe(1);
    expect((await getDoc(doc(memberDb, "workspaces", workspaceId, "data", "current"))).data()?.revision).toBe(1);
  });

  it("migrates a valid legacy snapshot on its first conflict-safe save (TICKET-001)", async () => {
    const workspaceId = "legacy-migration-workspace";
    const memberId = "legacy-migration-member";
    const base = workspaceFixture();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", workspaceId), { ownerId, name: "Legacy guild" });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "members", memberId), {
        uid: memberId,
        role: "member",
      });
      await setDoc(doc(adminDb, "workspaces", workspaceId, "data", "current"), { state: base });
    });

    const memberDb = testEnv.authenticatedContext(memberId).firestore();
    await expect(saveWorkspaceToDatabase(
      memberDb,
      workspaceId,
      0,
      base,
      { ...base, pace: "full" },
    )).resolves.toMatchObject({ revision: 1 });

    expect((await getDoc(doc(memberDb, "workspaces", workspaceId, "projects", "project-one"))).exists()).toBe(true);
    const recovery = await getDoc(doc(memberDb, "workspaces", workspaceId, "recovery", "legacy-v2"));
    expect(recovery.data()).toMatchObject({ sourceStorageVersion: "whole-state-v2", state: base });
    const current = await getDoc(doc(memberDb, "workspaces", workspaceId, "data", "current"));
    expect(current.data()).toMatchObject({
      storageVersion: 1,
      revision: 1,
      pace: "full",
      sprite: "code-squire",
    });
    expect(current.data()).not.toHaveProperty("state");
  });

  it("lets any signed-in account self-join only the configured open cohort guild (TICKET-031, simplified)", async () => {
    const openGuildId = "guild-7ea24403-64f6-424c-b2d7-0d7e44209492";
    const otherGuildId = "some-other-private-guild";
    const joinerId = "cohort-joiner";
    const joinerEmail = "joiner@example.com";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "workspaces", openGuildId), { ownerId, name: "Cursor Boston guild" });
      await setDoc(doc(adminDb, "workspaces", otherGuildId), { ownerId, name: "Someone else's guild" });
    });

    const joinerDb = testEnv.authenticatedContext(joinerId, { email: joinerEmail }).firestore();
    await assertSucceeds(setDoc(doc(joinerDb, "workspaces", openGuildId, "members", joinerId), {
      uid: joinerId,
      email: joinerEmail,
      role: "member",
    }));

    // The open-join allowance is scoped to exactly the one configured guild id;
    // every other workspace keeps its normal invite-only boundary.
    await assertFails(setDoc(doc(joinerDb, "workspaces", otherGuildId, "members", joinerId), {
      uid: joinerId,
      email: joinerEmail,
      role: "member",
    }));
  });
});
