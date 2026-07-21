import { describe, expect, it } from "vitest";
import {
  AUTH_PROVIDER_OPTIONS,
  classifyAuthFailure,
  createForthAuthProvider,
  getAuthFailureMessage,
  getAuthProviderLabel,
  requireAuthEmail,
} from "../lib/firebase/auth";

describe("Firebase authentication helpers", () => {
  it("exposes literal Google and GitHub provider options", () => {
    expect(AUTH_PROVIDER_OPTIONS).toEqual([
      { id: "google", label: "Google" },
      { id: "github", label: "GitHub" },
    ]);
    expect(getAuthProviderLabel("google")).toBe("Google");
    expect(getAuthProviderLabel("github")).toBe("GitHub");
  });

  it("creates the matching Firebase provider and requests GitHub email access", () => {
    const google = createForthAuthProvider("google");
    const github = createForthAuthProvider("github");

    expect(google.providerId).toBe("google.com");
    expect(github.providerId).toBe("github.com");
    expect(github.getScopes()).toContain("user:email");
  });

  it("normalizes a usable identity email and rejects missing or malformed values", () => {
    expect(requireAuthEmail({ email: "  Guildmate@Example.COM " }))
      .toBe("guildmate@example.com");
    expect(() => requireAuthEmail({ email: null })).toThrow("valid email address");
    expect(() => requireAuthEmail({ email: "not-an-email" })).toThrow("valid email address");
  });

  it.each([
    ["auth/popup-closed-by-user", "popup-cancelled", true],
    ["auth/cancelled-popup-request", "popup-cancelled", true],
    ["auth/popup-blocked", "popup-blocked", true],
    ["auth/unauthorized-domain", "unauthorized-domain", false],
    ["auth/network-request-failed", "network", true],
    ["auth/account-exists-with-different-credential", "provider-collision", false],
    ["auth/credential-already-in-use", "provider-collision", false],
    ["auth/email-already-in-use", "provider-collision", false],
    ["auth/provider-already-linked", "provider-collision", false],
    ["auth/operation-not-allowed", "provider-disabled", false],
  ] as const)("classifies %s as %s", (code, kind, retryable) => {
    const failure = classifyAuthFailure({ code }, "github");

    expect(failure).toMatchObject({ code, kind, retryable });
  });

  it("keeps provider-specific recovery copy actionable", () => {
    expect(getAuthFailureMessage({ code: "auth/popup-blocked" }, "github"))
      .toContain("GitHub sign-in window");
    expect(getAuthFailureMessage({ code: "auth/network-request-failed" }, "google"))
      .toContain("Check your internet connection");
    expect(getAuthFailureMessage({ code: "auth/unauthorized-domain" }, "google"))
      .toContain("Firebase Authentication");
    expect(getAuthFailureMessage({ code: "auth/account-exists-with-different-credential" }, "github"))
      .toContain("does not match the one previously used");
    expect(getAuthFailureMessage({ code: "auth/account-exists-with-different-credential" }, "github"))
      .not.toMatch(/account already|email already|exists/i);
  });

  it("sanitizes malformed and non-Firebase errors", () => {
    expect(classifyAuthFailure(new Error("secret internal detail"), "google"))
      .toEqual({
        kind: "unknown",
        code: "auth/unknown",
        message: "Google sign-in could not finish. Try again. Error code: auth/unknown.",
        retryable: true,
      });
    expect(classifyAuthFailure({ code: "database/permission-denied" }, "github").code)
      .toBe("auth/unknown");
  });
});
