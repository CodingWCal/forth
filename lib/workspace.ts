import type {
  Pace,
  Project,
  Task,
  TaskStatus,
  WorkspaceAction,
  WorkspaceState,
} from "@/lib/types";

export const STORAGE_KEY = "forth.workspace.v1";

export const PACE_CAPACITY: Record<Pace, number> = {
  light: 4,
  steady: 7,
  full: 10,
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  ready: "Ready",
  moving: "In progress",
  paused: "Paused",
  done: "Done",
};

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "SET_PACE":
      return { ...state, pace: action.pace };
    case "SET_SPRITE":
      return { ...state, sprite: action.sprite };
    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.project] };
    case "ADD_TASK":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId ? { ...task, ...action.changes } : task,
        ),
      };
    case "DELETE_TASK":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.taskId) };
    case "SET_STATUS":
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.taskId) return task;
          const isDone = action.status === "done";
          return {
            ...task,
            status: action.status,
            isFocus: isDone ? false : task.isFocus,
            completedAt: isDone ? (action.at ?? new Date().toISOString()) : undefined,
          };
        }),
      };
    case "TOGGLE_FOCUS": {
      const target = state.tasks.find((task) => task.id === action.taskId);
      if (!target || target.status === "done") return state;
      const focusCount = state.tasks.filter((task) => task.isFocus && task.status !== "done").length;
      if (!target.isFocus && focusCount >= 3) return state;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId ? { ...task, isFocus: !task.isFocus } : task,
        ),
      };
    }
    case "RESET":
      return action.state;
  }
}

export function parseStoredWorkspace(value: string | null): WorkspaceState | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isWorkspaceShape(parsed)) return null;
    return { ...parsed, sprite: parsed.sprite ?? "code-squire", version: 2 };
  } catch {
    return null;
  }
}

function isWorkspaceShape(value: unknown): value is Omit<WorkspaceState, "version"> & { version: 1 | 2 } {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<Omit<WorkspaceState, "version">> & { version?: number };
  if (state.sprite !== undefined && state.sprite !== "code-squire" && state.sprite !== "diverse-squire" && state.sprite !== "girl-squire" && state.sprite !== "asian-squire" && state.sprite !== "ambiguos-squire") return false;
  if (
    (state.version !== 1 && state.version !== 2) ||
    (state.pace !== "light" && state.pace !== "steady" && state.pace !== "full") ||
    !Array.isArray(state.projects) ||
    state.projects.length === 0 ||
    !state.projects.every(isProject) ||
    !Array.isArray(state.tasks) ||
    !state.tasks.every(isTask)
  ) {
    return false;
  }

  const projectIds = new Set(state.projects.map((project) => project.id));
  return state.tasks.every((task) => projectIds.has(task.projectId));
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<Project>;
  return (
    isNonEmptyString(project.id) &&
    isNonEmptyString(project.title) &&
    isNonEmptyString(project.code) &&
    typeof project.outcome === "string" &&
    (project.color === "clay" || project.color === "moss" || project.color === "slate") &&
    isValidDate(project.targetDate)
  );
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  const statusIsValid = ["ready", "moving", "paused", "done"].includes(task.status ?? "");
  const completionIsValid =
    task.completedAt === undefined || isValidDate(task.completedAt);
  return (
    isNonEmptyString(task.id) &&
    isNonEmptyString(task.title) &&
    isNonEmptyString(task.projectId) &&
    statusIsValid &&
    [1, 2, 3].includes(task.weight ?? 0) &&
    typeof task.meaning === "string" &&
    isNonEmptyString(task.assignee) &&
    typeof task.isFocus === "boolean" &&
    isValidDate(task.createdAt) &&
    completionIsValid &&
    (task.status !== "done" || task.completedAt !== undefined) &&
    (task.description === undefined || typeof task.description === "string") &&
    (task.priority === undefined || ["low", "medium", "high"].includes(task.priority)) &&
    (task.dueDate === undefined || isValidDateOnly(task.dueDate))
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseDateOnly(value: unknown): [year: number, month: number, day: number] | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return null;
  return [year, month, day];
}

function isValidDateOnly(value: unknown): value is string {
  return parseDateOnly(value) !== null;
}

export function getFocusTasks(state: WorkspaceState) {
  return state.tasks.filter((task) => task.isFocus && task.status !== "done").slice(0, 3);
}

export function getPlannedWeight(state: WorkspaceState) {
  return getFocusTasks(state).reduce((total, task) => total + task.weight, 0);
}

export function getProjectProgress(state: WorkspaceState, projectId: string) {
  const tasks = state.tasks.filter((task) => task.projectId === projectId);
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
  const doneWeight = tasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + task.weight, 0);
  return totalWeight === 0 ? 0 : Math.round((doneWeight / totalWeight) * 100);
}

