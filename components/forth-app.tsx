"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CirclePause,
  Gauge,
  LayoutGrid,
  Leaf,
  ListChecks,
  LockKeyhole,
  Map as MapIcon,
  Plus,
  RotateCcw,
  Settings,
  Target,
  X,
  Coins,
  ScrollText,
  Sword,
  Pencil,
  Trash2,
  Search,
  GripVertical,
  UserPlus,
  Scroll,
} from "lucide-react";
import { type DragEvent, FormEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Image from "next/image";
import { BrandMark } from "@/components/brand-mark";
import { readBrowserStorage, writeBrowserStorage } from "@/lib/browser-storage";
import type { User } from "firebase/auth";
import {
  acceptGuildInvite,
  cancelGuildInvite,
  createGuildWorkspace,
  declineGuildInvite,
  type GuildInviteSummary,
  type GuildWorkspace,
  inviteGuildMember,
  listGuildInvites,
  listPendingGuildInvites,
  type PendingGuildInvite,
  saveWorkspace,
  watchWorkspace,
} from "@/lib/firebase/workspace";
import { createCleanWorkspace, DEMO_STORAGE_KEY } from "@/lib/entry";
import { createSeedWorkspace } from "@/lib/seed";
import type { Pace, Project, Task, TaskPriority, TaskStatus, WorkspaceState } from "@/lib/types";
import {
  createTask,
  createProject,
  getDueSoonTasks,
  getFocusTasks,
  getMomentumDays,
  getNextLocalDayDelay,
  getPlannedWeight,
  getProjectProgress,
  PACE_CAPACITY,
  STATUS_LABELS,
  workspaceReducer,
  type DueSoonEntry,
} from "@/lib/workspace";

type View = "today" | "board" | "proof" | "settings";

const DUE_PANEL_LIMIT = 6;

type SyncState = "demo" | "syncing" | "synced" | "error";

type ForthAppBaseProps = {
  initialState: WorkspaceState;
  onExit: () => Promise<void>;
};

type ForthAppProps = ForthAppBaseProps & (
  | {
    mode: "demo";
    initialDemoStorageWarning?: string;
    cloudUser?: never;
    initialGuilds?: never;
    activeWorkspaceId?: never;
    onOpenWorkspace?: never;
  }
  | {
    mode: "cloud";
    initialDemoStorageWarning?: never;
    cloudUser: User;
    initialGuilds: GuildWorkspace[];
    activeWorkspaceId: string;
    onOpenWorkspace: (workspaceId: string) => Promise<void>;
  }
);

type NewGuildInput = {
  name: string;
  campaignTitle: string;
  outcome: string;
  targetDate: string;
};

const NAV_ITEMS: Array<{ id: View; label: string; icon: typeof Gauge }> = [
  { id: "today", label: "Quest Log", icon: Gauge },
  { id: "board", label: "Realm Map", icon: LayoutGrid },
  { id: "proof", label: "Chronicle", icon: ListChecks },
  { id: "settings", label: "Guild Hall", icon: Settings },
];

/** Device-local flag: the welcome guide has been seen. Kept out of WorkspaceState (never synced). */
const WELCOME_SEEN_KEY = "forth.welcome.v2";

const PACE_COPY: Record<Pace, { label: string; hint: string }> = {
  light: { label: "Scout", hint: "A short expedition" },
  steady: { label: "Venture", hint: "A grounded build day" },
  full: { label: "Raid", hint: "Deep-work reserves ready" },
};

const SAFE_WORKSPACE_ERROR_PREFIXES = [
  "Only a guild owner",
  "Enter a valid teammate email address",
  "No invitation for this account email",
  "This invitation has expired",
  "Your signed-in account needs",
  "This browser cannot safely create",
  "Enter a name for your first campaign",
  "Describe the real outcome",
  "Choose a valid target date",
];

function safeWorkspaceActionError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return SAFE_WORKSPACE_ERROR_PREFIXES.some((prefix) => error.message.startsWith(prefix))
    ? error.message
    : fallback;
}

