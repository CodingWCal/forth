import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
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
};

function requireServices() {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  return services;
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
  const existingWorkspace = await getDoc(workspaceRef);
  if (!existingWorkspace.exists()) {
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
  const existingState = await getDoc(stateRef);
  if (!existingState.exists()) {
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
  await setDoc(doc(services.db, "workspaces", workspace.id, "invites", email), {
    email,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    invitedBy: user.displayName ?? user.email ?? "Guild leader",
    createdAt: serverTimestamp(),
  });
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
      return {
        workspaceId,
        workspaceName: typeof data.workspaceName === "string" ? data.workspaceName : "A guild",
        invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : "A guild leader",
        email,
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
  const inviteRef = doc(services.db, "workspaces", workspaceId.trim(), "invites", email);
  const invite = await getDoc(inviteRef);
  if (!invite.exists()) throw new Error("No invitation for this Google email was found in that guild.");
  const inviteData = invite.data();
  await setDoc(doc(services.db, "workspaces", workspaceId.trim(), "members", user.uid), {
    uid: user.uid,
    email,
    displayName: user.displayName ?? email,
    role: "member",
    joinedAt: serverTimestamp(),
  });
  await deleteDoc(inviteRef);
  return {
    workspaceId: workspaceId.trim(),
    workspaceName: typeof inviteData.workspaceName === "string" ? inviteData.workspaceName : "the guild",
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
