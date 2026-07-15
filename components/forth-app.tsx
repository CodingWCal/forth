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
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { hasFirebaseConfig } from "@/lib/firebase/config";
import { createSeedWorkspace } from "@/lib/seed";
import type { Pace, Project, Task, TaskStatus, WorkspaceState } from "@/lib/types";
import {
  createTask,
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

const NAV_ITEMS: Array<{ id: View; label: string; icon: typeof Gauge }> = [
  { id: "today", label: "Today", icon: Gauge },
  { id: "board", label: "Work map", icon: LayoutGrid },
  { id: "proof", label: "Proof", icon: ListChecks },
  { id: "settings", label: "Settings", icon: Settings },
];

const PACE_COPY: Record<Pace, { label: string; hint: string }> = {
  light: { label: "Light", hint: "Protect room to recover" },
  steady: { label: "Steady", hint: "A grounded working day" },
  full: { label: "Full", hint: "Extra room is available" },
};

export function ForthApp() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, createSeedWorkspace);
  const [view, setView] = useState<View>("today");
  const [activeProjectId, setActiveProjectId] = useState("project-forth");
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = parseStoredWorkspace(window.localStorage.getItem(STORAGE_KEY));
      if (stored) dispatch({ type: "RESET", state: stored });
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const focusTasks = getFocusTasks(state);
  const plannedWeight = getPlannedWeight(state);
  const capacity = PACE_CAPACITY[state.pace];
  const activeProject =
    state.projects.find((project) => project.id === activeProjectId) ?? state.projects[0];

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
        ? `Landed: ${task.title}`
        : `${task.title} is now ${STATUS_LABELS[status].toLowerCase()}.`,
    );
  }

  function openAddDialog() {
    dialogRef.current?.showModal();
  }

  function resetDemo() {
    if (!window.confirm("Reset every local change and restore the Forth demo?")) return;
    dispatch({ type: "RESET", state: createSeedWorkspace() });
    setActiveProjectId("project-forth");
    setView("today");
    announce("The local demo has been reset.");
  }

  const title =
    view === "today"
      ? "Make today feel finishable."
      : view === "board"
        ? "See the work without the weight."
        : view === "proof"
          ? "The work has left a trail."
          : "Keep the foundation honest.";

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
          <p className="eyebrow">Open projects</p>
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
        </div>

        <div className="rail-foot">
          <div className="avatar-stack" aria-label="Three workspace members">
            <span>C</span><span>M</span><span>J</span>
          </div>
          <span className="rail-foot-copy">Small team<br />clear pace</span>
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
              }).format(new Date())}
            </p>
            <h1>{title}</h1>
          </div>
          <div className="desktop-actions">
            <EnvironmentBadge />
            {view !== "settings" && (
              <button className="button button--primary" onClick={openAddDialog}>
                <Plus size={17} /> Add a move
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
            onSetPace={(pace) => dispatch({ type: "SET_PACE", pace })}
            onSetStatus={setStatus}
            onOpenAdd={openAddDialog}
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
                announce("Today already has three moves. Land or remove one first.");
              } else if (task) {
                announce(task.isFocus ? "Removed from today." : "Added to today.");
              }
            }}
            onOpenAdd={openAddDialog}
          />
        )}
        {view === "proof" && <ProofView state={state} />}
        {view === "settings" && <SettingsView onReset={resetDemo} />}
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
        onSubmit={(input) => {
          dispatch({ type: "ADD_TASK", task: createTask(input) });
          dialogRef.current?.close();
          announce(`Ready: ${input.title.trim()}`);
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
      <span /> {hasFirebaseConfig ? "Firebase ready" : "Local demo"}
    </span>
  );
}

