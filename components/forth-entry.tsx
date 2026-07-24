"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Github,
  LoaderCircle,
  LogOut,
  Monitor,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { ForthApp } from "@/components/forth-app";
import { readBrowserStorage, writeBrowserStorage } from "@/lib/browser-storage";
import {
  createCleanWorkspace,
  createExplicitDemoWorkspace,
  DEMO_STORAGE_KEY,
  selectPreferredWorkspace,
} from "@/lib/entry";
import {
  getSeedFingerprint,
  looksLikeEngineeringSeed,
} from "@/lib/seed-detection";
import {
  hasMigrationDecision,
  recordMigrationChoice,
  type MigrationChoice,
} from "@/lib/migration";
import { createSeedWorkspace } from "@/lib/seed";
import { hasFirebaseConfig } from "@/lib/firebase/config";
import {
  acceptGuildInvite,
  classifyAuthFailure,
  createGuildWorkspace,
  declineGuildInvite,
  type AuthFailure,
  type ForthAuthProvider,
  type GuildWorkspace,
  listGuildWorkspaces,
  listPendingGuildInvites,
  loadWorkspaceState,
  type PendingGuildInvite,
  saveWorkspace,
  signInWithProvider,
  signInWithRedirectProvider,
  signOutOfForth,
  watchAuth,
} from "@/lib/firebase/workspace";
import type { User } from "firebase/auth";
import type { WorkspaceState } from "@/lib/types";

type EntryScreen =
  | "checking"
  | "signed-out"
  | "authenticating"
  | "loading-workspaces"
  | "opening-workspace"
  | "onboarding"
  | "migration-choice"
  | "workspace-error"
  | "cloud"
  | "demo";

type CloudLaunch = {
  workspaceId: string;
  guilds: GuildWorkspace[];
  state: WorkspaceState;
  revision: number;
};

type InviteLoadState = "loading" | "ready" | "error";

const SAFE_ENTRY_ERROR_PREFIXES = [
  "Forth could not check",
  "This workspace has no valid",
  "No invitation for this account",
  "This invitation has expired",
  "Your signed-in account needs",
  "Enter a name for your first campaign",
  "Describe the real outcome",
  "Choose a valid target date",
];

function safeEntryError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return SAFE_ENTRY_ERROR_PREFIXES.some((prefix) => error.message.startsWith(prefix))
    ? error.message
    : fallback;
}

