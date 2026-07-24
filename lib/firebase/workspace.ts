import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { Project, Task, WorkspaceState } from "@/lib/types";
import {
  createForthAuthProvider,
  requireAuthEmail,
  type ForthAuthProvider,
} from "@/lib/firebase/auth";
import { getFirebaseServices } from "@/lib/firebase/config";
import { parseStoredWorkspace } from "@/lib/workspace";

export {
  AUTH_PROVIDER_OPTIONS,
  classifyAuthFailure,
  getAuthFailureMessage,
  getAuthProviderLabel,
  requireAuthEmail,
  type AuthFailure,
  type AuthFailureKind,
  type ForthAuthProvider,
} from "@/lib/firebase/auth";

export type CloudSession = { user: User | null; loading: boolean };

export type CloudWorkspaceSnapshot = {
  state: WorkspaceState;
  revision: number;
};

const NORMALIZED_STORAGE_VERSION = 1;
const MAX_TRANSACTION_WRITES = 450;

export class WorkspaceConflictError extends Error {
  readonly code = "workspace/conflict";

  constructor(readonly expectedRevision: number, readonly actualRevision: number) {
    super("Another teammate saved this workspace first. Forth stopped your stale save instead of overwriting their work.");
    this.name = "WorkspaceConflictError";
  }
}

export function isWorkspaceConflictError(error: unknown): error is WorkspaceConflictError {
  return error instanceof WorkspaceConflictError
    || (error instanceof Error && "code" in error && error.code === "workspace/conflict");
}

export type GuildWorkspace = {
  id: string;
  name: string;
  ownerId: string;
  role: "owner" | "member";
};

export type PendingGuildInvite = {
  workspaceId: string;
  workspaceName: string;
  invitedBy: string;
  email: string;
  expiresAtMs: number | null;
  expired: boolean;
};

export type GuildInviteSummary = {
  email: string;
  invitedBy: string;
  createdAtMs: number | null;
  expiresAtMs: number | null;
  expired: boolean;
};

// How long an invitation stays acceptable. The stored expiry is enforced at
// accept time against the server clock (Firestore rules use request.time), so a
// client cannot extend its own window; this constant only sets the initial span.
export const INVITE_TTL_DAYS = 14;

