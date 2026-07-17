import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
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
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { WorkspaceState } from "@/lib/types";
import { getFirebaseServices } from "@/lib/firebase/config";
import { parseStoredWorkspace } from "@/lib/workspace";

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

function normalizedEmail(user: User) {
  const email = user.email?.trim().toLowerCase();
  if (!email) throw new Error("Your Google account needs a verified email address to join a guild.");
  return email;
}

export function watchAuth(callback: (session: CloudSession) => void): Unsubscribe | null {
  const services = getFirebaseServices();
  if (!services) return null;
  callback({ user: null, loading: true });
  return onAuthStateChanged(services.auth, (user) => callback({ user, loading: false }));
}

export async function signInWithGoogle() {
  return signInWithPopup(requireServices().auth, new GoogleAuthProvider());
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
  const workspaceRef = doc(services.db, "workspaces", workspaceId);
  const stateRef = doc(workspaceRef, "data", "current");
  if (!(await documentExists(workspaceRef))) {
    await setDoc(workspaceRef, {
      ownerId: user.uid,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await setDoc(doc(workspaceRef, "members", user.uid), {
    uid: user.uid,
    email: normalizedEmail(user),
    displayName: user.displayName ?? "Guild leader",
    role: "owner",
    joinedAt: serverTimestamp(),
  }, { merge: true });
  if (!(await documentExists(stateRef))) {
    await setDoc(stateRef, { state: initialState, updatedAt: serverTimestamp() });
  }
  return workspaceId;
}

export async function provisionWorkspace(user: User, initialState: WorkspaceState) {
  return createWorkspaceAt(user, user.uid, `${user.displayName ?? "My"}'s guild`, initialState);
}

export async function createGuildWorkspace(user: User, name: string, initialState: WorkspaceState) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `guild-${crypto.randomUUID()}`
    : `guild-${Date.now()}`;
  return createWorkspaceAt(user, id, name.trim(), initialState);
}

export async function listGuildWorkspaces(user: User): Promise<GuildWorkspace[]> {
  const services = requireServices();
  // The owner workspace has a deterministic id (the owner's uid). Keep it in
  // the directory even if a collection-group query is temporarily unavailable
  // (for example while indexes/rules propagate). This also keeps the owner
  // path usable so the invitation controls do not disappear.
  const ownerWorkspace = await getDoc(doc(services.db, "workspaces", user.uid));
  const ownerGuild: GuildWorkspace[] = ownerWorkspace.exists()
    ? [{
        id: ownerWorkspace.id,
        name: typeof ownerWorkspace.data().name === "string" ? ownerWorkspace.data().name : "My guild",
        ownerId: user.uid,
        role: "owner",
      }]
    : [];

  let memberSnapshots;
  try {
    memberSnapshots = await getDocs(query(collectionGroup(services.db, "members"), where("uid", "==", user.uid)));
  } catch {
    return ownerGuild;
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
  const email = normalizedEmail(user);
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
  const email = normalizedEmail(user);
  await deleteDoc(doc(services.db, "workspaces", workspaceId.trim(), "invites", email));
}

export async function acceptGuildInvite(user: User, workspaceId: string) {
  const services = requireServices();
  const email = normalizedEmail(user);
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
    throw new Error("No invitation for this Google email was found in that guild.");
  }
  const inviteData = invite.data();
  if (isExpired(readTimestampMs(inviteData.expiresAt))) {
    throw new Error("This invitation has expired. Ask the guild owner to send a new one.");
  }
  await setDoc(memberRef, {
    uid: user.uid,
    email,
    displayName: user.displayName ?? email,
    role: "member",
    joinedAt: serverTimestamp(),
  });
  await deleteDoc(inviteRef);
  return {
    workspaceId: id,
    workspaceName: typeof inviteData.workspaceName === "string" ? inviteData.workspaceName : "the guild",
    alreadyMember: false,
  };
}

export function watchWorkspace(
  workspaceId: string,
  onState: (state: WorkspaceState) => void,
  onError: (error: Error) => void,
): Unsubscribe | null {
  const services = getFirebaseServices();
  if (!services) return null;
  return onSnapshot(doc(services.db, "workspaces", workspaceId, "data", "current"), (snapshot) => {
    const state = parseStoredWorkspace(JSON.stringify(snapshot.data()?.state ?? null));
    if (state) onState(state);
  }, onError);
}

export async function saveWorkspace(workspaceId: string, state: WorkspaceState) {
  const services = requireServices();
  await setDoc(doc(services.db, "workspaces", workspaceId, "data", "current"), {
    state,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