export function getMomentumDays(tasks: Task[], now = new Date(), useUtc = false) {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    if (useUtc) {
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (6 - index));
    } else {
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
    }
    return date;
  });

  return dates.map((date) => {
    const next = new Date(date);
    if (useUtc) next.setUTCDate(next.getUTCDate() + 1);
    else next.setDate(next.getDate() + 1);
    const weight = tasks
      .filter((task) => {
        if (!task.completedAt) return false;
        const completed = new Date(task.completedAt);
        return completed >= date && completed < next;
      })
      .reduce((sum, task) => sum + task.weight, 0);
    return {
      date: date.toISOString(),
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "narrow",
        timeZone: useUtc ? "UTC" : undefined,
      }).format(date),
      weight,
    };
  });
}

export const DUE_SOON_DAYS = 3;

export type DueCategory = "overdue" | "due-today" | "due-soon" | "later" | "none";

export type DueTiming = {
  category: DueCategory;
  /** Whole calendar days until the due date: negative when overdue, 0 today, null when no due date. */
  daysUntilDue: number | null;
};

export type DueSoonEntry = {
  task: Task;
  category: Extract<DueCategory, "overdue" | "due-today" | "due-soon">;
  daysUntilDue: number;
};

/**
 * Whole calendar days between now and a task's due date in the viewer's local
 * zone. Converting both calendar dates to UTC day numbers keeps daylight-saving
 * transitions from creating 23- or 25-hour arithmetic errors.
 */
export function getDaysUntilDue(task: Task, now = new Date()): number | null {
  const due = parseDateOnly(task.dueDate);
  if (!due || Number.isNaN(now.getTime())) return null;
  const dueDay = Date.UTC(due[0], due[1] - 1, due[2]);
  const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueDay - currentDay) / 86_400_000);
}

/** Delay until just after the viewer's next local midnight. */
export function getNextLocalDayDelay(now = new Date()): number {
  if (Number.isNaN(now.getTime())) return 1;
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 50);
  return Math.max(1, nextDay.getTime() - now.getTime());
}

/** Classify a task's due date relative to now. Pure — no shame states, just timing. */
export function getTaskTiming(
  task: Task,
  now = new Date(),
  withinDays = DUE_SOON_DAYS,
): DueTiming {
  const daysUntilDue = getDaysUntilDue(task, now);
  if (daysUntilDue === null) return { category: "none", daysUntilDue: null };
  if (daysUntilDue < 0) return { category: "overdue", daysUntilDue };
  if (daysUntilDue === 0) return { category: "due-today", daysUntilDue };
  if (daysUntilDue <= withinDays) return { category: "due-soon", daysUntilDue };
  return { category: "later", daysUntilDue };
}

/**
 * Active (unshipped) quests that are overdue or due within `withinDays`, most
 * pressing first. Shipped work never appears — proof is not pressure.
 */
export function getDueSoonTasks(
  state: WorkspaceState,
  now = new Date(),
  withinDays = DUE_SOON_DAYS,
): DueSoonEntry[] {
  return state.tasks
    .filter((task) => task.status !== "done" && Boolean(task.dueDate))
    .map((task) => ({ task, timing: getTaskTiming(task, now, withinDays) }))
    .filter(
      (entry): entry is { task: Task; timing: DueTiming & { daysUntilDue: number } } =>
        entry.timing.category === "overdue" ||
        entry.timing.category === "due-today" ||
        entry.timing.category === "due-soon",
    )
    .map(({ task, timing }) => ({
      task,
      category: timing.category as DueSoonEntry["category"],
      daysUntilDue: timing.daysUntilDue,
    }))
    .sort(
      (a, b) =>
        a.daysUntilDue - b.daysUntilDue ||
        b.task.weight - a.task.weight ||
        a.task.title.localeCompare(b.task.title),
    );
}

export function createTask(input: {
  title: string;
  projectId: string;
  meaning: string;
  weight: 1 | 2 | 3;
  isFocus: boolean;
  description?: string;
  priority?: Task["priority"];
  dueDate?: string;
  assignee?: string;
}): Task {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `task-${Date.now()}`;
  return {
    id,
    title: input.title.trim(),
    projectId: input.projectId,
    meaning: input.meaning.trim(),
    weight: input.weight,
    assignee: input.assignee?.trim() || "Calvin",
    status: "ready",
    isFocus: input.isFocus,
    createdAt: new Date().toISOString(),
    description: input.description?.trim() ?? "",
    priority: input.priority ?? "medium",
    dueDate: input.dueDate || undefined,
  };
}

export function createProject(input: {
  title: string;
  code: string;
  outcome: string;
  targetDate: string;
  color?: Project["color"];
}): Project {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `project-${Date.now()}`;
  const normalizedCode = input.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return {
    id,
    title: input.title.trim(),
    code: normalizedCode || "QUEST",
    outcome: input.outcome.trim(),
    color: input.color ?? "moss",
    targetDate: input.targetDate,
  };
}
