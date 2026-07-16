import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

  it("denies unauthenticated access", async () => {
    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousDb, "workspaces", ownerId)));
  });
});