export function ForthEntry() {
  const [screen, setScreen] = useState<EntryScreen>(hasFirebaseConfig ? "checking" : "signed-out");
  const [user, setUser] = useState<User | null>(null);
  const [authProvider, setAuthProvider] = useState<ForthAuthProvider | null>(null);
  const [authFailure, setAuthFailure] = useState<AuthFailure | null>(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [cloudLaunch, setCloudLaunch] = useState<CloudLaunch | null>(null);
  const [demoState, setDemoState] = useState<WorkspaceState | null>(null);
  const [demoStorageWarning, setDemoStorageWarning] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PendingGuildInvite[]>([]);
  const [inviteLoadState, setInviteLoadState] = useState<InviteLoadState>("loading");
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");
  const [pendingMigration, setPendingMigration] = useState<CloudLaunch | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationError, setMigrationError] = useState("");
  const requestIdRef = useRef(0);
  const providerButtonRefs = useRef<Partial<Record<ForthAuthProvider, HTMLButtonElement | null>>>({});

  const openAuthenticatedUser = useCallback(async (nextUser: User, requestedWorkspaceId?: string) => {
    const requestId = ++requestIdRef.current;
    setWorkspaceError("");
    setCloudLaunch(null);
    setScreen(requestedWorkspaceId ? "opening-workspace" : "loading-workspaces");

    try {
      const guilds = await listGuildWorkspaces(nextUser);
      if (requestId !== requestIdRef.current) return;

      if (guilds.length === 0) {
        setPendingInvites([]);
        setInviteLoadState("loading");
        setScreen("onboarding");
        void listPendingGuildInvites(nextUser)
          .then((invites) => {
            if (requestId !== requestIdRef.current) return;
            setPendingInvites(invites);
            setInviteLoadState("ready");
          })
          .catch(() => {
            if (requestId !== requestIdRef.current) return;
            setInviteLoadState("error");
          });
        return;
      }

      const storedWorkspaceId = readBrowserStorage(`forth.active-workspace.${nextUser.uid}`).value;
      const selected = selectPreferredWorkspace(
        guilds,
        requestedWorkspaceId ?? storedWorkspaceId,
        nextUser.uid,
      );
      if (!selected) throw new Error("No accessible workspace was found.");

      setScreen("opening-workspace");
      const workspaceSnapshot = await loadWorkspaceState(selected.id);
      if (requestId !== requestIdRef.current) return;
      if (!workspaceSnapshot) {
        throw new Error("This workspace has no valid ticket data. Forth did not replace it with sample content.");
      }

      // This preference is a convenience only. A blocked localStorage API must
      // never prevent an authenticated user from opening their cloud data.
      writeBrowserStorage(`forth.active-workspace.${nextUser.uid}`, selected.id);
      const launch: CloudLaunch = {
        workspaceId: selected.id,
        guilds,
        state: workspaceSnapshot.state,
        revision: workspaceSnapshot.revision,
      };
      const seedFingerprint = getSeedFingerprint();
      if (
        looksLikeEngineeringSeed(workspaceSnapshot.state)
        && !hasMigrationDecision(nextUser.uid, selected.id, seedFingerprint)
      ) {
        setPendingMigration(launch);
        setMigrationError("");
        setScreen("migration-choice");
        return;
      }
      setCloudLaunch(launch);
      setScreen("cloud");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setWorkspaceError(safeEntryError(
        error,
        "Forth could not open your workspace. Your cloud data was not changed. Try again.",
      ));
      setScreen("workspace-error");
    }
  }, []);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      return;
    }

    const unsubscribe = watchAuth(({ user: nextUser, loading }) => {
      if (loading) {
        setScreen("checking");
        return;
      }
      if (!nextUser) {
        requestIdRef.current += 1;
        setUser(null);
        setCloudLaunch(null);
        setWorkspaceError("");
        setScreen("signed-out");
        return;
      }
      setUser(nextUser);
      setAuthFailure(null);
      void openAuthenticatedUser(nextUser);
    });

    return () => unsubscribe?.();
  }, [openAuthenticatedUser]);

  async function beginSignIn(provider: ForthAuthProvider) {
    if (!hasFirebaseConfig) return;
    setAuthFailure(null);
    setAuthProvider(provider);
    setScreen("authenticating");
    try {
      await signInWithProvider(provider);
    } catch (error) {
      const failure = classifyAuthFailure(error, provider);
      setAuthFailure(failure);
      setScreen("signed-out");
      window.requestAnimationFrame(() => providerButtonRefs.current[provider]?.focus());
    }
  }

  async function beginRedirectSignIn(provider: ForthAuthProvider) {
    if (!hasFirebaseConfig) return;
    setAuthFailure(null);
    setAuthProvider(provider);
    setScreen("authenticating");
    try {
      await signInWithRedirectProvider(provider);
    } catch (error) {
      const failure = classifyAuthFailure(error, provider);
      setAuthFailure(failure);
      setScreen("signed-out");
      window.requestAnimationFrame(() => providerButtonRefs.current[provider]?.focus());
    }
  }

  function enterDemo() {
    const storedDemo = readBrowserStorage(DEMO_STORAGE_KEY);
    const state = createExplicitDemoWorkspace(
      storedDemo.value,
      new Date(),
    );
    setAuthFailure(null);
    setDemoStorageWarning(storedDemo.available
      ? ""
      : "Browser storage is unavailable. This demo works in memory, but refreshing or closing the tab will discard its changes.");
    setDemoState(state);
    setScreen("demo");
  }

  async function leaveWorkspace() {
    requestIdRef.current += 1;
    setCloudLaunch(null);
    setDemoState(null);
    if (user) {
      try {
        await signOutOfForth();
      } catch {
        setWorkspaceError("Forth could not complete sign-out. Your cloud data was not changed. Try again.");
        setScreen("workspace-error");
      }
      return;
    }
    setScreen("signed-out");
  }

  async function createFirstWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || onboardingBusy) return;
    const data = new FormData(event.currentTarget);
    const workspaceName = String(data.get("workspaceName") ?? "").trim();
    const campaignTitle = String(data.get("campaignTitle") ?? "").trim();
    const outcome = String(data.get("outcome") ?? "").trim();
    const targetDate = String(data.get("targetDate") ?? "").trim();
    if (!workspaceName || !campaignTitle || !outcome || !targetDate) {
      setOnboardingError("Complete the workspace name, campaign name, outcome, and target date.");
      return;
    }

    setOnboardingBusy(true);
    setOnboardingError("");
    try {
      const cleanState = createCleanWorkspace({ campaignTitle, outcome, targetDate });
      const workspaceId = await createGuildWorkspace(user, workspaceName, cleanState);
      await openAuthenticatedUser(user, workspaceId);
    } catch (error) {
      setOnboardingError(safeEntryError(
        error,
        "The workspace could not be created. No sample tickets were added. Try again.",
      ));
    } finally {
      setOnboardingBusy(false);
    }
  }

  async function respondToInvite(invite: PendingGuildInvite, action: "accept" | "decline") {
    if (!user || onboardingBusy) return;
    setOnboardingBusy(true);
    setOnboardingError("");
    try {
      if (action === "decline") {
        await declineGuildInvite(user, invite.workspaceId);
        setPendingInvites((current) => current.filter((item) => item.workspaceId !== invite.workspaceId));
      } else {
        const joined = await acceptGuildInvite(user, invite.workspaceId);
        await openAuthenticatedUser(user, joined.workspaceId);
      }
    } catch (error) {
      setOnboardingError(safeEntryError(error, "The invitation could not be updated. Try again."));
    } finally {
      setOnboardingBusy(false);
    }
  }

  async function finishMigrationLaunch(launch: CloudLaunch, choice: MigrationChoice) {
    if (!user) return;
    recordMigrationChoice({
      userId: user.uid,
      workspaceId: launch.workspaceId,
      seedFingerprint: getSeedFingerprint(),
      choice,
    });
    setPendingMigration(null);
    setCloudLaunch(launch);
    setScreen("cloud");
  }

  async function applyMigrationChoice(choice: MigrationChoice) {
    if (!user || !pendingMigration || migrationBusy) return;
    setMigrationBusy(true);
    setMigrationError("");
    try {
      if (choice === "keep") {
        await finishMigrationLaunch(pendingMigration, choice);
        return;
      }

      const confirmMessage = choice === "replace-demo"
        ? "Replace this workspace with the engineering demo sample? Your current tickets will be overwritten in cloud storage."
        : "Start with an empty workspace? Your current tickets will be removed from cloud storage after you confirm the new campaign.";
      if (!window.confirm(confirmMessage)) {
        return;
      }

      const nextState = choice === "replace-demo"
        ? createSeedWorkspace()
        : createCleanWorkspace({
          campaignTitle: "My first campaign",
          outcome: "Define the real outcome for this project.",
          targetDate: new Date().toISOString().slice(0, 10),
        });

      const saved = await saveWorkspace(
        pendingMigration.workspaceId,
        pendingMigration.revision,
        pendingMigration.state,
        nextState,
      );

      await finishMigrationLaunch({
        ...pendingMigration,
        state: saved.state,
        revision: saved.revision,
      }, choice);
    } catch (error) {
      setMigrationError(safeEntryError(
        error,
        "Forth could not update your workspace. Your previous tickets were not changed. Try again.",
      ));
    } finally {
      setMigrationBusy(false);
    }
  }

  async function applyMigrationEmptyForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !pendingMigration || migrationBusy) return;
    const data = new FormData(event.currentTarget);
    const campaignTitle = String(data.get("campaignTitle") ?? "").trim();
    const outcome = String(data.get("outcome") ?? "").trim();
    const targetDate = String(data.get("targetDate") ?? "").trim();
    if (!campaignTitle || !outcome || !targetDate) {
      setMigrationError("Complete the campaign name, outcome, and target date.");
      return;
    }
    if (!window.confirm(
      "Start with this empty campaign? Your current sample tickets will be removed from cloud storage.",
    )) {
      return;
    }

    setMigrationBusy(true);
    setMigrationError("");
    try {
      const nextState = createCleanWorkspace({ campaignTitle, outcome, targetDate });
      const saved = await saveWorkspace(
        pendingMigration.workspaceId,
        pendingMigration.revision,
        pendingMigration.state,
        nextState,
      );
      await finishMigrationLaunch({
        ...pendingMigration,
        state: saved.state,
        revision: saved.revision,
      }, "start-empty");
    } catch (error) {
      setMigrationError(safeEntryError(
        error,
        "Forth could not replace your workspace. Your previous tickets were not changed. Try again.",
      ));
    } finally {
      setMigrationBusy(false);
    }
  }

  if (screen === "demo" && demoState) {
    return (
      <ForthApp
        key="explicit-demo"
        mode="demo"
        initialState={demoState}
        initialDemoStorageWarning={demoStorageWarning}
        onExit={leaveWorkspace}
      />
    );
  }

  if (screen === "cloud" && user && cloudLaunch) {
    return (
      <ForthApp
        key={`${user.uid}:${cloudLaunch.workspaceId}`}
        mode="cloud"
        initialState={cloudLaunch.state}
        initialCloudRevision={cloudLaunch.revision}
        cloudUser={user}
        initialGuilds={cloudLaunch.guilds}
        activeWorkspaceId={cloudLaunch.workspaceId}
        onOpenWorkspace={(workspaceId) => openAuthenticatedUser(user, workspaceId)}
        onExit={leaveWorkspace}
        showsSampleDataBanner={looksLikeEngineeringSeed(cloudLaunch.state)}
      />
    );
  }

  if (screen === "migration-choice" && user && pendingMigration) {
    return (
      <EntryFrame>
        <main className="entry-shell entry-shell--onboarding" aria-labelledby="migration-title">
          <section className="entry-onboarding entry-migration">
            <p className="eyebrow">Sample data review</p>
            <h1 id="migration-title">This workspace still contains earlier sample tickets.</h1>
            <p className="entry-lede">
              Forth found engineering demo content in your cloud workspace. Choose how to proceed.
              Forth will never replace your data without an explicit choice.
            </p>

            {migrationError && (
              <div className="entry-error" role="alert">
                <AlertTriangle aria-hidden="true" size={20} />
                <p>{migrationError}</p>
              </div>
            )}

            <div className="entry-migration-actions">
              <button
                className="button button--primary entry-primary-action"
                disabled={migrationBusy}
                onClick={() => void applyMigrationChoice("keep")}
              >
                Keep my current tickets
              </button>
              <button
                className="button button--quiet"
                disabled={migrationBusy}
                onClick={() => void applyMigrationChoice("replace-demo")}
              >
                Replace with engineering demo
              </button>
            </div>

            <form className="entry-workspace-form entry-migration-empty" onSubmit={applyMigrationEmptyForm}>
              <p className="eyebrow">Or start empty</p>
              <h2>Begin with one real campaign and zero tickets</h2>
              <label className="field">
                <span>Campaign name</span>
                <input name="campaignTitle" required maxLength={80} placeholder="Ship cohort ticketing" />
              </label>
              <label className="field">
                <span>Campaign outcome</span>
                <textarea name="outcome" rows={3} required maxLength={240} placeholder="What should be true when this project succeeds?" />
              </label>
              <label className="field">
                <span>Target date</span>
                <input name="targetDate" type="date" required />
              </label>
              <button className="button button--quiet" disabled={migrationBusy}>
                {migrationBusy ? "Updating workspace…" : "Start empty workspace"}
              </button>
            </form>

            <button className="entry-text-action" onClick={() => void leaveWorkspace()}>
              <LogOut aria-hidden="true" size={16} /> Sign out without changing data
            </button>
          </section>
        </main>
      </EntryFrame>
    );
  }

  if (screen === "onboarding" && user) {
    return (
      <EntryFrame>
        <main className="entry-shell entry-shell--onboarding" aria-labelledby="onboarding-title">
          <section className="entry-onboarding">
            <p className="eyebrow">First real workspace</p>
            <h1 id="onboarding-title">Set up your team workspace.</h1>
            <p className="entry-lede">
              This workspace starts with one campaign you name and zero tickets. Forth will not add fake teammates,
              completed work, or sample progress to your account.
            </p>

            {onboardingError && (
              <div className="entry-error" role="alert">
                <AlertTriangle aria-hidden="true" size={20} />
                <p>{onboardingError}</p>
              </div>
            )}

            <form className="entry-workspace-form" onSubmit={createFirstWorkspace}>
              <label className="field">
                <span>Workspace name</span>
                <input name="workspaceName" required maxLength={60} placeholder="Cursor Boston platform team" />
                <small>The shared space your teammates will join.</small>
              </label>
              <label className="field">
                <span>First campaign (project)</span>
                <input name="campaignTitle" required maxLength={80} placeholder="Ship cohort ticketing" />
                <small>Your first real project. It begins with no tickets.</small>
              </label>
              <label className="field">
                <span>Campaign outcome</span>
                <textarea name="outcome" rows={3} required maxLength={240} placeholder="What should be true when this project succeeds?" />
              </label>
              <label className="field">
                <span>Target date</span>
                <input name="targetDate" type="date" required />
                <small>Choose your real planning target; Forth will not invent one.</small>
              </label>
              <button className="button button--primary entry-primary-action" disabled={onboardingBusy}>
                {onboardingBusy ? <LoaderCircle className="entry-spinner" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                {onboardingBusy ? "Creating workspace…" : "Create clean workspace"}
              </button>
            </form>
          </section>

          <aside className="entry-invites" aria-labelledby="entry-invites-title">
            <p className="eyebrow">Invitations</p>
            <h2 id="entry-invites-title">Joining an existing team?</h2>
            {inviteLoadState === "loading" && <p role="status">Checking invitations for your account email…</p>}
            {inviteLoadState === "error" && (
              <p>Invitations could not be checked. You can retry by signing out and back in; no workspace was changed.</p>
            )}
            {inviteLoadState === "ready" && pendingInvites.length === 0 && (
              <p>No pending invitations were found. You can create your own workspace now.</p>
            )}
            {pendingInvites.map((invite) => (
              <article className="entry-invite" key={invite.workspaceId}>
                <h3>{invite.workspaceName}</h3>
                <p>Invited by {invite.invitedBy}</p>
                {invite.expired ? (
                  <p className="entry-invite-expired">Expired — ask the workspace owner for a new invitation.</p>
                ) : (
                  <div className="entry-inline-actions">
                    <button className="button button--primary" disabled={onboardingBusy} onClick={() => void respondToInvite(invite, "accept")}>Accept invitation</button>
                    <button className="button button--quiet" disabled={onboardingBusy} onClick={() => void respondToInvite(invite, "decline")}>Decline</button>
                  </div>
                )}
              </article>
            ))}
            <button className="entry-text-action" onClick={() => void leaveWorkspace()}>
              <LogOut aria-hidden="true" size={16} /> Sign out
            </button>
          </aside>
        </main>
      </EntryFrame>
    );
  }

  if (screen === "workspace-error") {
    return (
      <EntryFrame>
        <main className="entry-status-page" aria-labelledby="workspace-error-title">
          <div className="entry-status-card">
            <AlertTriangle aria-hidden="true" size={28} />
            <p className="eyebrow">Workspace unavailable</p>
            <h1 id="workspace-error-title">Your tickets were not replaced.</h1>
            <p>{workspaceError || "Forth could not open this workspace. No demo data was substituted."}</p>
            <div className="entry-inline-actions">
              {user && <button className="button button--primary" onClick={() => void openAuthenticatedUser(user)}>Try again</button>}
              <button className="button button--quiet" onClick={() => void leaveWorkspace()}>Sign out</button>
            </div>
          </div>
        </main>
      </EntryFrame>
    );
  }

  if (["checking", "authenticating", "loading-workspaces", "opening-workspace"].includes(screen)) {
    const copy = screen === "checking"
      ? ["Checking your account…", "Please wait while Forth checks whether you are already signed in."]
      : screen === "authenticating"
        ? [`Opening ${authProvider === "github" ? "GitHub" : "Google"} sign-in…`, "Complete sign-in in the secure window. Your workspace has not loaded yet."]
        : screen === "loading-workspaces"
          ? ["Finding your workspaces…", "Forth is checking which team projects your account may access."]
          : ["Opening your workspace…", "Loading the selected workspace before any tickets appear."];
    return (
      <EntryFrame>
        <main className="entry-status-page" aria-labelledby="entry-status-title">
          <div className="entry-status-card" role="status" aria-live="polite">
            <LoaderCircle className="entry-spinner" aria-hidden="true" size={30} />
            <h1 id="entry-status-title">{copy[0]}</h1>
            <p>{copy[1]}</p>
          </div>
        </main>
      </EntryFrame>
    );
  }

  return (
    <EntryFrame>
      <main className="entry-shell" aria-labelledby="entry-title">
        <section className="entry-intro">
          <p className="eyebrow">A calmer project workspace</p>
          <h1 id="entry-title">Plan the work. Move tickets forward. Keep proof of progress.</h1>
          <p className="entry-lede">
            Forth helps teams manage projects, assign tickets, and choose a realistic daily workload without
            streak pressure or public rankings.
          </p>
          <ul className="entry-benefits">
            <li><CheckCircle2 aria-hidden="true" /> See today’s most important work</li>
            <li><Users aria-hidden="true" /> Coordinate projects with your team</li>
            <li><ShieldCheck aria-hidden="true" /> Keep shared work inside authorized workspaces</li>
          </ul>
          <div className="entry-squire" aria-hidden="true">
            <Image src="/sprites/code-squire.png" alt="" width={72} height={72} unoptimized />
            <span>Iron &amp; Parchment · Built for software guilds</span>
          </div>
        </section>

        <section className="entry-card" aria-labelledby="account-heading">
          <p className="eyebrow">Secure account</p>
          <h2 id="account-heading">Sign in to your workspace</h2>
          <p>Your projects and tickets load only after Firebase confirms which workspaces you may access.</p>

          {authFailure && (
            <div className="entry-error" role="alert">
              <AlertTriangle aria-hidden="true" size={20} />
              <div>
                <strong>Sign-in did not finish</strong>
                <p>{authFailure.message}</p>
                {authFailure.retryable && authProvider && (
                  <div>
                    <button className="entry-text-action" onClick={() => void beginSignIn(authProvider)}>
                      Try {authProvider === "github" ? "GitHub" : "Google"} again
                    </button>
                    {(authFailure.kind === "popup-blocked" || authFailure.kind === "popup-cancelled") && (
                      <button className="entry-text-action" onClick={() => void beginRedirectSignIn(authProvider)}>
                        Use full-page sign-in instead
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasFirebaseConfig && (
            <div className="entry-error" role="alert">
              <AlertTriangle aria-hidden="true" size={20} />
              <p>Account sign-in is temporarily unavailable in this environment. The local demo still works.</p>
            </div>
          )}

          <div className="entry-provider-list">
            <button
              className="entry-provider-button"
              ref={(element) => { providerButtonRefs.current.google = element; }}
              data-auth-provider="google"
              disabled={!hasFirebaseConfig}
              onClick={() => void beginSignIn("google")}
            >
              <span className="entry-google-mark" aria-hidden="true">G</span>
              Continue with Google
            </button>
            <button
              className="entry-provider-button"
              ref={(element) => { providerButtonRefs.current.github = element; }}
              data-auth-provider="github"
              disabled={!hasFirebaseConfig}
              onClick={() => void beginSignIn("github")}
            >
              <Github aria-hidden="true" />
              Continue with GitHub
            </button>
          </div>

          <div className="entry-divider"><span>or</span></div>

          <section className="entry-demo-note" aria-labelledby="demo-heading">
            <Monitor aria-hidden="true" size={22} />
            <div>
              <h3 id="demo-heading">Explore a disposable demo</h3>
              <p>Uses sample tickets stored only in this browser. Demo changes are not shared, backed up, or copied into your account.</p>
              <button className="button button--quiet entry-demo-button" onClick={enterDemo}>
                Explore local demo <ArrowRight aria-hidden="true" size={16} />
              </button>
            </div>
          </section>
        </section>
      </main>
    </EntryFrame>
  );
}

function EntryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="entry-page">
      <header className="entry-masthead">
        <span className="entry-brand"><BrandMark /><span className="brand-word">Forth</span></span>
        <span className="entry-product-label">Project and ticket management</span>
      </header>
      {children}
      <footer className="entry-footer">Private workspaces · Explicit local demo · No public productivity rankings</footer>
    </div>
  );
}