export function ForthApp({
  mode,
  initialState,
  initialDemoStorageWarning = "",
  cloudUser,
  initialGuilds = [],
  activeWorkspaceId,
  onOpenWorkspace,
  onExit,
}: ForthAppProps) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const [displayDate, setDisplayDate] = useState(() => new Date());
  const [view, setView] = useState<View>("today");
  const [activeProjectId, setActiveProjectId] = useState(initialState.projects[0]?.id ?? "");
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const [syncState, setSyncState] = useState<SyncState>(mode === "cloud" ? "syncing" : "demo");
  const [pendingInvites, setPendingInvites] = useState<PendingGuildInvite[]>([]);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [sentInvites, setSentInvites] = useState<GuildInviteSummary[]>([]);
  const [cloudSnapshotReady, setCloudSnapshotReady] = useState(mode === "demo");
  const [persistentSyncError, setPersistentSyncError] = useState("");
  const [demoStorageWarning, setDemoStorageWarning] = useState(initialDemoStorageWarning);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const cloudReadyRef = useRef(false);
  const hasValidatedSnapshotRef = useRef(mode === "demo");
  const latestStateRef = useRef(state);
  const remoteStateRef = useRef<WorkspaceState | null>(null);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveCountRef = useRef(0);
  const transitionBusyRef = useRef(false);
  latestStateRef.current = state;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const campaignDialogRef = useRef<HTMLDialogElement>(null);
  const welcomeDialogRef = useRef<HTMLDialogElement>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const welcomeSeenKey = mode === "cloud"
    ? `${WELCOME_SEEN_KEY}.cloud.${cloudUser.uid}`
    : `${WELCOME_SEEN_KEY}.demo`;

  const queueCloudSave = useCallback(async (
    targetRevision: number,
    snapshot: WorkspaceState,
  ): Promise<boolean> => {
    if (mode !== "cloud" || !activeWorkspaceId) return true;

    pendingSaveCountRef.current += 1;
    setSyncState("syncing");
    const saveAttempt = saveChainRef.current
      .catch(() => undefined)
      .then(async () => {
        await saveWorkspace(activeWorkspaceId, snapshot);
        savedRevisionRef.current = Math.max(savedRevisionRef.current, targetRevision);
      });
    saveChainRef.current = saveAttempt;

    try {
      await saveAttempt;
      if (savedRevisionRef.current >= revisionRef.current && pendingSaveCountRef.current <= 1) {
        dirtyRef.current = false;
        setPersistentSyncError("");
        setSyncState("synced");
      }
      return true;
    } catch {
      setPersistentSyncError(
        "Forth could not save your latest changes. Stay in this workspace and retry before switching or signing out.",
      );
      setSyncState("error");
      return false;
    } finally {
      pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
    }
  }, [activeWorkspaceId, mode]);

  const flushCloudSave = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (mode !== "cloud") return true;
    if (!dirtyRef.current && pendingSaveCountRef.current === 0) return true;
    if (!activeWorkspaceId || !hasValidatedSnapshotRef.current) {
      setPersistentSyncError(
        "Forth has not confirmed this cloud workspace yet. No navigation occurred; wait for cloud loading to finish and retry.",
      );
      setSyncState("error");
      return false;
    }

    // A save that was already queued may contain an older state. Wait for it,
    // then enqueue the newest revision so writes always reach Firestore in the
    // same order the user made them.
    if (pendingSaveCountRef.current > 0) {
      try {
        await saveChainRef.current;
      } catch {
        // The immediate retry below uses the latest state and may recover from
        // a transient failure without allowing navigation to race ahead.
      }
    }

    while (savedRevisionRef.current < revisionRef.current || dirtyRef.current) {
      const saved = await queueCloudSave(revisionRef.current, latestStateRef.current);
      if (!saved) return false;
    }

    dirtyRef.current = false;
    setPersistentSyncError("");
    setSyncState("synced");
    return true;
  }, [activeWorkspaceId, mode, queueCloudSave]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDisplayDate(new Date());
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let midnightTimer = 0;

    const scheduleNextDay = () => {
      window.clearTimeout(midnightTimer);
      const now = new Date();
      midnightTimer = window.setTimeout(() => {
        setDisplayDate(new Date());
        scheduleNextDay();
      }, getNextLocalDayDelay(now));
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      setDisplayDate(new Date());
      scheduleNextDay();
    };

    scheduleNextDay();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  // Demo and each signed-in account keep separate seen-state. Someone who first
  // explores sample data—or shares this device—still receives the accurate
  // signed-in explanation when entering their own real workspace.
  useEffect(() => {
    if (!hydrated || (mode === "cloud" && !cloudSnapshotReady)) return;
    if (readBrowserStorage(welcomeSeenKey).value) return;
    const frame = window.requestAnimationFrame(() => {
      const dialog = welcomeDialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cloudSnapshotReady, hydrated, mode, welcomeSeenKey]);

  useEffect(() => {
    if (mode === "demo" && hydrated) {
      const saved = writeBrowserStorage(DEMO_STORAGE_KEY, JSON.stringify(state));
      if (!saved && !demoStorageWarning) {
        const frame = window.requestAnimationFrame(() => {
          setDemoStorageWarning(
            "Browser storage is unavailable. This demo still works in memory, but refreshing or closing the tab will discard its changes.",
          );
        });
        return () => window.cancelAnimationFrame(frame);
      }
    }
  }, [demoStorageWarning, hydrated, mode, state]);

  // Look up pending invitations independently of workspace provisioning so a
  // recipient always sees (and can act on) an invite even if their own guild
  // sync is degraded.
  useEffect(() => {
    if (mode !== "cloud" || !cloudUser) return;
    void refreshPendingInvites(cloudUser);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudUser?.uid, mode]);

  // Owners see the invitations they have already sent for the active guild so
  // they can cancel a typo or a stale invite. Refreshed when the guild changes.
  useEffect(() => {
    if (mode !== "cloud" || !cloudUser) return;
    const guild = initialGuilds.find((candidate) => candidate.id === activeWorkspaceId) ?? null;
    void refreshSentInvites(cloudUser, guild);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudUser?.uid, activeWorkspaceId, initialGuilds, mode]);

  useEffect(() => {
    if (mode !== "cloud" || !cloudUser || !activeWorkspaceId || !hydrated) return;
    cloudReadyRef.current = false;
    hasValidatedSnapshotRef.current = false;
    dirtyRef.current = false;
    revisionRef.current = 0;
    savedRevisionRef.current = 0;
    const unsubscribe = watchWorkspace(
      activeWorkspaceId,
      (cloudState) => {
        if (hasValidatedSnapshotRef.current && (dirtyRef.current || pendingSaveCountRef.current > 0)) {
          // Preserve local edits while their ordered save is pending. The
          // listener will receive the committed state after Firestore accepts
          // it; applying an older snapshot here could erase visible work.
          return;
        }
        remoteStateRef.current = cloudState;
        dispatch({ type: "RESET", state: cloudState });
        if (!hasValidatedSnapshotRef.current) {
          window.requestAnimationFrame(() => {
            hasValidatedSnapshotRef.current = true;
            cloudReadyRef.current = true;
            setCloudSnapshotReady(true);
            setPersistentSyncError("");
            setSyncState("synced");
          });
        } else {
          cloudReadyRef.current = true;
          setPersistentSyncError("");
          setSyncState("synced");
        }
      },
      () => {
        setPersistentSyncError(
          hasValidatedSnapshotRef.current
            ? "Live cloud updates were interrupted. Your visible workspace remains in place; retry saving before leaving it."
            : "Forth could not validate this cloud workspace. No tickets can be edited until the connection succeeds.",
        );
        setSyncState("error");
      },
    ) ?? undefined;
    if (!unsubscribe) {
      setPersistentSyncError("Forth could not start cloud sync for this workspace. No tickets can be edited.");
      setSyncState("error");
    }
    return () => {
      cloudReadyRef.current = false;
      unsubscribe?.();
    };
  }, [activeWorkspaceId, cloudUser, hydrated, mode]);

  useEffect(() => {
    if (mode !== "cloud" || !cloudUser || !activeWorkspaceId || !cloudReadyRef.current) return;
    if (remoteStateRef.current === state) {
      remoteStateRef.current = null;
      return;
    }

    revisionRef.current += 1;
    dirtyRef.current = true;
    setSyncState("syncing");
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void flushCloudSave();
    }, 450);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [activeWorkspaceId, cloudUser, flushCloudSave, mode, state]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && pendingSaveCountRef.current === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const focusTasks = getFocusTasks(state);
  const plannedWeight = getPlannedWeight(state);
  const capacity = PACE_CAPACITY[state.pace];
  const activeProject =
    state.projects.find((project) => project.id === activeProjectId) ?? state.projects[0];
  const activeGuild = initialGuilds.find((guild) => guild.id === activeWorkspaceId) ?? null;

  function announce(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function setStatus(taskId: string, status: TaskStatus) {
    dispatch({ type: "SET_STATUS", taskId, status });
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    announce(
      status === "done"
        ? `Quest shipped: ${task.title} · +${task.weight * 10} gold`
        : `${task.title} is now ${STATUS_LABELS[status].toLowerCase()}.`,
    );
  }

  function openAddDialog() {
    dialogRef.current?.showModal();
  }

  function openCampaignDialog() {
    campaignDialogRef.current?.showModal();
  }

  function openWelcome() {
    const dialog = welcomeDialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }

  // Persist "seen" on any close path (button, X, backdrop, Escape) via the dialog's onClose.
  function markWelcomeSeen() {
    writeBrowserStorage(welcomeSeenKey, "seen");
  }
  async function refreshPendingInvites(user: User) {
    setInviteStatus("loading");
    try {
      setPendingInvites(await listPendingGuildInvites(user));
      setInviteStatus("ready");
    } catch {
      setPendingInvites([]);
      setInviteStatus("error");
    }
  }

  async function refreshSentInvites(user: User, guild: GuildWorkspace | null) {
    if (!guild || guild.role !== "owner") {
      setSentInvites([]);
      return;
    }
    try {
      setSentInvites(await listGuildInvites(user, guild));
    } catch {
      setSentInvites([]);
    }
  }

  function openEditDialog(task: Task) {
    setEditingTask(task);
    window.requestAnimationFrame(() => editDialogRef.current?.showModal());
  }

  function resetDemo() {
    if (mode !== "demo") return;
    if (!window.confirm("Restore the disposable demo in this browser? This replaces only demo data on this device.")) return;
    const demoState = createSeedWorkspace();
    dispatch({ type: "RESET", state: demoState });
    setActiveProjectId(demoState.projects[0]?.id ?? "");
    setView("today");
    announce("The disposable local demo has been reset.");
  }

  const title =
    view === "today"
      ? "Choose today’s three quests."
      : view === "board"
        ? "Survey the engineering realm."
        : view === "proof"
        ? "Read what the guild has shipped."
        : "Tend the guild hall.";

  function deleteTask(task: Task) {
    if (window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      dispatch({ type: "DELETE_TASK", taskId: task.id });
      announce("Ticket deleted.");
    }
  }

  async function createGuild(input: NewGuildInput): Promise<boolean> {
    if (mode !== "cloud" || !cloudUser || !onOpenWorkspace) return false;
    const cleanName = input.name.trim();
    if (!cleanName) return false;
    try {
      const cleanState = createCleanWorkspace({
        campaignTitle: input.campaignTitle,
        outcome: input.outcome,
        targetDate: input.targetDate,
      });
      return await runDurableTransition(async () => {
        const workspaceId = await createGuildWorkspace(cloudUser, cleanName, cleanState);
        await onOpenWorkspace(workspaceId);
      });
    } catch (error) {
      announce(safeWorkspaceActionError(error, "The guild could not be created. Your current workspace was not changed."));
      return false;
    }
  }

  async function runDurableTransition(action: () => Promise<void>): Promise<boolean> {
    if (transitionBusyRef.current) return false;
    transitionBusyRef.current = true;
    setTransitionBusy(true);
    try {
      if (!(await flushCloudSave())) return false;
      await action();
      return true;
    } finally {
      transitionBusyRef.current = false;
      setTransitionBusy(false);
    }
  }

  async function inviteGuildmate(email: string): Promise<boolean> {
    if (!cloudUser || !activeGuild) return false;
    try {
      await inviteGuildMember(cloudUser, activeGuild, email);
      announce(`Invitation recorded for ${email.trim().toLowerCase()}. It appears after they sign in with that account email.`);
      await refreshSentInvites(cloudUser, activeGuild);
      return true;
    } catch (error) {
      announce(safeWorkspaceActionError(error, "The invitation could not be sent. Check the address and try again."));
      return false;
    }
  }

  async function cancelInvite(email: string) {
    if (!cloudUser || !activeGuild) return;
    try {
      await cancelGuildInvite(cloudUser, activeGuild, email);
      setSentInvites((current) => current.filter((invite) => invite.email !== email));
      announce(`Invitation to ${email} cancelled.`);
    } catch (error) {
      announce(safeWorkspaceActionError(error, "The invitation could not be cancelled. Try again."));
      await refreshSentInvites(cloudUser, activeGuild);
    }
  }

  async function joinGuild(workspaceId: string): Promise<boolean> {
    if (mode !== "cloud" || !cloudUser || !onOpenWorkspace) return false;
    try {
      return await runDurableTransition(async () => {
        const joinedGuild = await acceptGuildInvite(cloudUser, workspaceId);
        await onOpenWorkspace(joinedGuild.workspaceId);
      });
    } catch (error) {
      announce(safeWorkspaceActionError(error, "The guild invitation could not be accepted. Try again."));
      return false;
    }
  }

  async function acceptPendingInvite(invite: PendingGuildInvite) {
    if (mode !== "cloud" || !cloudUser || !onOpenWorkspace) return;
    try {
      await runDurableTransition(async () => {
        const joinedGuild = await acceptGuildInvite(cloudUser, invite.workspaceId);
        setPendingInvites((current) => current.filter((item) => item.workspaceId !== invite.workspaceId));
        await onOpenWorkspace(joinedGuild.workspaceId);
      });
    } catch (error) {
      announce(safeWorkspaceActionError(error, "The invitation could not be accepted. Try again."));
      void refreshPendingInvites(cloudUser);
    }
  }

  async function declinePendingInvite(invite: PendingGuildInvite) {
    if (!cloudUser) return;
    try {
      await declineGuildInvite(cloudUser, invite.workspaceId);
      setPendingInvites((current) => current.filter((item) => item.workspaceId !== invite.workspaceId));
      announce(`Declined the invitation to ${invite.workspaceName}.`);
    } catch (error) {
      announce(safeWorkspaceActionError(error, "The invitation could not be declined. Try again."));
      void refreshPendingInvites(cloudUser);
    }
  }

  async function openGuild(workspaceId: string) {
    if (mode !== "cloud" || !onOpenWorkspace || workspaceId === activeWorkspaceId) return;
    setSyncState("syncing");
    try {
      await runDurableTransition(() => onOpenWorkspace(workspaceId));
    } catch (error) {
      setSyncState("error");
      announce(safeWorkspaceActionError(error, "The selected guild could not be opened. Your current workspace remains active."));
    }
  }

  async function exitAfterSave() {
    try {
      await runDurableTransition(onExit);
    } catch {
      setPersistentSyncError("Forth could not finish leaving this workspace. Your saved cloud data was not changed; try again.");
      setSyncState("error");
    }
  }

  async function retryCloudSync() {
    if (dirtyRef.current || pendingSaveCountRef.current > 0) {
      await flushCloudSave();
      return;
    }
    window.location.reload();
  }

  if (mode === "cloud" && !cloudSnapshotReady) {
    const failed = syncState === "error";
    return (
      <div className="entry-page">
        <main className="entry-status-page" aria-labelledby="cloud-validation-title" aria-busy={!failed}>
          <div className="entry-status-card" role={failed ? "alert" : "status"} aria-live="polite">
            {failed ? <LockKeyhole aria-hidden="true" size={28} /> : <span aria-hidden="true">Loading</span>}
            <p className="eyebrow">Cloud workspace</p>
            <h1 id="cloud-validation-title">
              {failed ? "Editing is safely paused." : "Validating your workspaceâ€¦"}
            </h1>
            <p>
              {failed
                ? persistentSyncError || "Forth could not validate this workspace. No tickets can be edited."
                : "Forth is waiting for the first verified Firestore snapshot. Tickets stay read-only until it arrives."}
            </p>
            {failed && (
              <button className="button button--quiet" onClick={() => void exitAfterSave()}>
                Sign out safely
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell" aria-busy={transitionBusy || undefined} inert={transitionBusy || undefined}>
      <aside className="side-rail">
        <button className="brand" onClick={() => setView("today")} aria-label="Forth home">
          <BrandMark />
          <span className="brand-word">Forth</span>
        </button>

        <nav className="rail-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "rail-link is-active" : "rail-link"}
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.7} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="rail-projects">
          <p className="eyebrow">Active campaigns</p>
          {state.projects.map((project) => (
            <button
              key={project.id}
              className={activeProject.id === project.id ? "project-link is-active" : "project-link"}
              onClick={() => {
                setActiveProjectId(project.id);
                setView("board");
              }}
            >
              <span className={`project-dot project-dot--${project.color}`} />
              <span>{project.title}</span>
            </button>
          ))}
          <button className="project-link project-link--new" onClick={openCampaignDialog}>
            <Plus size={13} /> <span>New campaign</span>
          </button>
        </div>

        <div className="rail-foot">
          <div className="rail-sprite" aria-hidden="true">
            <Image src="/sprites/code-squire.png" alt="" width={54} height={54} unoptimized />
          </div>
          <span className="rail-foot-copy">Code guild<br />camp online</span>
        </div>
      </aside>

      <header className="mobile-header">
        <button className="brand brand--mobile" onClick={() => setView("today")} aria-label="Forth home">
          <BrandMark compact />
          <span className="brand-word">Forth</span>
        </button>
        <EnvironmentBadge mode={mode} syncState={syncState} />
      </header>

      <main className="main-canvas">
        <header className="page-header">
          <div>
            <p className="dateline" suppressHydrationWarning>
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(displayDate)}
            </p>
            <h1>{title}</h1>
          </div>
          <div className="desktop-actions">
            <EnvironmentBadge mode={mode} syncState={syncState} />
            {view !== "settings" && (
              <button className="button button--primary" onClick={openAddDialog}>
                <Plus size={17} /> New quest
              </button>
            )}
          </div>
        </header>

        {persistentSyncError && (
          <div className="entry-error" role="alert">
            <LockKeyhole aria-hidden="true" size={20} />
            <div>
              <strong>Cloud save needs attention</strong>
              <p>{persistentSyncError}</p>
              <button className="entry-text-action" onClick={() => void retryCloudSync()}>
                Retry cloud sync
              </button>
            </div>
          </div>
        )}

        {mode === "demo" && demoStorageWarning && (
          <div className="entry-error" role="status">
            <LockKeyhole aria-hidden="true" size={20} />
            <div>
              <strong>Demo changes are temporary</strong>
              <p>{demoStorageWarning}</p>
            </div>
          </div>
        )}

        {view === "today" && (
          <TodayView
            state={state}
            activeProject={activeProject}
            focusTasks={focusTasks}
            plannedWeight={plannedWeight}
            capacity={capacity}
            now={displayDate}
            useUtc={!hydrated}
            temporalReady={hydrated}
            onSetPace={(pace) => dispatch({ type: "SET_PACE", pace })}
            onSetStatus={setStatus}
            onOpenAdd={openAddDialog}
            onEdit={openEditDialog}
            onDelete={deleteTask}
            onGoToBoard={() => setView("board")}
          />
        )}
        {view === "board" && (
          <BoardView
            state={state}
            activeProject={activeProject}
            onSelectProject={setActiveProjectId}
            onSetStatus={setStatus}
            onToggleFocus={(taskId) => {
              const before = getFocusTasks(state).length;
              const task = state.tasks.find((item) => item.id === taskId);
              dispatch({ type: "TOGGLE_FOCUS", taskId });
              if (task && !task.isFocus && before >= 3) {
                announce("Today’s quest pouch is full. Ship or remove one first.");
              } else if (task) {
                announce(task.isFocus ? "Removed from today." : "Added to today.");
              }
            }}
            onOpenAdd={openAddDialog}
            onEdit={openEditDialog}
            onDelete={deleteTask}
          />
        )}
        {view === "proof" && <ProofView state={state} onEdit={openEditDialog} onDelete={deleteTask} />}
        {view === "settings" && (
          <SettingsView
            mode={mode}
            onReset={resetDemo}
            user={cloudUser}
            syncState={syncState}
            activeGuild={activeGuild}
            guilds={initialGuilds}
            onSelectGuild={(workspaceId) => void openGuild(workspaceId)}
            onCreateGuild={createGuild}
            onInviteGuildmate={inviteGuildmate}
            onJoinGuild={joinGuild}
            sentInvites={sentInvites}
            onCancelInvite={cancelInvite}
            pendingInvites={pendingInvites}
            inviteStatus={inviteStatus}
            onAcceptInvite={acceptPendingInvite}
            onDeclineInvite={declinePendingInvite}
            onRetryInvites={() => {
              if (cloudUser) void refreshPendingInvites(cloudUser);
            }}
            onOpenCampaign={openCampaignDialog}
            onExit={exitAfterSave}
            onShowGuide={openWelcome}
          />
        )}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={view === item.id ? "mobile-nav-link is-active" : "mobile-nav-link"}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{item.id === "board" ? "Map" : item.label}</span>
            </button>
          );
        })}
      </nav>

      <AddTaskDialog
        key={`${activeProject.id}-${focusTasks.length < 3}`}
        dialogRef={dialogRef}
        projects={state.projects}
        activeProjectId={activeProject.id}
        canFocus={focusTasks.length < 3}
        assignees={Array.from(new Set(state.tasks.map((task) => task.assignee)))}
        onSubmit={(input) => {
          dispatch({ type: "ADD_TASK", task: createTask(input) });
          dialogRef.current?.close();
          announce(`Quest logged: ${input.title.trim()}`);
        }}
      />

      <EditTaskDialog
        key={editingTask?.id ?? "no-edit"}
        dialogRef={editDialogRef}
        task={editingTask}
        projects={state.projects}
        assignees={Array.from(new Set(state.tasks.map((task) => task.assignee)))}
        canFocus={Boolean(editingTask?.isFocus) || focusTasks.length < 3}
        onClose={() => setEditingTask(null)}
        onSubmit={(input) => {
          if (!editingTask) return;
          if (input.status !== editingTask.status) {
            dispatch({ type: "SET_STATUS", taskId: editingTask.id, status: input.status });
          }
          dispatch({
            type: "UPDATE_TASK",
            taskId: editingTask.id,
            changes: {
              title: input.title.trim(),
              description: input.description.trim(),
              projectId: input.projectId,
              priority: input.priority,
              dueDate: input.dueDate || undefined,
              meaning: input.meaning.trim(),
              weight: input.weight,
              assignee: input.assignee.trim(),
              isFocus: input.status === "done" ? false : input.isFocus,
            },
          });
          editDialogRef.current?.close();
          announce(`Quest revised: ${input.title.trim()}`);
        }}
      />

      <AddCampaignDialog
        dialogRef={campaignDialogRef}
        onSubmit={(input) => {
          const campaign = createProject(input);
          dispatch({ type: "ADD_PROJECT", project: campaign });
          setActiveProjectId(campaign.id);
          campaignDialogRef.current?.close();
          setView("board");
          announce(`Campaign chartered: ${campaign.title}.`);
        }}
      />

      <WelcomeDialog mode={mode} dialogRef={welcomeDialogRef} onClose={markWelcomeSeen} />

      <div className={toast ? "toast is-visible" : "toast"} role="status" aria-live="polite">
        <Check size={16} />
        <span>{toast}</span>
      </div>
    </div>
  );
}