function readTimestampMs(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

// Client-side expiry check for display and pre-flight messaging only. The
// authoritative check lives in firestore.rules (request.time vs expiresAt).
function isExpired(expiresAtMs: number | null): boolean {
  return expiresAtMs !== null && expiresAtMs <= Date.now();
}

function requireServices() {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  return services;
}

// A brand-new account cannot read a workspace document that does not exist yet
// under the owner-scoped rules, so a pre-create existence check can be denied.
// Treat any failed/denied read as "not created yet" and let the create attempt
// (which is governed by the create rule) decide. This keeps first-run
// provisioning working without loosening authorization.
async function documentExists(reference: Parameters<typeof getDoc>[0]) {
  try {
    return (await getDoc(reference)).exists();
  } catch {
    return false;
  }
}

export function watchAuth(callback: (session: CloudSession) => void): Unsubscribe | null {
  const services = getFirebaseServices();
  if (!services) return null;
  callback({ user: null, loading: true });
  return onAuthStateChanged(services.auth, (user: User | null) => callback({ user, loading: false }));
}

export async function signInWithProvider(provider: ForthAuthProvider) {
  return signInWithPopup(requireServices().auth, createForthAuthProvider(provider));
}

export async function signInWithRedirectProvider(provider: ForthAuthProvider) {
  return signInWithRedirect(requireServices().auth, createForthAuthProvider(provider));
}

export async function signOutOfForth() {
  const services = getFirebaseServices();
  if (services) await signOut(services.auth);
}

async function createWorkspaceAt(
  user: User,
  workspaceId: string,
  name: string,
  initialState: WorkspaceState,
) {
  const services = requireServices();
  // Validate all identity data before the first write. In particular, GitHub
  // accounts can hide their email; failing early prevents a partial workspace
  // root from being left behind without its owner membership document.
  const email = requireAuthEmail(user);
  const workspaceRef = doc(services.db, "workspaces", workspaceId);
  const memberRef = doc(workspaceRef, "members", user.uid);
  const stateRef = doc(workspaceRef, "data", "current");
  const projectRefs = initialState.projects.map((project) => doc(workspaceRef, "projects", project.id));
  const taskRefs = initialState.tasks.map((task) => doc(workspaceRef, "tasks", task.id));

  // Firestore rules cannot safely authorize a brand-new root and its child
  // documents in one client batch without weakening existing-guild access.
  // Write the discoverable owner membership last: if an earlier write fails,
  // the incomplete random guild cannot appear in the user's directory. A
  // best-effort cleanup removes any unreachable partial documents.
  try {
    await setDoc(workspaceRef, {
      ownerId: user.uid,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const initialData = writeBatch(services.db);
    initialData.set(stateRef, normalizedWorkspaceMetadata(initialState, 0));
    initialState.projects.forEach((project, index) => {
      initialData.set(projectRefs[index], serializeProject(project, 0, index));
    });
    initialState.tasks.forEach((task, index) => {
      initialData.set(taskRefs[index], serializeTask(task, 0));
    });
    await initialData.commit();
    await setDoc(memberRef, {
      uid: user.uid,
      email,
      displayName: user.displayName ?? "Guild leader",
      role: "owner",
      joinedAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteDoc(memberRef).catch(() => undefined);
    await Promise.all(taskRefs.map((reference) => deleteDoc(reference).catch(() => undefined)));
    await Promise.all(projectRefs.map((reference) => deleteDoc(reference).catch(() => undefined)));
    await deleteDoc(stateRef).catch(() => undefined);
    await deleteDoc(workspaceRef).catch(() => undefined);
    throw error;
  }
  return workspaceId;
}

// TICKET-031 (simplified): id of the one publicly-shared cohort guild that any
// signed-in account may self-join with no invite and no eligibility check.
// Not a secret -- it is the same "guild code" already shown to any guild
// owner. Defaults to the maintainer's Cursor Boston guild; overridable via
// NEXT_PUBLIC_COHORT_GUILD_ID without a code change. Must match the literal
// id baked into isOpenCohortGuild() in firestore.rules.
const DEFAULT_COHORT_GUILD_ID = "guild-7ea24403-64f6-424c-b2d7-0d7e44209492";
export const COHORT_GUILD_ID = (process.env.NEXT_PUBLIC_COHORT_GUILD_ID ?? "").trim() || DEFAULT_COHORT_GUILD_ID;

export async function joinOpenCohortGuild(user: User) {
  if (!COHORT_GUILD_ID) throw new Error("The shared cohort guild is not configured yet.");
  const services = requireServices();
  const email = requireAuthEmail(user);
  await setDoc(doc(services.db, "workspaces", COHORT_GUILD_ID, "members", user.uid), {
    uid: user.uid,
    email,
    displayName: user.displayName ?? email,
    role: "member",
    joinedAt: serverTimestamp(),
  }, { merge: true });
  return COHORT_GUILD_ID;
}

export async function createGuildWorkspace(user: User, name: string, initialState: WorkspaceState) {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("This browser cannot safely create a guild identifier. Update the browser and try again.");
  }
  const id = `guild-${crypto.randomUUID()}`;
  return createWorkspaceAt(user, id, name.trim(), initialState);
}

export async function listGuildWorkspaces(user: User): Promise<GuildWorkspace[]> {
  const services = requireServices();
  // The owner workspace has a deterministic id (the owner's uid). Keep it in
  // the directory even if a collection-group query is temporarily unavailable
  // (for example while indexes/rules propagate). This also keeps the owner
  // path usable so the invitation controls do not disappear.
  const ownerWorkspace = await getDoc(doc(services.db, "workspaces", user.uid));
  const ownerData = ownerWorkspace.exists() ? ownerWorkspace.data() : null;
  const ownerGuild: GuildWorkspace[] = ownerData?.ownerId === user.uid
    ? [{
        id: ownerWorkspace.id,
        name: typeof ownerData.name === "string" ? ownerData.name : "My guild",
        ownerId: user.uid,
        role: "owner",
      }]
    : [];

  let memberSnapshots;
  try {
    memberSnapshots = await getDocs(query(collectionGroup(services.db, "members"), where("uid", "==", user.uid)));
  } catch {
    if (ownerGuild.length > 0) return ownerGuild;
    throw new Error("Forth could not check your shared-workspace memberships. Try again before creating a new workspace.");
  }
  const workspaces = await Promise.all(memberSnapshots.docs.map(async (member) => {
    const workspaceRef = member.ref.parent.parent;
    if (!workspaceRef) return null;
    const workspace = await getDoc(workspaceRef);
    if (!workspace.exists()) return null;
    const data = workspace.data();
    return {
      id: workspace.id,
      name: typeof data.name === "string" ? data.name : "Untitled guild",
      ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
      role: member.data().role === "owner" ? "owner" : "member",
    } satisfies GuildWorkspace;
  }));
  return [...ownerGuild, ...workspaces.filter((workspace): workspace is GuildWorkspace => workspace !== null)]
    .filter((workspace, index, all) => all.findIndex((candidate) => candidate.id === workspace.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function inviteGuildMember(user: User, workspace: GuildWorkspace, emailInput: string) {
  const services = requireServices();
  if (workspace.ownerId !== user.uid) throw new Error("Only a guild owner can send invitations.");
  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid teammate email address.");
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await setDoc(doc(services.db, "workspaces", workspace.id, "invites", email), {
    email,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    invitedBy: user.displayName ?? user.email ?? "Guild leader",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt,
  });
}

export async function listGuildInvites(user: User, workspace: GuildWorkspace): Promise<GuildInviteSummary[]> {
  const services = requireServices();
  if (workspace.ownerId !== user.uid) throw new Error("Only a guild owner can view invitations.");
  const snapshots = await getDocs(collection(services.db, "workspaces", workspace.id, "invites"));
  return snapshots.docs
    .map((invite) => {
      const data = invite.data();
      const expiresAtMs = readTimestampMs(data.expiresAt);
      return {
        email: typeof data.email === "string" ? data.email : invite.id,
        invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : "A guild leader",
        createdAtMs: readTimestampMs(data.createdAt),
        expiresAtMs,
        expired: isExpired(expiresAtMs),
      } satisfies GuildInviteSummary;
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function cancelGuildInvite(user: User, workspace: GuildWorkspace, email: string) {
  const services = requireServices();
  if (workspace.ownerId !== user.uid) throw new Error("Only a guild owner can cancel invitations.");
  // deleteDoc is idempotent: cancelling an already-removed invite is a no-op.
  await deleteDoc(doc(services.db, "workspaces", workspace.id, "invites", email.trim().toLowerCase()));
}

export async function listPendingGuildInvites(user: User): Promise<PendingGuildInvite[]> {
  const services = requireServices();
  const email = requireAuthEmail(user);
  const snapshots = await getDocs(query(collectionGroup(services.db, "invites"), where("email", "==", email)));
  return snapshots.docs
    .map((invite) => {
      const data = invite.data();
      const workspaceId = invite.ref.parent.parent?.id
        ?? (typeof data.workspaceId === "string" ? data.workspaceId : "");
      if (!workspaceId) return null;
      const expiresAtMs = readTimestampMs(data.expiresAt);
      return {
        workspaceId,
        workspaceName: typeof data.workspaceName === "string" ? data.workspaceName : "A guild",
        invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : "A guild leader",
        email,
        expiresAtMs,
        expired: isExpired(expiresAtMs),
      } satisfies PendingGuildInvite;
    })
    .filter((invite): invite is PendingGuildInvite => invite !== null)
    .sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
}

export async function declineGuildInvite(user: User, workspaceId: string) {
  const services = requireServices();
  const email = requireAuthEmail(user);
  await deleteDoc(doc(services.db, "workspaces", workspaceId.trim(), "invites", email));
}

export async function acceptGuildInvite(user: User, workspaceId: string) {
  const services = requireServices();
  const email = requireAuthEmail(user);
  const id = workspaceId.trim();
  const inviteRef = doc(services.db, "workspaces", id, "invites", email);
  const memberRef = doc(services.db, "workspaces", id, "members", user.uid);
  const invite = await getDoc(inviteRef);
  if (!invite.exists()) {
    // Idempotency: if the invite is already gone but this account is already a
    // member, treat the repeat as success instead of a scary "not found" error.
    if (await documentExists(memberRef)) {
      return { workspaceId: id, workspaceName: "the guild", alreadyMember: true };
    }
    throw new Error("No invitation for this account email was found in that guild.");
  }
  const inviteData = invite.data();
  if (isExpired(readTimestampMs(inviteData.expiresAt))) {
    throw new Error("This invitation has expired. Ask the guild owner to send a new one.");
  }

  // Repair an old partially accepted invite without overwriting the existing
  // membership. A repeated call after the new atomic flow follows the missing-
  // invite branch above and is also treated as success.
  if (await documentExists(memberRef)) {
    await deleteDoc(inviteRef);
    return {
      workspaceId: id,
      workspaceName: typeof inviteData.workspaceName === "string" ? inviteData.workspaceName : "the guild",
      alreadyMember: true,
    };
  }

  // Membership creation and invite consumption are one transaction boundary:
  // both writes commit or neither does. The security rules also reject a
  // standalone membership create while the invite would remain present.
  const batch = writeBatch(services.db);
  batch.set(memberRef, {
    uid: user.uid,
    email,
    displayName: user.displayName ?? email,
    role: "member",
    joinedAt: serverTimestamp(),
  });
  batch.delete(inviteRef);
  await batch.commit();
  return {
    workspaceId: id,
    workspaceName: typeof inviteData.workspaceName === "string" ? inviteData.workspaceName : "the guild",
    alreadyMember: false,
  };
}

function isNormalizedMetadata(data: Record<string, unknown>): boolean {
  return data.storageVersion === NORMALIZED_STORAGE_VERSION
    && Number.isInteger(data.revision)
    && typeof data.pace === "string";
}

function normalizedWorkspaceMetadata(state: WorkspaceState, revision: number) {
  return {
    storageVersion: NORMALIZED_STORAGE_VERSION,
    schemaVersion: state.version,
    revision,
    pace: state.pace,
    updatedAt: serverTimestamp(),
  };
}

function serializeProject(project: Project, revision: number, position: number) {
  return { ...project, position, revision };
}

function serializeTask(task: Task, revision: number) {
  return {
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    status: task.status,
    weight: task.weight,
    meaning: task.meaning,
    assignee: task.assignee,
    isFocus: task.isFocus,
    createdAt: task.createdAt,
    ...(task.completedAt === undefined ? {} : { completedAt: task.completedAt }),
    ...(task.description === undefined ? {} : { description: task.description }),
    ...(task.priority === undefined ? {} : { priority: task.priority }),
    ...(task.dueDate === undefined ? {} : { dueDate: task.dueDate }),
    revision,
  };
}

function withoutRevision(data: Record<string, unknown>) {
  const value = { ...data };
  delete value.revision;
  delete value.position;
  return value;
}

export async function loadWorkspaceStateFromDatabase(
  database: Firestore,
  workspaceId: string,
): Promise<CloudWorkspaceSnapshot | null> {
  const workspaceRef = doc(database, "workspaces", workspaceId);
  const metadataRef = doc(workspaceRef, "data", "current");

  // A normalized workspace spans several collections. Bracket the collection
  // reads with the small revision document so the client never assembles a
  // mixture from two commits. Entity writes cannot happen without advancing
  // this revision under the security rules.
  //
  // A revision that keeps advancing between the two metadata reads means a
  // save is actively landing concurrently -- not a real error. Back off
  // briefly between attempts so the in-flight write has time to settle
  // instead of racing it with zero delay and giving up too eagerly.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 120 * attempt));
    const metadata = await getDoc(metadataRef);
    if (!metadata.exists()) return null;
    const data = metadata.data();

    // Legacy whole-document snapshots remain readable and migrate during their
    // first successful write. No sample fallback is introduced at this boundary.
    if (!isNormalizedMetadata(data)) {
      const state = parseStoredWorkspace(JSON.stringify(data.state ?? null));
      return state ? { state, revision: 0 } : null;
    }

    const [projects, tasks] = await Promise.all([
      getDocs(collection(workspaceRef, "projects")),
      getDocs(collection(workspaceRef, "tasks")),
    ]);
    const confirmedMetadata = await getDoc(metadataRef);
    if (!confirmedMetadata.exists()) return null;
    const confirmedData = confirmedMetadata.data();
    if (!isNormalizedMetadata(confirmedData) || confirmedData.revision !== data.revision) continue;

    const state = parseStoredWorkspace(JSON.stringify({
      version: confirmedData.schemaVersion ?? 2,
      pace: confirmedData.pace,
      projects: projects.docs
        .map((snapshot) => snapshot.data())
        .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
        .map(withoutRevision),
      tasks: tasks.docs
        .map((snapshot) => snapshot.data())
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(a.id).localeCompare(String(b.id)))
        .map(withoutRevision),
    }));
    if (!state) return null;
    return { state, revision: confirmedData.revision as number };
  }

  throw new Error("The cloud workspace changed repeatedly while Forth was loading it. Try again.");
}

export async function loadWorkspaceState(workspaceId: string): Promise<CloudWorkspaceSnapshot | null> {
  return loadWorkspaceStateFromDatabase(requireServices().db, workspaceId);
}

export function watchWorkspace(
  workspaceId: string,
  onState: (snapshot: CloudWorkspaceSnapshot) => void,
  onError: (error: Error) => void,
): Unsubscribe | null {
  const services = getFirebaseServices();
  if (!services) return null;
  let readSequence = 0;
  let disposed = false;
  const unsubscribe = onSnapshot(doc(services.db, "workspaces", workspaceId, "data", "current"), () => {
    const currentRead = ++readSequence;
    void loadWorkspaceStateFromDatabase(services.db, workspaceId).then((snapshot) => {
      if (disposed || currentRead !== readSequence) return;
      if (snapshot) onState(snapshot);
      else onError(new Error("The cloud workspace contains missing or invalid ticket data."));
    }).catch((error: unknown) => {
      if (disposed || currentRead !== readSequence) return;
      onError(error instanceof Error ? error : new Error("The cloud workspace could not be read."));
    });
  }, (error) => onError(new Error(error.message)));
  return () => {
    disposed = true;
    unsubscribe();
  };
}

function changedRecords<T extends { id: string }>(before: T[], after: T[]) {
  const previous = new Map(before.map((record) => [record.id, record]));
  const next = new Map(after.map((record) => [record.id, record]));
  return {
    upserts: after.filter((record) => JSON.stringify(previous.get(record.id)) !== JSON.stringify(record)),
    deletes: before.filter((record) => !next.has(record.id)),
  };
}

export async function saveWorkspaceToDatabase(
  database: Firestore,
  workspaceId: string,
  expectedRevision: number,
  baseState: WorkspaceState,
  nextState: WorkspaceState,
): Promise<CloudWorkspaceSnapshot> {
  const workspaceRef = doc(database, "workspaces", workspaceId);
  const metadataRef = doc(workspaceRef, "data", "current");
  const projectChanges = changedRecords(baseState.projects, nextState.projects);
  const taskChanges = changedRecords(baseState.tasks, nextState.tasks);

  let revision: number;
  try {
    revision = await runTransaction(database, async (transaction) => {
      const current = await transaction.get(metadataRef);
      if (!current.exists()) throw new Error("The cloud workspace metadata is missing.");
      const currentData = current.data();
      const isLegacySnapshot = !isNormalizedMetadata(currentData);
      const actualRevision = isLegacySnapshot ? 0 : currentData.revision as number;
      if (actualRevision !== expectedRevision) {
        throw new WorkspaceConflictError(expectedRevision, actualRevision);
      }

      const nextRevision = actualRevision + 1;
      const projectsToUpsert = isLegacySnapshot ? nextState.projects : projectChanges.upserts;
      const tasksToUpsert = isLegacySnapshot ? nextState.tasks : taskChanges.upserts;
      const projectsToDelete = isLegacySnapshot ? [] : projectChanges.deletes;
      const tasksToDelete = isLegacySnapshot ? [] : taskChanges.deletes;
      const touchedRecords = projectsToUpsert.length + projectsToDelete.length
        + tasksToUpsert.length + tasksToDelete.length + 1 + (isLegacySnapshot ? 1 : 0);
      if (touchedRecords > MAX_TRANSACTION_WRITES) {
        throw new Error(isLegacySnapshot
          ? "This legacy workspace is too large for automatic migration. No data changed; contact the Forth maintainer."
          : "This change is too large for one safe cloud save. Split it into smaller edits and try again.");
      }

      transaction.set(metadataRef, normalizedWorkspaceMetadata(nextState, nextRevision));
      if (isLegacySnapshot) {
        // Keep one immutable pre-migration recovery point. It does not grow with
        // future Proof history and gives a maintainer a deterministic rollback
        // source if the normalized rollout must be reversed.
        transaction.set(doc(workspaceRef, "recovery", "legacy-v2"), {
          state: baseState,
          sourceStorageVersion: "whole-state-v2",
          migratedAt: serverTimestamp(),
        });
      }
      projectsToUpsert.forEach((project) => {
        transaction.set(
          doc(workspaceRef, "projects", project.id),
          serializeProject(project, nextRevision, nextState.projects.findIndex((candidate) => candidate.id === project.id)),
        );
      });
      projectsToDelete.forEach((project) => {
        transaction.delete(doc(workspaceRef, "projects", project.id));
      });
      tasksToUpsert.forEach((task) => {
        transaction.set(doc(workspaceRef, "tasks", task.id), serializeTask(task, nextRevision));
      });
      tasksToDelete.forEach((task) => {
        transaction.delete(doc(workspaceRef, "tasks", task.id));
      });
      return nextRevision;
    });
  } catch (error) {
    // A simultaneous transaction may be rejected by Security Rules before the
    // SDK retries it. Re-read the tiny metadata document: if its revision moved,
    // this is the same recoverable stale-write conflict, not a generic outage.
    try {
      const latest = await getDoc(metadataRef);
      if (latest.exists()) {
        const latestData = latest.data();
        const actualRevision = isNormalizedMetadata(latestData) ? latestData.revision as number : 0;
        if (actualRevision !== expectedRevision) {
          throw new WorkspaceConflictError(expectedRevision, actualRevision);
        }
      }
    } catch (classificationError) {
      if (classificationError instanceof WorkspaceConflictError) throw classificationError;
    }
    throw error;
  }

  return { state: nextState, revision };
}

export async function saveWorkspace(
  workspaceId: string,
  expectedRevision: number,
  baseState: WorkspaceState,
  nextState: WorkspaceState,
) {
  return saveWorkspaceToDatabase(requireServices().db, workspaceId, expectedRevision, baseState, nextState);
}
