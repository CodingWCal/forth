import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { WorkspaceState } from "@/lib/types";
import { getFirebaseServices } from "@/lib/firebase/config";
import { parseStoredWorkspace } from "@/lib/workspace";

export type CloudSession = {
  user: User | null;
  loading: boolean;
};

export function watchAuth(callback: (session: CloudSession) => void): Unsubscribe | null {
  const services = getFirebaseServices();
  if (!services) return null;
  callback({ user: null, loading: true });
  return onAuthStateChanged(services.auth, (user) => callback({ user, loading: false }));
}

export async function signInWithGoogle() {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  return signInWithPopup(services.auth, new GoogleAuthProvider());
}

export async function signOutOfForth() {
  const services = getFirebaseServices();
  if (!services) return;
  await signOut(services.auth);
}

export async function provisionWorkspace(user: User, initialState: WorkspaceState) {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  const workspaceRef = doc(services.db, "workspaces", user.uid);
  const stateRef = doc(workspaceRef, "data", "current");
  await setDoc(workspaceRef, {
    ownerId: user.uid,
    name: `${user.displayName ?? "My"}'s guild`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await setDoc(doc(workspaceRef, "members", user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: "owner",
    joinedAt: serverTimestamp(),
  }, { merge: true });
  const existingState = await getDoc(stateRef);
  if (!existingState.exists()) {
    await setDoc(stateRef, { state: initialState, updatedAt: serverTimestamp() });
  }
}

export function watchWorkspace(
  user: User,
  onState: (state: WorkspaceState) => void,
  onError: (error: Error) => void,
): Unsubscribe | null {
  const services = getFirebaseServices();
  if (!services) return null;
  const stateRef = doc(services.db, "workspaces", user.uid, "data", "current");
  return onSnapshot(stateRef, (snapshot) => {
    const state = parseStoredWorkspace(JSON.stringify(snapshot.data()?.state ?? null));
    if (state) onState(state);
  }, onError);
}

export async function saveWorkspace(user: User, state: WorkspaceState) {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  const workspaceRef = doc(services.db, "workspaces", user.uid);
  await setDoc(doc(workspaceRef, "data", "current"), {
    state,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
