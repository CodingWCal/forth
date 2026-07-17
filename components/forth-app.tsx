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
import { type DragEvent, FormEvent, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Image from "next/image";
import { BrandMark } from "@/components/brand-mark";
import { hasFirebaseConfig } from "@/lib/firebase/config";
import type { User } from "firebase/auth";
import {
  acceptGuildInvite,
  createGuildWorkspace,
  declineGuildInvite,
  type GuildWorkspace,
  inviteGuildMember,
  listGuildWorkspaces,
  listPendingGuildInvites,
  type PendingGuildInvite,
  provisionWorkspace,
  saveWorkspace,
  signInWithGoogle,
  signOutOfForth,
  watchAuth,
  watchWorkspace,
} from "@/lib/firebase/workspace";
import { createSeedWorkspace } from "@/lib/seed";
import type { Pace, Project, Task, TaskPriority, TaskStatus, WorkspaceState } from "@/lib/types";
import {
  createTask,
  createProject,
  getFocusTasks,
  getMomentumDays,
  getPlannedWeight,
  getProjectProgress,
  PACE_CAPACITY,
  parseStoredWorkspace,
  STATUS_LABELS,
  STORAGE_KEY,
  workspaceReducer,
} from "@/lib/workspace";

type View = "today" | "board" | "proof" | "settings";

function getAuthFailureMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "unknown error";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was cancelled before it finished.";
  if (code === "auth/popup-blocked") return "Allow popups for Forth, then try Google sign-in again.";
  if (code === "auth/unauthorized-domain") return "This Forth domain is not authorized in Firebase Authentication.";
  if (code === "auth/operation-not-allowed") return "Google sign-in is not enabled for this Firebase project.";
  return `Google sign-in could not finish (${code}).`;
}

const NAV_ITEMS: Array<{ id: View; label: string; icon: typeof Gauge }> = [
  { id: "today", label: "Quest Log", icon: Gauge },
  { id: "board", label: "Realm Map", icon: LayoutGrid },
  { id: "proof", label: "Chronicle", icon: ListChecks },
  { id: "settings", label: "Guild Hall", icon: Settings },
];

const PACE_COPY: Record<Pace, { label: string; hint: string }> = {
  light: { label: "Scout", hint: "A short expedition" },
  steady: { label: "Venture", hint: "A grounded build day" },
  full: { label: "Raid", hint: "Deep-work reserves ready" },
};

