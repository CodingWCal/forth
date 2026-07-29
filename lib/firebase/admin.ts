import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function requireAdminConfig() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Forth server integration is not configured.");
  }
  return { projectId, clientEmail, privateKey };
}

export function getAdminServices() {
  const app = getApps()[0] ?? initializeApp({ credential: cert(requireAdminConfig()) });
  return { auth: getAuth(app), db: getFirestore(app) };
}
