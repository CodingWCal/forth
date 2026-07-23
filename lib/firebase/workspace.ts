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
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { WorkspaceState } from "@/lib/types";
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
  return onAuthStateChanged(services.auth, (user) => callback({ user, loading: false }));
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
    await setDoc(stateRef, { state: initialState, updatedAt: serverTimestamp() });
    await setDoc(memberRef, {
      uid: user.uid,
      email,
      displayName: user.displayName ?? "Guild leader",
      role: "owner",
      joinedAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteDoc(memberRef).catch(() => undefined);
    await deleteDoc(stateRef).catch(() => undefined);
    await deleteDoc(workspaceRef).catch(() => undefined);
    throw error;
  }
  return workspaceId;
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

export async function loadWorkspaceState(workspaceId: string): Promise<WorkspaceState | null> {
  const services = requireServices();
  const snapshot = await getDoc(doc(services.db, "workspaces", workspaceId, "data", "current"));
  if (!snapshot.exists()) return null;

  // Firestore data is an untrusted persistence boundary. Reuse the same
  // runtime parser as local storage and leave missing/invalid state explicit;
  // the caller decides whether to show onboarding, an error, or a demo.
  return parseStoredWorkspace(JSON.stringify(snapshot.data().state ?? null));
}

export type WorkspaceSnapshot = {
  state: WorkspaceState;
  revision: number;
};

export class WorkspaceConflictError extends Error {
  constructor() {
    super("This guild changed in another session. Reload before saving again.");
    this.name = "WorkspaceConflictError";
  }
}

export function watchWorkspace(
  workspaceId: string,
  onState: (snapshot: WorkspaceSnapshot) => void,
  onError: (error: Error) => void,
): Unsubscribe | null {
  const services = getFirebaseServices();
  if (!services) return null;
  return onSnapshot(doc(services.db, "workspaces", workspaceId, "data", "current"), (snapshot) => {
    const data = snapshot.data();
    const state = parseStoredWorkspace(JSON.stringify(data?.state ?? null));
    if (state) {
      const revision = typeof data?.revision === "number" && Number.isInteger(data.revision)
        ? data.revision
        : 0;
      onState({ state, revision });
    }
    else onError(new Error("The cloud workspace contains missing or invalid ticket data."));
  }, onError);
}

export async function saveWorkspace(
  workspaceId: string,
  state: WorkspaceState,
  expectedRevision: number,
): Promise<number> {
  const services = requireServices();
  const workspaceRef = doc(services.db, "workspaces", workspaceId, "data", "current");

  return runTransaction(services.db, async (transaction) => {
    const snapshot = await transaction.get(workspaceRef);
    const data = snapshot.data();
    const currentRevision = typeof data?.revision === "number" && Number.isInteger(data.revision)
      ? data.revision
      : 0;

    if (currentRevision !== expectedRevision) {
      throw new WorkspaceConflictError();
    }

    const nextRevision = currentRevision + 1;
    transaction.set(workspaceRef, {
      state,
      revision: nextRevision,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return nextRevision;
  });
}