export function ForthApp({
  initialState,
  renderedAt,
}: {
  initialState: WorkspaceState;
  renderedAt: string;
}) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const [displayDate, setDisplayDate] = useState(() => new Date(renderedAt));
  const [view, setView] = useState<View>("today");
  const [activeProjectId, setActiveProjectId] = useState("project-forth");
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(hasFirebaseConfig);
  const [syncState, setSyncState] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [guilds, setGuilds] = useState<GuildWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingGuildInvite[]>([]);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const cloudReadyRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const campaignDialogRef = useRef<HTMLDialogElement>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = parseStoredWorkspace(window.localStorage.getItem(STORAGE_KEY));
      dispatch({ type: "RESET", state: stored ?? createSeedWorkspace() });
      setDisplayDate(new Date());
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hasFirebaseConfig) return;
    return watchAuth(({ user, loading }) => {
      setCloudUser(user);
      setAuthLoading(loading);
      if (user) {
        setSyncState("syncing");
      } else {
        cloudReadyRef.current = false;
        setGuilds([]);
        setActiveWorkspaceId(null);
        setPendingInvites([]);
        setInviteStatus("idle");
        setSyncState("local");
      }
    }) ?? undefined;
  }, []);

  useEffect(() => {
    if (!cloudUser || !hydrated) return;
    let cancelled = false;
    void provisionWorkspace(cloudUser, state)
      .then(async () => {
        if (cancelled) return;
        const availableGuilds = await listGuildWorkspaces(cloudUser);
        if (cancelled) return;
        setGuilds(availableGuilds);
        const storedWorkspaceId = window.localStorage.getItem(`forth.active-workspace.${cloudUser.uid}`);
        const selectedWorkspaceId = availableGuilds.some((guild) => guild.id === storedWorkspaceId)
          ? storedWorkspaceId!
          : cloudUser.uid;
        setActiveWorkspaceId(selectedWorkspaceId);
        void refreshPendingInvites(cloudUser);
      })
      .catch(() => setSyncState("error"));
    return () => {
      cancelled = true;
    };
  // Provision exactly when the authenticated identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudUser?.uid, hydrated]);

  useEffect(() => {
    if (!cloudUser || !activeWorkspaceId || !hydrated) return;
    window.localStorage.setItem(`forth.active-workspace.${cloudUser.uid}`, activeWorkspaceId);
    const unsubscribe = watchWorkspace(
      activeWorkspaceId,
      (cloudState) => {
        cloudReadyRef.current = false;
        dispatch({ type: "RESET", state: cloudState });
        window.requestAnimationFrame(() => {
          cloudReadyRef.current = true;
          setSyncState("synced");
        });
      },
      () => setSyncState("error"),
    ) ?? undefined;
    return () => unsubscribe?.();
  }, [activeWorkspaceId, cloudUser, hydrated]);

  useEffect(() => {
    if (!cloudUser || !activeWorkspaceId || !cloudReadyRef.current) return;
    setSyncState("syncing");
    const timeout = window.setTimeout(() => {
      void saveWorkspace(activeWorkspaceId, state)
        .then(() => setSyncState("synced"))
        .catch(() => setSyncState("error"));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [activeWorkspaceId, cloudUser, state]);

  const focusTasks = getFocusTasks(state);
  const plannedWeight = getPlannedWeight(state);
  const capacity = PACE_CAPACITY[state.pace];
  const activeProject =
    state.projects.find((project) => project.id === activeProjectId) ?? state.projects[0];
  const activeGuild = guilds.find((guild) => guild.id === activeWorkspaceId) ?? null;

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

  async function refreshGuildDirectory(user: User) {
    const availableGuilds = await listGuildWorkspaces(user);
    setGuilds(availableGuilds);
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

  function openEditDialog(task: Task) {
    setEditingTask(task);
    window.requestAnimationFrame(() => editDialogRef.current?.showModal());
  }

  function resetDemo() {
    const destination = cloudUser
      ? "this signed-in guild and every device it syncs to"
      : "this browser";
    if (!window.confirm(`Restore the starter campaign in ${destination}? This replaces the current workspace.`)) return;
    dispatch({ type: "RESET", state: createSeedWorkspace() });
    setActiveProjectId("project-forth");
    setView("today");
    announce(cloudUser ? "Starter campaign restored and syncing." : "The local demo has been reset.");
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

  async function createGuild(name: string) {
    if (!cloudUser) {
      announce("Sign in with Google before creating a shared guild.");
      setView("settings");
      return;
    }
    try {
      const workspaceId = await createGuildWorkspace(cloudUser, name, createSeedWorkspace());
      await refreshGuildDirectory(cloudUser);
      setActiveWorkspaceId(workspaceId);
      setActiveProjectId("project-forth");
      setView("board");
      announce(`Guild founded: ${name.trim()}.`);
    } catch (error) {
      announce(error instanceof Error ? error.message : "The guild could not be created.");
    }
  }

  async function inviteGuildmate(email: string) {
    if (!cloudUser || !activeGuild) return;
    try {
      await inviteGuildMember(cloudUser, activeGuild, email);
      announce(`Invitation recorded for ${email.trim().toLowerCase()}. It appears in their Guild Hall after Google sign-in.`);
    } catch (error) {
      announce(error instanceof Error ? error.message : "The invitation could not be sent.");
    }
  }

  async function joinGuild(workspaceId: string) {
    if (!cloudUser) return;
    try {
      const joinedGuild = await acceptGuildInvite(cloudUser, workspaceId);
      await refreshGuildDirectory(cloudUser);
      setActiveWorkspaceId(joinedGuild.workspaceId);
      setView("today");
      announce(`Joined ${joinedGuild.workspaceName}.`);
      void refreshPendingInvites(cloudUser);
    } catch (error) {
      announce(error instanceof Error ? error.message : "The guild invitation could not be accepted.");
    }
  }

  async function acceptPendingInvite(invite: PendingGuildInvite) {
    if (!cloudUser) return;
    try {
      const joinedGuild = await acceptGuildInvite(cloudUser, invite.workspaceId);
      setPendingInvites((current) => current.filter((item) => item.workspaceId !== invite.workspaceId));
      await refreshGuildDirectory(cloudUser);
      setActiveWorkspaceId(joinedGuild.workspaceId);
      announce(`Welcome to ${joinedGuild.workspaceName}. The shared realm is now active.`);
    } catch (error) {
      announce(error instanceof Error ? error.message : "The invitation could not be accepted. Try again.");
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
      announce(error instanceof Error ? error.message : "The invitation could not be declined. Try again.");
      void refreshPendingInvites(cloudUser);
    }
  }

  return (
    <div className="app-shell">
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
        <EnvironmentBadge />
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
            <EnvironmentBadge />
            {view !== "settings" && (
              <button className="button button--primary" onClick={openAddDialog}>
                <Plus size={17} /> New quest
              </button>
            )}
          </div>
        </header>

        {view === "today" && (
          <TodayView
            state={state}
            activeProject={activeProject}
            focusTasks={focusTasks}
            plannedWeight={plannedWeight}
            capacity={capacity}
            now={displayDate}
            useUtc={!hydrated}
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
            onReset={resetDemo}
            user={cloudUser}
            authLoading={authLoading}
            syncState={syncState}
            activeGuild={activeGuild}
            guilds={guilds}
            onSelectGuild={setActiveWorkspaceId}
            onCreateGuild={createGuild}
            onInviteGuildmate={inviteGuildmate}
            onJoinGuild={joinGuild}
            pendingInvites={pendingInvites}
            inviteStatus={inviteStatus}
            onAcceptInvite={acceptPendingInvite}
            onDeclineInvite={declinePendingInvite}
            onRetryInvites={() => {
              if (cloudUser) void refreshPendingInvites(cloudUser);
            }}
            onOpenCampaign={openCampaignDialog}
            onSignIn={async () => {
              try {
                await signInWithGoogle();
                announce("Welcome to the guild. Cloud save is active.");
              } catch (error) {
                console.error("Forth Google sign-in failed", error);
                announce(getAuthFailureMessage(error));
              }
            }}
            onSignOut={async () => {
              await signOutOfForth();
              announce("Signed out. This browser keeps its local copy.");
            }}
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

      <div className={toast ? "toast is-visible" : "toast"} role="status" aria-live="polite">
        <Check size={16} />
        <span>{toast}</span>
      </div>
    </div>
  );
}

function EnvironmentBadge() {
  return (
    <span className={hasFirebaseConfig ? "env-badge is-connected" : "env-badge"}>
      <span /> {hasFirebaseConfig ? "Cloud rune active" : "Local camp"}
    </span>
  );
}

function TodayView({
  state,
  activeProject,
  focusTasks,
  plannedWeight,
  capacity,
  now,
  useUtc,
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
  onSetPace: (pace: Pace) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onOpenAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onGoToBoard: () => void;
}) {
  const momentum = getMomentumDays(state.tasks, now, useUtc);
  const maxMomentum = Math.max(...momentum.map((day) => day.weight), 1);
  const progress = getProjectProgress(state, activeProject.id);
  const completedToday = momentum[momentum.length - 1]?.weight ?? 0;
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
  onReset,
  user,
  authLoading,
  syncState,
  activeGuild,
  guilds,
  onSelectGuild,
  onCreateGuild,
  onInviteGuildmate,
  onJoinGuild,
  pendingInvites,
  inviteStatus,
  onAcceptInvite,
  onDeclineInvite,
  onRetryInvites,
  onOpenCampaign,
  onSignIn,
  onSignOut,
}: {
  onReset: () => void;
  user: User | null;
  authLoading: boolean;
  syncState: "local" | "syncing" | "synced" | "error";
  activeGuild: GuildWorkspace | null;
  guilds: GuildWorkspace[];
  onSelectGuild: (workspaceId: string) => void;
  onCreateGuild: (name: string) => Promise<void>;
  onInviteGuildmate: (email: string) => Promise<void>;
  onJoinGuild: (workspaceId: string) => Promise<void>;
  pendingInvites: PendingGuildInvite[];
  inviteStatus: "idle" | "loading" | "ready" | "error";
  onAcceptInvite: (invite: PendingGuildInvite) => Promise<void>;
  onDeclineInvite: (invite: PendingGuildInvite) => Promise<void>;
  onRetryInvites: () => void;
  onOpenCampaign: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="settings-view">
      <section className="settings-intro">
        <p className="eyebrow">Guild hall · Save altar</p>
        <h2>Account wards and cloud runes.</h2>
        <p>Play from a local camp or sign in to carry the same engineering realm across devices. Ticket data stays private to your guild workspace.</p>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><LockKeyhole size={22} /></div>
        <div>
          <p className="eyebrow">Save ward</p>
          <h3>{user ? `Signed in as ${user.displayName ?? user.email}` : hasFirebaseConfig ? "Cloud save is available" : "Local browser save"}</h3>
          <p>{user ? `Save status: ${syncState}. Forth keeps a local fallback while your private Firestore workspace synchronizes.` : hasFirebaseConfig ? "Use Google sign-in to create your private guild save." : "Changes survive refreshes on this device but do not travel to another browser."}</p>
          {hasFirebaseConfig && (
            <button className="button button--primary" disabled={authLoading} onClick={() => void (user ? onSignOut() : onSignIn())}>
              {authLoading ? "Checking save…" : user ? "Sign out" : "Sign in with Google"}
            </button>
          )}
        </div>
        <span className={user && syncState === "synced" ? "status-stamp is-ready" : "status-stamp"}>{user ? syncState : "Local"}</span>
      </section>

      {user && (
        <PendingInvitesCard
          pendingInvites={pendingInvites}
          inviteStatus={inviteStatus}
          onAcceptInvite={onAcceptInvite}
          onDeclineInvite={onDeclineInvite}
          onRetryInvites={onRetryInvites}
        />
      )}

      {user && (
        <GuildHallCard
          activeGuild={activeGuild}
          guilds={guilds}
          onSelectGuild={onSelectGuild}
          onCreateGuild={onCreateGuild}
          onInviteGuildmate={onInviteGuildmate}
          onJoinGuild={onJoinGuild}
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

      <section className="reset-card">
        <div><p className="eyebrow">Workspace controls</p><h3>Restore the starter campaign</h3><p>{user ? "This replaces the signed-in workspace and synchronizes the starter campaign to Firebase." : "This replaces local browser data on this device only."}</p></div>
        <button className="button button--danger" onClick={onReset}><RotateCcw size={16} /> {user ? "Restore guild seed" : "Restore local seed"}</button>
      </section>
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
          <p>Checking for guild invitations addressed to your Google email…</p>
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
          <p>No invitations are waiting for you. When a guild leader invites this Google email, the summons appears here.</p>
        )}
        {inviteStatus === "ready" && pendingInvites.length > 0 && (
          <div className="invite-list">
            {pendingInvites.map((invite) => (
              <div className="invite-row" key={invite.workspaceId}>
                <div>
                  <strong>{invite.workspaceName}</strong>
                  <small>Invited by {invite.invitedBy}</small>
                </div>
                <div className="guild-actions">
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={busyWorkspaceId === invite.workspaceId}
                    onClick={() => void act(invite, onAcceptInvite)}
                  >
                    <Check size={15} /> Accept
                  </button>
                  <button
                    type="button"
                    className="button button--quiet"
                    disabled={busyWorkspaceId === invite.workspaceId}
                    onClick={() => void act(invite, onDeclineInvite)}
                  >
                    <X size={15} /> Decline
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
  onOpenCampaign,
}: {
  activeGuild: GuildWorkspace | null;
  guilds: GuildWorkspace[];
  onSelectGuild: (workspaceId: string) => void;
  onCreateGuild: (name: string) => Promise<void>;
  onInviteGuildmate: (email: string) => Promise<void>;
  onJoinGuild: (workspaceId: string) => Promise<void>;
  onOpenCampaign: () => void;
}) {
  const [guildName, setGuildName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [guildCode, setGuildCode] = useState("");

  return (
    <section className="guild-card">
      <div className="settings-icon"><UserPlus size={22} /></div>
      <div>
        <p className="eyebrow">Guild roster</p>
        <h3>Build campaigns with real guildmates.</h3>
        <p>Invite a teammate by the Google email they will use for Forth. After they sign in, the invitation appears in their own Guild Hall under Pending invitations. The guild code below is a backup path if that panel is unavailable.</p>
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
          if (!guildName.trim()) return;
          void onCreateGuild(guildName).then(() => setGuildName(""));
        }}>
          <label className="field"><span>Found another guild</span><input value={guildName} onChange={(event) => setGuildName(event.target.value)} placeholder="Platform guild" maxLength={60} /></label>
          <button className="button button--quiet" type="submit">Found guild</button>
        </form>

        {activeGuild?.role === "owner" && (
          <form className="guild-inline-form" onSubmit={(event) => {
            event.preventDefault();
            if (!inviteEmail.trim()) return;
            void onInviteGuildmate(inviteEmail).then(() => setInviteEmail(""));
          }}>
            <label className="field"><span>Invite a guildmate</span><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@example.com" /></label>
            <button className="button button--primary" type="submit">Send invite</button>
          </form>
        )}

        <form className="guild-inline-form" onSubmit={(event) => {
          event.preventDefault();
          if (!guildCode.trim()) return;
          void onJoinGuild(guildCode).then(() => setGuildCode(""));
        }}>
          <label className="field"><span>Join with a guild code</span><input value={guildCode} onChange={(event) => setGuildCode(event.target.value)} placeholder="guild-…" /></label>
          <button className="button button--primary" type="submit">Join guild</button>
        </form>
      </div>
    </section>
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