function TodayView({
  state,
  activeProject,
  focusTasks,
  plannedWeight,
  capacity,
  onSetPace,
  onSetStatus,
  onOpenAdd,
  onGoToBoard,
}: {
  state: WorkspaceState;
  activeProject: Project;
  focusTasks: Task[];
  plannedWeight: number;
  capacity: number;
  onSetPace: (pace: Pace) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onOpenAdd: () => void;
  onGoToBoard: () => void;
}) {
  const momentum = getMomentumDays(state.tasks);
  const maxMomentum = Math.max(...momentum.map((day) => day.weight), 1);
  const progress = getProjectProgress(state, activeProject.id);
  const completedToday = momentum[momentum.length - 1]?.weight ?? 0;
  const overPlan = plannedWeight > capacity;

  return (
    <div className="today-layout">
      <div className="today-main">
        <section className="pace-panel" aria-labelledby="pace-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 · Set the conditions</p>
              <h2 id="pace-title">What pace is honest today?</h2>
            </div>
            <span className="capacity-number"><strong>{plannedWeight}</strong> / {capacity} stones</span>
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
                  ? "The plan is carrying more than today’s pace. Remove one move or choose more room."
                  : `${capacity - plannedWeight} ${capacity - plannedWeight === 1 ? "stone" : "stones"} remain. Enough room for the day to breathe.`}
              </p>
            </div>
          </div>
        </section>

        <section className="focus-panel" aria-labelledby="focus-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 · Make it real</p>
              <h2 id="focus-title">Three meaningful moves</h2>
            </div>
            <button className="text-button" onClick={onGoToBoard}>Open work map <ArrowRight size={15} /></button>
          </div>

          <div className="focus-list">
            {focusTasks.map((task, index) => (
              <FocusTaskRow
                key={task.id}
                task={task}
                project={state.projects.find((project) => project.id === task.projectId)!}
                index={index}
                onSetStatus={onSetStatus}
              />
            ))}
            {focusTasks.length < 3 && (
              <button className="empty-focus" onClick={onOpenAdd}>
                <Plus size={18} />
                <span><strong>Leave room or add one move</strong><small>A shorter list can be the more honest plan.</small></span>
              </button>
            )}
          </div>
        </section>

        <section className="momentum-panel" aria-labelledby="momentum-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 · Notice the movement</p>
              <h2 id="momentum-title">Seven-day trail</h2>
            </div>
            <span className="quiet-stat"><strong>{completedToday}</strong> {completedToday === 1 ? "stone" : "stones"} landed today</span>
          </div>
          <div className="trail-chart">
            <div className="trail-copy">
              <p>Momentum is not a streak to protect.</p>
              <span>It is evidence you can return to the work.</span>
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
          <div className="card-kicker"><Target size={16} /><span>Project signal</span></div>
          <p className="project-code">{activeProject.code} · ACTIVE</p>
          <h2>{activeProject.title}</h2>
          <p className="outcome-copy">{activeProject.outcome}</p>
          <div className="project-progress">
            <div><span>Ground covered</span><strong>{progress}%</strong></div>
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
          <div className="card-kicker"><Leaf size={16} /><span>Field note</span></div>
          <blockquote>“We finally stopped treating an honest pause like a broken plan.”</blockquote>
          <div className="note-author"><span>MM</span><p><strong>Maya M.</strong><small>Design · 18 min ago</small></p></div>
        </section>

        <section className="principle-card">
          <BrandMark compact />
          <p>Forth principle № 02</p>
          <strong>Progress should feel like evidence, not pressure.</strong>
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
}: {
  task: Task;
  project: Project;
  index: number;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <article className={`focus-task focus-task--${task.status}`}>
      <button className="land-button" onClick={() => onSetStatus(task.id, "done")} aria-label={`Land ${task.title}`}>
        <Check size={18} />
      </button>
      <span className="task-index">0{index + 1}</span>
      <div className="task-body">
        <div className="task-meta">
          <span className={`project-tag project-tag--${project.color}`}>{project.code}</span>
          <span>{task.weight} {task.weight === 1 ? "stone" : "stones"}</span>
          <span>{STATUS_LABELS[task.status]}</span>
        </div>
        <h3>{task.title}</h3>
        <p>{task.meaning}</p>
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
}: {
  state: WorkspaceState;
  activeProject: Project;
  onSelectProject: (id: string) => void;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onToggleFocus: (taskId: string) => void;
  onOpenAdd: () => void;
}) {
  const statuses: TaskStatus[] = ["ready", "moving", "paused", "done"];
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
          <p className="eyebrow">{activeProject.code} · Outcome</p>
          <h2>{activeProject.outcome}</h2>
        </div>
        <div className="board-progress">
          <strong>{getProjectProgress(state, activeProject.id)}%</strong>
          <span>ground covered</span>
        </div>
      </section>

      <section className="kanban" aria-label={`${activeProject.title} work map`}>
        {statuses.map((status) => {
          const tasks = state.tasks.filter(
            (task) => task.projectId === activeProject.id && task.status === status,
          );
          return (
            <div className={`kanban-column kanban-column--${status}`} key={status}>
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
                  />
                ))}
                {tasks.length === 0 && (
                  <div className="column-empty">
                    <MapIcon size={20} />
                    <span>No work resting here.</span>
                  </div>
                )}
                {status === "ready" && (
                  <button className="column-add" onClick={onOpenAdd}><Plus size={15} /> Add a move</button>
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
}: {
  task: Task;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
  onToggleFocus: (taskId: string) => void;
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
    <article className="board-task">
      <div className="board-task-top">
        <span>{task.weight} {task.weight === 1 ? "stone" : "stones"}</span>
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
      <p>{task.meaning}</p>
      <div className="board-task-assignee"><span>{task.assignee.charAt(0)}</span>{task.assignee}</div>
      <div className="board-task-actions">
        {previous[task.status] && task.status !== "done" && (
          <button onClick={() => onSetStatus(task.id, previous[task.status]!)} aria-label={`Move ${task.title} backward`}>
            <ArrowLeft size={14} />
          </button>
        )}
        {next[task.status] && (
          <button className="move-forward" onClick={() => onSetStatus(task.id, next[task.status]!)}>
            {task.status === "moving" ? "Land" : task.status === "paused" ? "Make ready" : "Move"}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

function ProofView({ state }: { state: WorkspaceState }) {
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
          <p className="eyebrow">Completion ledger</p>
          <h2>Not a score. A record of what became real.</h2>
          <p>Every landed move keeps its purpose attached, so progress remains meaningful after the checkbox disappears.</p>
        </div>
        <dl>
          <div><dt>Landed</dt><dd>{completed.length}</dd></div>
          <div><dt>Stones</dt><dd>{totalWeight}</dd></div>
          <div><dt>Builders</dt><dd>{contributors}</dd></div>
        </dl>
      </section>

      <section className="proof-ledger" aria-labelledby="ledger-title">
        <div className="ledger-head">
          <p className="eyebrow">The trail, newest first</p>
          <h2 id="ledger-title">Proof of progress</h2>
        </div>
        {completed.length === 0 ? (
          <div className="proof-empty"><BrandMark /><h3>The first mark is waiting.</h3><p>Land one meaningful move and its story will live here.</p></div>
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
                  <div className="ledger-person"><span>{task.assignee.charAt(0)}</span><p>{task.assignee}<small>{task.weight} {task.weight === 1 ? "stone" : "stones"}</small></p></div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsView({ onReset }: { onReset: () => void }) {
  return (
    <div className="settings-view">
      <section className="settings-intro">
        <p className="eyebrow">Build mode</p>
        <h2>Useful now. Ready to grow honestly.</h2>
        <p>Forth currently keeps the demo workspace in this browser. The interface and data model are prepared for Firebase, but it will not claim cloud sync until a real project and authentication policy are connected.</p>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><LockKeyhole size={22} /></div>
        <div>
          <p className="eyebrow">Persistence</p>
          <h3>{hasFirebaseConfig ? "Firebase configuration detected" : "Local browser storage"}</h3>
          <p>{hasFirebaseConfig ? "Environment values are present. Authentication and workspace provisioning remain a deliberate private-beta step." : "Changes survive refreshes on this device. They are not synced, shared, or uploaded."}</p>
        </div>
        <span className={hasFirebaseConfig ? "status-stamp is-ready" : "status-stamp"}>{hasFirebaseConfig ? "Ready" : "Local"}</span>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><Target size={22} /></div>
        <div>
          <p className="eyebrow">Private-beta gate</p>
          <h3>What cloud connection will add</h3>
          <ul>
            <li>Email or Google sign-in</li>
            <li>Workspace membership and secure collaboration</li>
            <li>Live project, task, pace, and proof synchronization</li>
            <li>Tested Firestore authorization rules</li>
          </ul>
        </div>
      </section>

      <section className="reset-card">
        <div><p className="eyebrow">Demo controls</p><h3>Return to the starting trail</h3><p>This removes local changes only. It cannot affect Firebase or another device.</p></div>
        <button className="button button--danger" onClick={onReset}><RotateCcw size={16} /> Reset local demo</button>
      </section>
    </div>
  );
}

function AddTaskDialog({
  dialogRef,
  projects,
  activeProjectId,
  canFocus,
  onSubmit,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  projects: Project[];
  activeProjectId: string;
  canFocus: boolean;
  onSubmit: (input: {
    title: string;
    projectId: string;
    meaning: string;
    weight: 1 | 2 | 3;
    isFocus: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(activeProjectId);
  const [meaning, setMeaning] = useState("");
  const [weight, setWeight] = useState<1 | 2 | 3>(2);
  const [isFocus, setIsFocus] = useState(canFocus);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !projectId) return;
    onSubmit({ title, projectId, meaning, weight, isFocus });
    setTitle("");
    setMeaning("");
    setWeight(2);
    setIsFocus(canFocus);
  }

  return (
    <dialog className="move-dialog" ref={dialogRef} onClick={(event) => {
      if (event.target === dialogRef.current) dialogRef.current?.close();
    }}>
      <form onSubmit={submit}>
        <header className="dialog-head">
          <div><p className="eyebrow">Add to the work map</p><h2>What should move next?</h2></div>
          <button type="button" className="icon-button" onClick={() => dialogRef.current?.close()} aria-label="Close dialog"><X size={19} /></button>
        </header>

        <label className="field">
          <span>Move</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={90} autoFocus placeholder="Describe a finishable outcome" />
          <small>Use a verb and make the finish line visible.</small>
        </label>

        <label className="field">
          <span>Project</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
            {projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Why it matters <i>optional</i></span>
          <textarea value={meaning} onChange={(event) => setMeaning(event.target.value)} maxLength={180} rows={3} placeholder="Connect this move to the project outcome" />
        </label>

        <fieldset className="weight-field">
          <legend>Effort</legend>
          <div>
            {([1, 2, 3] as const).map((item) => (
              <button type="button" className={weight === item ? "weight-option is-active" : "weight-option"} onClick={() => setWeight(item)} key={item}>
                <span>{"●".repeat(item)}</span><strong>{item === 1 ? "Pebble" : item === 2 ? "Stone" : "Boulder"}</strong><small>{item === 1 ? "under 30m" : item === 2 ? "focused block" : "deep work"}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className={canFocus ? "focus-check" : "focus-check is-disabled"}>
          <input type="checkbox" checked={isFocus} onChange={(event) => setIsFocus(event.target.checked)} disabled={!canFocus} />
          <span><strong>Add to today’s three</strong><small>{canFocus ? "Keep the move close and visible." : "Today already has three moves."}</small></span>
        </label>

        <footer className="dialog-foot">
          <button type="button" className="button button--quiet" onClick={() => dialogRef.current?.close()}>Cancel</button>
          <button className="button button--primary" type="submit">Make it ready <ArrowRight size={16} /></button>
        </footer>
      </form>
    </dialog>
  );
}