function EnvironmentBadge({ mode, syncState }: { mode: "demo" | "cloud"; syncState: SyncState }) {
  const label = mode === "demo"
    ? "Disposable demo - this device only"
    : syncState === "synced"
      ? "Cloud workspace - saved"
      : syncState === "syncing"
        ? "Cloud workspace - syncing"
        : "Cloud workspace - sync error";
  return (
    <span className={mode === "cloud" && syncState !== "error" ? "env-badge is-connected" : "env-badge"}>
      <span aria-hidden="true" /> {label}
    </span>
  );
}

function dueLabel(entry: DueSoonEntry): string {
  if (entry.category === "due-today") return "Due today";
  if (entry.category === "overdue") {
    const days = Math.abs(entry.daysUntilDue);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  return `Due in ${entry.daysUntilDue} day${entry.daysUntilDue === 1 ? "" : "s"}`;
}

function TodayView({
  state,
  activeProject,
  focusTasks,
  plannedWeight,
  capacity,
  now,
  useUtc,
  temporalReady,
  onSetPace,
  onSetStatus,
  onOpenAdd,
  onEdit,
  onDelete,
  onGoToBoard,
}: {
  state: WorkspaceState;
  activeProject: Project;
  focusTasks: Task[];
  plannedWeight: number;
  capacity: number;
  now: Date;
  useUtc: boolean;
  temporalReady: boolean;
  onSetPace: (pace: Pace) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onOpenAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onGoToBoard: () => void;
}) {
  const [showAllDue, setShowAllDue] = useState(false);
  const momentum = getMomentumDays(state.tasks, now, useUtc);
  const maxMomentum = Math.max(...momentum.map((day) => day.weight), 1);
  const progress = getProjectProgress(state, activeProject.id);
  const completedToday = momentum[momentum.length - 1]?.weight ?? 0;
  const nearing = temporalReady ? getDueSoonTasks(state, now) : [];
  const visibleNearing = showAllDue ? nearing : nearing.slice(0, DUE_PANEL_LIMIT);
  const hiddenNearingCount = nearing.length - visibleNearing.length;
  const overPlan = plannedWeight > capacity;
  const totalGold = state.tasks.filter((task) => task.status === "done").reduce((sum, task) => sum + task.weight * 10, 0);
  const level = Math.floor(totalGold / 100) + 1;
  const levelProgress = totalGold % 100;

  return (
    <div className="today-layout">
      <div className="today-main">
        <section className="adventurer-hud" aria-label="Guild progress">
          <div className="pixel-portrait" aria-hidden="true">
            <Image src="/sprites/code-squire.png" alt="" width={76} height={76} unoptimized priority />
          </div>
          <div className="adventurer-copy">
            <p className="eyebrow">Engineer class · Rank {level}</p>
            <h2>Code Squire</h2>
            <div className="xp-track" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelProgress}><span style={{ width: `${levelProgress}%` }} /></div>
            <small>{100 - levelProgress} craft XP until the next rank</small>
          </div>
          <dl className="reward-stats">
            <div><dt><Coins size={14} /> Gold</dt><dd>{totalGold}</dd></div>
            <div><dt><ScrollText size={14} /> Quests</dt><dd>{state.tasks.filter((task) => task.status === "done").length}</dd></div>
          </dl>
        </section>
        <section className="pace-panel" aria-labelledby="pace-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">I · Choose provisions</p>
              <h2 id="pace-title">How far can the party travel?</h2>
            </div>
            <span className="capacity-number"><strong>{plannedWeight}</strong> / {capacity} energy</span>
          </div>
          <div className="pace-row">
            <div className="pace-options" role="radiogroup" aria-label="Today's pace">
              {(Object.keys(PACE_COPY) as Pace[]).map((pace) => (
                <button
                  key={pace}
                  className={state.pace === pace ? "pace-option is-active" : "pace-option"}
                  onClick={() => onSetPace(pace)}
                  role="radio"
                  aria-checked={state.pace === pace}
                >
                  <span className="pace-mark"><i /><i /><i /></span>
                  <span><strong>{PACE_COPY[pace].label}</strong><small>{PACE_COPY[pace].hint}</small></span>
                </button>
              ))}
            </div>
            <div className="capacity-wrap">
              <div
                className="capacity-track"
                role="progressbar"
                aria-label="Planned capacity"
                aria-valuemin={0}
                aria-valuemax={capacity}
                aria-valuenow={plannedWeight}
              >
                <span style={{ width: `${Math.min((plannedWeight / capacity) * 100, 100)}%` }} />
              </div>
              <p className={overPlan ? "capacity-note is-over" : "capacity-note"}>
                {overPlan
                  ? "The party is over-encumbered. Remove a quest or choose a larger expedition."
                  : `${capacity - plannedWeight} energy remain. Keep some provisions for the unexpected.`}
              </p>
            </div>
          </div>
        </section>

        <section className="focus-panel" aria-labelledby="focus-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">II · Ready the party</p>
              <h2 id="focus-title">Today’s three quests</h2>
            </div>
            <button className="text-button" onClick={onGoToBoard}>Open realm map <ArrowRight size={15} /></button>
          </div>

          <div className="focus-list">
            {focusTasks.map((task, index) => (
              <FocusTaskRow
                key={task.id}
                task={task}
                project={state.projects.find((project) => project.id === task.projectId)!}
                index={index}
                onSetStatus={onSetStatus}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {focusTasks.length < 3 && (
              <button className="empty-focus" onClick={onOpenAdd}>
                <Plus size={18} />
                <span><strong>Take another quest</strong><small>Only three may travel in the active party.</small></span>
              </button>
            )}
          </div>
        </section>

        {nearing.length > 0 && (
          <section className="nearing-panel" aria-labelledby="nearing-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mind the horizon</p>
                <h2 id="nearing-title">Due soon and overdue</h2>
              </div>
              <span className="quiet-stat">
                Across all campaigns · <strong>{nearing.length}</strong> {nearing.length === 1 ? "quest" : "quests"}
              </span>
            </div>
            <ul className="nearing-list" id="due-task-summary">
              {visibleNearing.map((entry) => {
                const project = state.projects.find((item) => item.id === entry.task.projectId);
                return (
                  <li key={entry.task.id} className={`nearing-row is-${entry.category}`}>
                    <button
                      type="button"
                      className="nearing-main"
                      onClick={() => onEdit(entry.task)}
                      aria-label={`Edit quest ${entry.task.title} — ${dueLabel(entry)}`}
                    >
                      <span className="nearing-dot" aria-hidden="true" />
                      <span className="nearing-copy">
                        <strong>{entry.task.title}</strong>
                        {project && <small>{project.code} · {STATUS_LABELS[entry.task.status]}</small>}
                      </span>
                      <time dateTime={entry.task.dueDate} className={`due-badge is-${entry.category}`}>{dueLabel(entry)}</time>
                    </button>
                  </li>
                );
              })}
            </ul>
            {nearing.length > DUE_PANEL_LIMIT && (
              <button
                type="button"
                className="nearing-view-all"
                aria-controls="due-task-summary"
                aria-expanded={showAllDue}
                onClick={() => setShowAllDue((current) => !current)}
              >
                <span>
                  <strong>{showAllDue ? `Show first ${DUE_PANEL_LIMIT} due quests` : `View all ${nearing.length} due quests`}</strong>
                  <small>{showAllDue ? "Collapse this deadline summary" : `${hiddenNearingCount} more beyond this summary`}</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </section>
        )}

        <section className="momentum-panel" aria-labelledby="momentum-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">III · Read the campaign</p>
              <h2 id="momentum-title">Seven-day expedition</h2>
            </div>
            <span className="quiet-stat"><strong>{completedToday}</strong> effort shipped today</span>
          </div>
          <div className="trail-chart">
            <div className="trail-copy">
              <p>No cursed streaks. No public leaderboard.</p>
              <span>The chronicle simply proves the guild can return and ship.</span>
            </div>
            <div className="trail-bars" aria-label="Completed effort over the last seven days">
              {momentum.map((day, index) => (
                <div className="trail-day" key={day.date}>
                  <span className="trail-value">{day.weight || "·"}</span>
                  <span className="trail-bar-wrap">
                    <i style={{ height: `${Math.max((day.weight / maxMomentum) * 100, 8)}%` }} />
                  </span>
                  <small>{index === 6 ? "Now" : day.label}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <aside className="context-rail">
        <section className="signal-card">
          <div className="card-kicker"><Target size={16} /><span>Campaign charter</span></div>
          <p className="project-code">{activeProject.code} · QUESTING</p>
          <h2>{activeProject.title}</h2>
          <p className="outcome-copy">{activeProject.outcome}</p>
          <div className="project-progress">
            <div><span>Map cleared</span><strong>{progress}%</strong></div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${activeProject.title} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="target-date">
            Target {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(activeProject.targetDate))}
          </p>
        </section>

        <section className="field-note-card">
          <div className="card-kicker"><Leaf size={16} /><span>Tavern dispatch</span></div>
          <blockquote>“The build failed at the gate, not in production. The wards held.”</blockquote>
          <div className="note-author"><span>MM</span><p><strong>Maya M.</strong><small>Platform · 18 min ago</small></p></div>
        </section>

        <section className="principle-card">
          <BrandMark compact />
          <p>Guild oath · II</p>
          <strong>Ship proof, share context, leave no engineer cursed by hidden state.</strong>
        </section>
      </aside>
    </div>
  );
}

function FocusTaskRow({
  task,
  project,
  index,
  onSetStatus,
  onEdit,
  onDelete,
}: {
  task: Task;
  project: Project;
  index: number;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <article className={`focus-task focus-task--${task.status}`}>
      <button className="land-button" onClick={() => onSetStatus(task.id, "done")} aria-label={`Ship ${task.title}`}>
        <Check size={18} />
      </button>
      <span className="task-index">0{index + 1}</span>
      <div className="task-body">
        <div className="task-meta">
          <span className={`project-tag project-tag--${project.color}`}>{project.code}</span>
          <span>{task.weight} energy</span>
          <span>{STATUS_LABELS[task.status]}</span>
        </div>
        <h3>{task.title}</h3>
        <p>{task.meaning}</p>
        <div className="task-inline-actions">
          <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={13} /> Edit</button>
          <button type="button" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={13} /> Delete</button>
        </div>
      </div>
      {task.status === "ready" && (
        <button className="task-state-button" onClick={() => onSetStatus(task.id, "moving")}>
          Begin <ArrowRight size={15} />
        </button>
      )}
      {task.status === "moving" && (
        <button className="task-state-button" onClick={() => onSetStatus(task.id, "paused")}>
          <CirclePause size={15} /> Pause
        </button>
      )}
      {task.status === "paused" && (
        <button className="task-state-button" onClick={() => onSetStatus(task.id, "ready")}>
          Make ready <ArrowRight size={15} />
        </button>
      )}
    </article>
  );
}

function BoardView({
  state,
  activeProject,
  onSelectProject,
  onSetStatus,
  onToggleFocus,
  onOpenAdd,
  onEdit,
  onDelete,
}: {
  state: WorkspaceState;
  activeProject: Project;
  onSelectProject: (id: string) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onToggleFocus: (taskId: string) => void;
  onOpenAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const statuses: TaskStatus[] = ["ready", "moving", "paused", "done"];
  const [query, setQuery] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const startDragging = (event: DragEvent<HTMLElement>, task: Task) => {
    if ((event.target as HTMLElement).closest("button")) {
      event.preventDefault();
      return;
    }

    setDraggedTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-forth-task", task.id);
    event.dataTransfer.setData("text/plain", task.id);
  };

  const stopDragging = () => {
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  const dropInProvince = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("application/x-forth-task") || draggedTaskId;
    const task = state.tasks.find((candidate) => candidate.id === taskId);

    if (task && task.status !== status) onSetStatus(task.id, status);
    stopDragging();
  };
  return (
    <div className="board-view">
      <div className="project-tabs" role="tablist" aria-label="Projects">
        {state.projects.map((project) => (
          <button
            key={project.id}
            className={activeProject.id === project.id ? "project-tab is-active" : "project-tab"}
            onClick={() => onSelectProject(project.id)}
            role="tab"
            aria-selected={activeProject.id === project.id}
          >
            <span className={`project-dot project-dot--${project.color}`} />
            {project.title}
          </button>
        ))}
      </div>

      <section className="board-intro">
        <div>
          <p className="eyebrow">{activeProject.code} · Campaign objective</p>
          <h2>{activeProject.outcome}</h2>
        </div>
        <div className="board-progress">
          <strong>{getProjectProgress(state, activeProject.id)}%</strong>
          <span>realm cleared</span>
        </div>
      </section>

      <div className="quest-tools">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search engineering quests" placeholder="Search quests, runes, and requirements…" />
        <button className="button button--primary" onClick={onOpenAdd}><Plus size={15} /> Inscribe quest</button>
      </div>

      <p className="drag-help" id="kanban-drag-help">
        <GripVertical size={15} aria-hidden="true" />
        Drag a quest between provinces with your cursor. On phone or keyboard, use its move arrows.
      </p>

      <section className="kanban" aria-label={`${activeProject.title} work map`} aria-describedby="kanban-drag-help">
        {statuses.map((status) => {
          const tasks = state.tasks.filter(
            (task) => task.projectId === activeProject.id && task.status === status &&
              `${task.title} ${task.description ?? ""} ${task.meaning}`.toLowerCase().includes(query.toLowerCase()),
          );
          const draggedTask = state.tasks.find((task) => task.id === draggedTaskId);
          const isDropTarget = dragOverStatus === status && draggedTask?.status !== status;
          return (
            <div
              className={`kanban-column kanban-column--${status}${isDropTarget ? " is-drop-target" : ""}`}
              key={status}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverStatus(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverStatus(null);
              }}
              onDrop={(event) => dropInProvince(event, status)}
            >
              <div className="column-head">
                <span>{STATUS_LABELS[status]}</span>
                <strong>{tasks.length}</strong>
              </div>
              <div className="column-tasks">
                {tasks.map((task) => (
                  <BoardTaskCard
                    key={task.id}
                    task={task}
                    onSetStatus={onSetStatus}
                    onToggleFocus={onToggleFocus}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isDragging={draggedTaskId === task.id}
                    onDragStart={(event) => startDragging(event, task)}
                    onDragEnd={stopDragging}
                  />
                ))}
                {tasks.length === 0 && (
                  <div className="column-empty">
                    <MapIcon size={20} />
                    <span>No quests in this province.</span>
                  </div>
                )}
                {status === "ready" && (
                  <button className="column-add" onClick={onOpenAdd}><Plus size={15} /> Inscribe quest</button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function BoardTaskCard({
  task,
  onSetStatus,
  onToggleFocus,
  onEdit,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onToggleFocus: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isDragging: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const previous: Partial<Record<TaskStatus, TaskStatus>> = {
    moving: "ready",
    paused: "moving",
    done: "moving",
  };
  const next: Partial<Record<TaskStatus, TaskStatus>> = {
    ready: "moving",
    moving: "done",
    paused: "ready",
  };

  return (
    <article
      className={`board-task${isDragging ? " is-dragging" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="board-task-top">
        <span className="board-task-drag-meta"><GripVertical size={13} aria-hidden="true" /> {task.weight} energy</span>
        {task.status !== "done" && (
          <button
            className={task.isFocus ? "bookmark-button is-active" : "bookmark-button"}
            onClick={() => onToggleFocus(task.id)}
            aria-label={task.isFocus ? `Remove ${task.title} from today` : `Add ${task.title} to today`}
            title={task.isFocus ? "In today's three" : "Add to today's three"}
          >
            <Bookmark size={15} fill={task.isFocus ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p className="ticket-description">{task.description}</p>}
      <p>{task.meaning}</p>
      <div className="ticket-facts">
        <span className={`priority priority--${task.priority ?? "medium"}`}>{task.priority ?? "medium"}</span>
        {task.dueDate && <time dateTime={task.dueDate}>Due {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${task.dueDate}T12:00:00`))}</time>}
      </div>
      <div className="board-task-assignee"><span>{task.assignee.charAt(0)}</span>{task.assignee}</div>
      <div className="board-task-actions">
        <button onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit ticket"><Pencil size={13} /></button>
        <button onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={13} /></button>
        {previous[task.status] && task.status !== "done" && (
          <button onClick={() => onSetStatus(task.id, previous[task.status]!)} aria-label={`Move ${task.title} backward`}>
            <ArrowLeft size={14} />
          </button>
        )}
        {next[task.status] && (
          <button className="move-forward" onClick={() => onSetStatus(task.id, next[task.status]!)}>
            {task.status === "moving" ? "Ship" : task.status === "paused" ? "Return" : "Forge"}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

function ProofView({
  state,
  onEdit,
  onDelete,
}: {
  state: WorkspaceState;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const completed = useMemo(
    () =>
      state.tasks
        .filter((task) => task.status === "done")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [state.tasks],
  );
  const totalWeight = completed.reduce((sum, task) => sum + task.weight, 0);
  const contributors = new Set(completed.map((task) => task.assignee)).size;

  return (
    <div className="proof-view">
      <section className="proof-summary">
        <div className="proof-symbol"><BrandMark /></div>
        <div>
          <p className="eyebrow">Guild chronicle</p>
          <h2>Every shipped quest becomes part of the record.</h2>
          <p>The chronicle keeps the ticket, its purpose, and its builder together—evidence of engineering progress without a public score.</p>
        </div>
        <dl>
          <div><dt>Shipped</dt><dd>{completed.length}</dd></div>
          <div><dt>Energy</dt><dd>{totalWeight}</dd></div>
          <div><dt>Guildmates</dt><dd>{contributors}</dd></div>
        </dl>
      </section>

      <section className="proof-ledger" aria-labelledby="ledger-title">
        <div className="ledger-head">
          <p className="eyebrow">Newest inscription first</p>
          <h2 id="ledger-title">Release chronicle</h2>
        </div>
        {completed.length === 0 ? (
          <div className="proof-empty"><BrandMark /><h3>The first inscription awaits.</h3><p>Ship one engineering quest and its record will live here.</p></div>
        ) : (
          <div className="ledger-list">
            {completed.map((task, index) => {
              const project = state.projects.find((item) => item.id === task.projectId)!;
              return (
                <article className="ledger-row" key={task.id}>
                  <span className="ledger-number">{String(completed.length - index).padStart(2, "0")}</span>
                  <div className="ledger-date">
                    <strong>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(task.completedAt!))}</strong>
                    <span>{new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(task.completedAt!))}</span>
                  </div>
                  <div className="ledger-body">
                    <span className={`project-tag project-tag--${project.color}`}>{project.code}</span>
                    <h3>{task.title}</h3>
                    <p>{task.meaning}</p>
                  </div>
                  <div className="ledger-person"><span>{task.assignee.charAt(0)}</span><p>{task.assignee}<small>{task.weight} energy</small></p></div>
                  <div className="ledger-actions">
                    <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={14} /></button>
                    <button type="button" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsView({
  mode,
  onReset,
  user,
  syncState,
  activeGuild,
  guilds,
  onSelectGuild,
  onCreateGuild,
  onInviteGuildmate,
  onJoinGuild,
  sentInvites,
  onCancelInvite,
  pendingInvites,
  inviteStatus,
  onAcceptInvite,
  onDeclineInvite,
  onRetryInvites,
  onOpenCampaign,
  onExit,
  onShowGuide,
}: {
  mode: "demo" | "cloud";
  onReset: () => void;
  user?: User;
  syncState: SyncState;
  activeGuild: GuildWorkspace | null;
  guilds: GuildWorkspace[];
  onSelectGuild: (workspaceId: string) => void;
  onCreateGuild: (input: NewGuildInput) => Promise<boolean>;
  onInviteGuildmate: (email: string) => Promise<boolean>;
  onJoinGuild: (workspaceId: string) => Promise<boolean>;
  sentInvites: GuildInviteSummary[];
  onCancelInvite: (email: string) => Promise<void>;
  pendingInvites: PendingGuildInvite[];
  inviteStatus: "idle" | "loading" | "ready" | "error";
  onAcceptInvite: (invite: PendingGuildInvite) => Promise<void>;
  onDeclineInvite: (invite: PendingGuildInvite) => Promise<void>;
  onRetryInvites: () => void;
  onOpenCampaign: () => void;
  onExit: () => Promise<void>;
  onShowGuide: () => void;
}) {
  const syncLabel = syncState === "synced"
    ? "Saved to cloud"
    : syncState === "syncing"
      ? "Syncing with cloud"
      : syncState === "error"
        ? "Cloud sync error"
        : "Demo on this device";

  return (
    <div className="settings-view">
      <section className="settings-intro">
        <p className="eyebrow">Guild hall · Save altar</p>
        <h2>Account wards and cloud runes.</h2>
        <p>{mode === "cloud" ? "This signed-in workspace saves to private cloud storage for authorized guild members." : "This disposable demo stays in this browser and never copies sample tickets into a real account."}</p>
        <button type="button" className="button button--quiet" onClick={onShowGuide} aria-haspopup="dialog">
          <Scroll size={15} /> How Forth works
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><LockKeyhole size={22} /></div>
        <div>
          <p className="eyebrow">Save ward</p>
          <h3>{mode === "cloud" ? `Signed in as ${user?.displayName ?? user?.email ?? "your account"}` : "Disposable local demo"}</h3>
          <p>{mode === "cloud" ? `${syncLabel}. Forth saves this workspace only to its authorized Firestore record.` : "Sample tickets persist on this device only until you reset or clear the demo. They are never uploaded to Firebase."}</p>
          <button className="button button--primary" onClick={() => void onExit()}>
            {mode === "cloud" ? "Sign out" : "Exit demo"}
          </button>
        </div>
        <span className={mode === "cloud" && syncState === "synced" ? "status-stamp is-ready" : "status-stamp"}>{syncLabel}</span>
      </section>

      {mode === "cloud" && user && (
        <PendingInvitesCard
          pendingInvites={pendingInvites}
          inviteStatus={inviteStatus}
          onAcceptInvite={onAcceptInvite}
          onDeclineInvite={onDeclineInvite}
          onRetryInvites={onRetryInvites}
        />
      )}

      {mode === "cloud" && user && (
        <GuildHallCard
          activeGuild={activeGuild}
          guilds={guilds}
          onSelectGuild={onSelectGuild}
          onCreateGuild={onCreateGuild}
          onInviteGuildmate={onInviteGuildmate}
          onJoinGuild={onJoinGuild}
          sentInvites={sentInvites}
          onCancelInvite={onCancelInvite}
          onOpenCampaign={onOpenCampaign}
        />
      )}

      <section className="settings-card">
        <div className="settings-icon"><Target size={22} /></div>
        <div>
          <p className="eyebrow">Guild code</p>
          <h3>What earns renown</h3>
          <ul>
            <li>Shipping meaningful engineering tickets earns gold equal to effort</li>
            <li>Completed quests advance your private guild rank</li>
            <li>The release chronicle preserves the definition of value</li>
            <li>There are no penalties, broken streaks, or public rankings</li>
          </ul>
        </div>
      </section>

      {mode === "demo" && (
        <section className="reset-card">
          <div><p className="eyebrow">Demo controls</p><h3>Restore the sample campaign</h3><p>This replaces disposable demo data in this browser only. No signed-in workspace is changed.</p></div>
          <button className="button button--danger" onClick={onReset}><RotateCcw size={16} /> Restore demo sample</button>
        </section>
      )}
    </div>
  );
}

function PendingInvitesCard({
  pendingInvites,
  inviteStatus,
  onAcceptInvite,
  onDeclineInvite,
  onRetryInvites,
}: {
  pendingInvites: PendingGuildInvite[];
  inviteStatus: "idle" | "loading" | "ready" | "error";
  onAcceptInvite: (invite: PendingGuildInvite) => Promise<void>;
  onDeclineInvite: (invite: PendingGuildInvite) => Promise<void>;
  onRetryInvites: () => void;
}) {
  const [busyWorkspaceId, setBusyWorkspaceId] = useState<string | null>(null);

  async function act(invite: PendingGuildInvite, action: (invite: PendingGuildInvite) => Promise<void>) {
    setBusyWorkspaceId(invite.workspaceId);
    try {
      await action(invite);
    } finally {
      setBusyWorkspaceId(null);
    }
  }

  return (
    <section className="guild-card">
      <div className="settings-icon"><ScrollText size={22} /></div>
      <div>
        <p className="eyebrow">Guild summons</p>
        <h3>Pending invitations</h3>
        {(inviteStatus === "idle" || inviteStatus === "loading") && (
          <p>Checking for guild invitations addressed to your account email…</p>
        )}
        {inviteStatus === "error" && (
          <>
            <p>Invitations could not be loaded right now. Your guilds are unaffected — try again in a moment.</p>
            <div className="guild-actions">
              <button type="button" className="button button--quiet" onClick={onRetryInvites}>
                <RotateCcw size={15} /> Check again
              </button>
            </div>
          </>
        )}
        {inviteStatus === "ready" && pendingInvites.length === 0 && (
          <>
            <p>No invitations are waiting for you. When a guild leader invites your account email, the summons appears here.</p>
            <div className="guild-actions">
              <button type="button" className="button button--quiet" onClick={onRetryInvites}>
                <RotateCcw size={15} /> Check again
              </button>
            </div>
          </>
        )}
        {inviteStatus === "ready" && pendingInvites.length > 0 && (
          <div className="invite-list">
            {pendingInvites.map((invite) => (
              <div className="invite-row" key={invite.workspaceId}>
                <div>
                  <strong>{invite.workspaceName}</strong>
                  <small>
                    Invited by {invite.invitedBy}
                    {invite.expired ? " · This invitation has expired" : ""}
                  </small>
                </div>
                <div className="guild-actions">
                  {!invite.expired && (
                    <button
                      type="button"
                      className="button button--primary"
                      disabled={busyWorkspaceId === invite.workspaceId}
                      onClick={() => void act(invite, onAcceptInvite)}
                    >
                      <Check size={15} /> Accept
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button--quiet"
                    disabled={busyWorkspaceId === invite.workspaceId}
                    onClick={() => void act(invite, onDeclineInvite)}
                  >
                    <X size={15} /> {invite.expired ? "Dismiss" : "Decline"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GuildHallCard({
  activeGuild,
  guilds,
  onSelectGuild,
  onCreateGuild,
  onInviteGuildmate,
  onJoinGuild,
  sentInvites,
  onCancelInvite,
  onOpenCampaign,
}: {
  activeGuild: GuildWorkspace | null;
  guilds: GuildWorkspace[];
  onSelectGuild: (workspaceId: string) => void;
  onCreateGuild: (input: NewGuildInput) => Promise<boolean>;
  onInviteGuildmate: (email: string) => Promise<boolean>;
  onJoinGuild: (workspaceId: string) => Promise<boolean>;
  sentInvites: GuildInviteSummary[];
  onCancelInvite: (email: string) => Promise<void>;
  onOpenCampaign: () => void;
}) {
  const [guildName, setGuildName] = useState("");
  const [firstCampaignTitle, setFirstCampaignTitle] = useState("");
  const [firstCampaignOutcome, setFirstCampaignOutcome] = useState("");
  const [firstCampaignTargetDate, setFirstCampaignTargetDate] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [guildCode, setGuildCode] = useState("");
  const [cancelingEmail, setCancelingEmail] = useState<string | null>(null);

  async function cancel(email: string) {
    setCancelingEmail(email);
    try {
      await onCancelInvite(email);
    } finally {
      setCancelingEmail(null);
    }
  }

  return (
    <section className="guild-card">
      <div className="settings-icon"><UserPlus size={22} /></div>
      <div>
        <p className="eyebrow">Guild roster</p>
        <h3>Build campaigns with real guildmates.</h3>
        <p>Invite a teammate by the account email they will use for Forth. After they sign in, the invitation appears in their own Guild Hall under Pending invitations. The guild code below is a backup path if that panel is unavailable.</p>
        {activeGuild?.role === "owner" && <p className="guild-code">Guild code: <code>{activeGuild.id}</code></p>}

        <label className="field guild-field">
          <span>Active guild</span>
          <select value={activeGuild?.id ?? ""} onChange={(event) => onSelectGuild(event.target.value)}>
            {guilds.map((guild) => <option value={guild.id} key={guild.id}>{guild.name} · {guild.role}</option>)}
          </select>
        </label>

        <div className="guild-actions">
          <button type="button" className="button button--quiet" onClick={onOpenCampaign}><Scroll size={15} /> New campaign</button>
        </div>

        <form className="guild-inline-form" onSubmit={(event) => {
          event.preventDefault();
          if (!guildName.trim() || !firstCampaignTitle.trim() || !firstCampaignOutcome.trim() || !firstCampaignTargetDate) return;
          void onCreateGuild({
            name: guildName,
            campaignTitle: firstCampaignTitle,
            outcome: firstCampaignOutcome,
            targetDate: firstCampaignTargetDate,
          }).then((created) => {
            if (!created) return;
            setGuildName("");
            setFirstCampaignTitle("");
            setFirstCampaignOutcome("");
            setFirstCampaignTargetDate("");
          });
        }}>
          <label className="field"><span>New workspace name</span><input value={guildName} onChange={(event) => setGuildName(event.target.value)} placeholder="Platform guild" maxLength={60} required /></label>
          <label className="field"><span>First campaign (project)</span><input value={firstCampaignTitle} onChange={(event) => setFirstCampaignTitle(event.target.value)} placeholder="Ship cohort ticketing" maxLength={80} required /></label>
          <label className="field"><span>Campaign outcome</span><textarea value={firstCampaignOutcome} onChange={(event) => setFirstCampaignOutcome(event.target.value)} placeholder="What should be true when this project succeeds?" maxLength={240} rows={3} required /></label>
          <label className="field"><span>Campaign target date</span><input type="date" value={firstCampaignTargetDate} onChange={(event) => setFirstCampaignTargetDate(event.target.value)} required /></label>
          <button className="button button--quiet" type="submit">Found guild</button>
        </form>

        {activeGuild?.role === "owner" && (
          <form className="guild-inline-form" onSubmit={(event) => {
            event.preventDefault();
            if (!inviteEmail.trim()) return;
            void onInviteGuildmate(inviteEmail).then((sent) => {
              if (sent) setInviteEmail("");
            });
          }}>
            <label className="field"><span>Invite a guildmate</span><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@example.com" /></label>
            <button className="button button--primary" type="submit">Send invite</button>
          </form>
        )}

        {activeGuild?.role === "owner" && sentInvites.length > 0 && (
          <div className="invite-list">
            <p className="eyebrow">Invitations sent</p>
            {sentInvites.map((invite) => (
              <div className="invite-row" key={invite.email}>
                <div>
                  <strong>{invite.email}</strong>
                  <small>{invite.expired ? "Expired — awaiting cleanup" : "Pending · awaiting sign-in"}</small>
                </div>
                <button
                  type="button"
                  className="button button--quiet"
                  disabled={cancelingEmail === invite.email}
                  onClick={() => void cancel(invite.email)}
                >
                  <X size={15} /> Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        <form className="guild-inline-form" onSubmit={(event) => {
          event.preventDefault();
          if (!guildCode.trim()) return;
          void onJoinGuild(guildCode).then((joined) => {
            if (joined) setGuildCode("");
          });
        }}>
          <label className="field"><span>Join with a guild code</span><input value={guildCode} onChange={(event) => setGuildCode(event.target.value)} placeholder="guild-…" /></label>
          <button className="button button--primary" type="submit">Join guild</button>
        </form>
      </div>
    </section>
  );
}

const COMMON_WELCOME_STEPS = [
  {
    title: "Choose your pace (daily capacity)",
    body: "Scout, Venture, or Raid sets a realistic effort budget for today. It never grades you or creates a public score.",
  },
  {
    title: "Add quests (tickets)",
    body: "Create a ticket with its campaign, purpose, assignee, priority, due date, and effort. Keep up to three unfinished quests in Today.",
  },
  {
    title: "Use the Realm Map (Kanban board)",
    body: "Drag with a mouse, or use Move controls with keyboard or touch, to send tickets through Quest Log (Ready), In Forge (In progress), Camped (Paused), and Shipped (Done).",
  },
  {
    title: "Review the Chronicle (completed work)",
    body: "Shipped quests remain visible as proof of progress. There are no public rankings, streak penalties, or random rewards.",
  },
];

function getWelcomeSteps(mode: "demo" | "cloud") {
  const entryStep = mode === "cloud"
    ? {
        title: "Private cloud workspace",
        body: "You signed in before tickets loaded. Forth shows only guild workspaces that your account is authorized to access.",
      }
    : {
        title: "Disposable browser demo",
        body: "These are sample tickets stored only in this browser. They never sync to Firebase or enter your real workspace.",
      };
  return [entryStep, ...COMMON_WELCOME_STEPS];
}

function WelcomeDialog({
  mode,
  dialogRef,
  onClose,
}: {
  mode: "demo" | "cloud";
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  const steps = getWelcomeSteps(mode);
  return (
    <dialog
      className="move-dialog welcome-dialog"
      ref={dialogRef}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="welcome-body">
        <header className="dialog-head">
          <div>
            <p className="eyebrow">New adventurer</p>
            <h2 id="welcome-title">Welcome to Forth</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close welcome guide"
          >
            <X size={19} />
          </button>
        </header>

        <p className="welcome-lead" id="welcome-description">
          {mode === "cloud"
            ? "Your private project workspace is ready. Here is the five-step path through Forth."
            : "This safe practice workspace contains sample work. Here is the five-step path through Forth."}
        </p>

        <ol className="welcome-steps">
          {steps.map((step, index) => (
            <li className="welcome-step" key={step.title}>
              <span className="welcome-step-num" aria-hidden="true">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <footer className="dialog-foot">
          <button type="button" className="button button--quiet" onClick={() => dialogRef.current?.close()}>
            Close guide
          </button>
          <button type="button" className="button button--primary" autoFocus onClick={() => dialogRef.current?.close()}>
            Start planning <ArrowRight size={16} />
          </button>
        </footer>
      </div>
    </dialog>
  );
}

function AddCampaignDialog({
  dialogRef,
  onSubmit,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onSubmit: (input: { title: string; code: string; outcome: string; targetDate: string; color: Project["color"] }) => void;
}) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState<Project["color"]>("moss");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !outcome.trim() || !targetDate) return;
    onSubmit({ title, code, outcome, targetDate, color });
    setTitle(""); setCode(""); setOutcome(""); setTargetDate(""); setColor("moss");
  }

  return (
    <dialog className="move-dialog" ref={dialogRef} onClick={(event) => {
      if (event.target === dialogRef.current) dialogRef.current?.close();
    }}>
      <form onSubmit={submit}>
        <header className="dialog-head"><div><p className="eyebrow">Campaign charter</p><h2>Begin a new engineering campaign</h2></div><button type="button" className="icon-button" onClick={() => dialogRef.current?.close()} aria-label="Close campaign dialog"><X size={19} /></button></header>
        <label className="field"><span>Campaign name</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Harden the release gate" required maxLength={60} autoFocus /></label>
        <label className="field"><span>Campaign code</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="RELEASE" maxLength={8} /></label>
        <label className="field"><span>Outcome</span><textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="What will be true when this campaign lands?" required maxLength={180} rows={3} /></label>
        <div className="field-pair"><label className="field"><span>Target date</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required /></label><label className="field"><span>Heraldic color</span><select value={color} onChange={(event) => setColor(event.target.value as Project["color"])}><option value="moss">Moss</option><option value="clay">Clay</option><option value="slate">Slate</option></select></label></div>
        <footer className="dialog-foot"><button type="button" className="button button--quiet" onClick={() => dialogRef.current?.close()}>Cancel</button><button className="button button--primary" type="submit">Charter campaign <Scroll size={16} /></button></footer>
      </form>
    </dialog>
  );
}

function AddTaskDialog({
  dialogRef,
  projects,
  activeProjectId,
  canFocus,
  assignees,
  onSubmit,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  projects: Project[];
  activeProjectId: string;
  canFocus: boolean;
  assignees: string[];
  onSubmit: (input: {
    title: string;
    projectId: string;
    meaning: string;
    weight: 1 | 2 | 3;
    isFocus: boolean;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    assignee?: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(activeProjectId);
  const [meaning, setMeaning] = useState("");
  const [weight, setWeight] = useState<1 | 2 | 3>(2);
  const [isFocus, setIsFocus] = useState(canFocus);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("Calvin");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !projectId) return;
    onSubmit({ title, projectId, meaning, weight, isFocus, description, priority, dueDate, assignee });
    setTitle("");
    setMeaning("");
    setWeight(2);
    setIsFocus(canFocus);
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setAssignee("Calvin");
  }

  return (
    <dialog className="move-dialog" ref={dialogRef} onClick={(event) => {
      if (event.target === dialogRef.current) dialogRef.current?.close();
    }}>
      <form onSubmit={submit}>
        <header className="dialog-head">
          <div><p className="eyebrow">Guild registrar</p><h2>Inscribe an engineering quest</h2></div>
          <button type="button" className="icon-button" onClick={() => dialogRef.current?.close()} aria-label="Close dialog"><X size={19} /></button>
        </header>

        <label className="field">
          <span>Quest title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={90} autoFocus placeholder="Add retry behavior to failed sync writes" />
          <small>Lead with an engineering verb and expose the finish line.</small>
        </label>

        <label className="field">
          <span>Description <i>optional</i></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="Context, constraints, acceptance criteria, or definition of done" />
        </label>

        <div className="field-pair">
          <label className="field">
            <span>Campaign</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
              {projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Assigned guildmate</span>
            <input value={assignee} onChange={(event) => setAssignee(event.target.value)} required maxLength={60} list="new-ticket-assignees" placeholder="Calvin" />
            <datalist id="new-ticket-assignees">{assignees.map((name) => <option value={name} key={name} />)}</datalist>
          </label>
        </div>

        <div className="field-pair">
          <label className="field">
            <span>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
          <label className="field">
            <span>Due date <i>optional</i></span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Why it matters <i>optional</i></span>
          <textarea value={meaning} onChange={(event) => setMeaning(event.target.value)} maxLength={180} rows={3} placeholder="Connect this quest to the campaign objective" />
        </label>

        <fieldset className="weight-field">
          <legend>Energy cost</legend>
          <div>
            {([1, 2, 3] as const).map((item) => (
              <button type="button" className={weight === item ? "weight-option is-active" : "weight-option"} onClick={() => setWeight(item)} key={item}>
                <span>{"◆".repeat(item)}</span><strong>{item === 1 ? "Spark" : item === 2 ? "Forge" : "Siege"}</strong><small>{item === 1 ? "small patch" : item === 2 ? "focused build" : "deep system work"}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className={canFocus ? "focus-check" : "focus-check is-disabled"}>
          <input type="checkbox" checked={isFocus} onChange={(event) => setIsFocus(event.target.checked)} disabled={!canFocus} />
          <span><strong>Add to today’s party</strong><small>{canFocus ? "Keep this quest in the active three." : "Today’s party already holds three quests."}</small></span>
        </label>

        <footer className="dialog-foot">
          <button type="button" className="button button--quiet" onClick={() => dialogRef.current?.close()}>Cancel</button>
          <button className="button button--primary" type="submit">Inscribe quest <Sword size={16} /></button>
        </footer>
      </form>
    </dialog>
  );
}

type TaskEditInput = {
  title: string;
  projectId: string;
  status: TaskStatus;
  meaning: string;
  weight: 1 | 2 | 3;
  isFocus: boolean;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assignee: string;
};

function EditTaskDialog({
  dialogRef,
  task,
  projects,
  assignees,
  canFocus,
  onClose,
  onSubmit,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  task: Task | null;
  projects: Project[];
  assignees: string[];
  canFocus: boolean;
  onClose: () => void;
  onSubmit: (input: TaskEditInput) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? projects[0]?.id ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "ready");
  const [meaning, setMeaning] = useState(task?.meaning ?? "");
  const [weight, setWeight] = useState<1 | 2 | 3>(task?.weight ?? 2);
  const [isFocus, setIsFocus] = useState(task?.isFocus ?? false);
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [assignee, setAssignee] = useState(task?.assignee ?? "Calvin");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !title.trim() || !projectId || !assignee.trim()) return;
    onSubmit({
      title,
      projectId,
      status,
      meaning,
      weight,
      isFocus,
      description,
      priority,
      dueDate,
      assignee,
    });
  }

  return (
    <dialog className="move-dialog" ref={dialogRef} onClose={onClose} onClick={(event) => {
      if (event.target === dialogRef.current) dialogRef.current?.close();
    }}>
      <form onSubmit={submit}>
        <header className="dialog-head">
          <div><p className="eyebrow">Quest scribe</p><h2>Edit the complete ticket</h2></div>
          <button type="button" className="icon-button" onClick={() => dialogRef.current?.close()} aria-label="Close edit dialog"><X size={19} /></button>
        </header>

        <label className="field">
          <span>Quest title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={90} autoFocus />
        </label>

        <label className="field">
          <span>Description <i>optional</i></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} />
        </label>

        <div className="field-pair">
          <label className="field">
            <span>Campaign</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
              {projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Province</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
              <option value="ready">Quest Log</option>
              <option value="moving">In Forge</option>
              <option value="paused">Camped</option>
              <option value="done">Shipped</option>
            </select>
          </label>
        </div>

        <div className="field-pair">
          <label className="field">
            <span>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
          <label className="field">
            <span>Due date <i>optional</i></span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Assigned guildmate</span>
          <input value={assignee} onChange={(event) => setAssignee(event.target.value)} required maxLength={60} list="edit-ticket-assignees" />
          <datalist id="edit-ticket-assignees">{assignees.map((name) => <option value={name} key={name} />)}</datalist>
          <small>Choose a known guildmate or type another teammate’s name.</small>
        </label>

        <label className="field">
          <span>Why it matters <i>optional</i></span>
          <textarea value={meaning} onChange={(event) => setMeaning(event.target.value)} maxLength={180} rows={3} />
        </label>

        <fieldset className="weight-field">
          <legend>Energy cost</legend>
          <div>
            {([1, 2, 3] as const).map((item) => (
              <button type="button" className={weight === item ? "weight-option is-active" : "weight-option"} onClick={() => setWeight(item)} key={item}>
                <span>{"◆".repeat(item)}</span><strong>{item === 1 ? "Spark" : item === 2 ? "Forge" : "Siege"}</strong><small>{item === 1 ? "small patch" : item === 2 ? "focused build" : "deep system work"}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className={canFocus && status !== "done" ? "focus-check" : "focus-check is-disabled"}>
          <input
            type="checkbox"
            checked={status === "done" ? false : isFocus}
            onChange={(event) => setIsFocus(event.target.checked)}
            disabled={!canFocus || status === "done"}
          />
          <span><strong>Keep in today’s party</strong><small>{status === "done" ? "Shipped quests live in the Chronicle." : canFocus ? "This quest counts toward the active three." : "Today’s party already holds three other quests."}</small></span>
        </label>

        <footer className="dialog-foot">
          <button type="button" className="button button--quiet" onClick={() => dialogRef.current?.close()}>Cancel</button>
          <button className="button button--primary" type="submit">Save ticket <Sword size={16} /></button>
        </footer>
      </form>
    </dialog>
  );
}
