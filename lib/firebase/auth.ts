import { GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";

export const AUTH_PROVIDER_OPTIONS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
] as const;

export type ForthAuthProvider = (typeof AUTH_PROVIDER_OPTIONS)[number]["id"];

export type AuthFailureKind =
  | "popup-cancelled"
  | "popup-blocked"
  | "unauthorized-domain"
  | "network"
  | "provider-collision"
  | "provider-disabled"
  | "unknown";

export type AuthFailure = {
  kind: AuthFailureKind;
  code: string;
  message: string;
  retryable: boolean;
};

const UNKNOWN_AUTH_CODE = "auth/unknown";

const PROVIDER_LABELS: Record<ForthAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

const PROVIDER_COLLISION_CODES = new Set([
  "auth/account-exists-with-different-credential",
  "auth/credential-already-in-use",
  "auth/email-already-in-use",
  "auth/provider-already-linked",
]);

function readAuthErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return UNKNOWN_AUTH_CODE;
  const code = String(error.code).trim();
  return code.startsWith("auth/") ? code : UNKNOWN_AUTH_CODE;
}

export function getAuthProviderLabel(provider: ForthAuthProvider): string {
  return PROVIDER_LABELS[provider];
}

export function requireAuthEmail(identity: { email?: string | null }): string {
  const email = identity.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Your signed-in account needs a valid email address to use shared guilds.");
  }
  return email;
}

export function createForthAuthProvider(provider: ForthAuthProvider) {
  if (provider === "google") return new GoogleAuthProvider();

  const githubProvider = new GithubAuthProvider();
  // Private GitHub email addresses are common. Request the email scope so
  // Firebase can resolve an address for invitation matching when GitHub makes
  // one available to the authenticated account.
  githubProvider.addScope("user:email");
  return githubProvider;
}

export function classifyAuthFailure(
  error: unknown,
  provider: ForthAuthProvider,
): AuthFailure {
  const code = readAuthErrorCode(error);
  const providerLabel = getAuthProviderLabel(provider);

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return {
      kind: "popup-cancelled",
      code,
      message: `${providerLabel} sign-in was cancelled. Try again when you are ready.`,
      retryable: true,
    };
  }

  if (code === "auth/popup-blocked") {
    return {
      kind: "popup-blocked",
      code,
      message: `Your browser blocked the ${providerLabel} sign-in window. Allow pop-ups for Forth, then try again.`,
      retryable: true,
    };
  }

  if (code === "auth/unauthorized-domain") {
    return {
      kind: "unauthorized-domain",
      code,
      message: "This Forth web address is not authorized for sign-in. Ask a Forth administrator to add the domain in Firebase Authentication, then retry.",
      retryable: false,
    };
  }

  if (code === "auth/network-request-failed") {
    return {
      kind: "network",
      code,
      message: `${providerLabel} sign-in could not reach Firebase. Check your internet connection, then try again.`,
      retryable: true,
    };
  }

  if (PROVIDER_COLLISION_CODES.has(code)) {
    return {
      kind: "provider-collision",
      code,
      message: "This sign-in method does not match the one previously used. Continue with your original method or contact the Forth maintainer.",
      retryable: false,
    };
  }

  if (code === "auth/operation-not-allowed") {
    return {
      kind: "provider-disabled",
      code,
      message: `${providerLabel} sign-in is not enabled for this Forth environment. Ask a Forth administrator to enable it in Firebase Authentication.`,
      retryable: false,
    };
  }

  return {
    kind: "unknown",
    code,
    message: `${providerLabel} sign-in could not finish. Try again. Error code: ${code}.`,
    retryable: true,
  };
}

export function getAuthFailureMessage(
  error: unknown,
  provider: ForthAuthProvider,
): string {
  return classifyAuthFailure(error, provider).message;
}
