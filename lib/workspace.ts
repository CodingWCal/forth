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
  ready: "Quest Log",
  moving: "In Forge",
  paused: "Camped",
  done: "Shipped",
};

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "SET_PACE":
      return { ...state, pace: action.pace };
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
    return { ...parsed, version: 2 };
  } catch {
    return null;
  }
}

function isWorkspaceShape(value: unknown): value is Omit<WorkspaceState, "version"> & { version: 1 | 2 } {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<Omit<WorkspaceState, "version">> & { version?: number };
  return (
    (state.version === 1 || state.version === 2) &&
    (state.pace === "light" || state.pace === "steady" || state.pace === "full") &&
    Array.isArray(state.projects) &&
    state.projects.every(isProject) &&
    Array.isArray(state.tasks) &&
    state.tasks.every(isTask)
  );
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<Project>;
  return (
    typeof project.id === "string" &&
    typeof project.title === "string" &&
    typeof project.code === "string" &&
    typeof project.outcome === "string" &&
    typeof project.targetDate === "string"
  );
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.projectId === "string" &&
    ["ready", "moving", "paused", "done"].includes(task.status ?? "") &&
    [1, 2, 3].includes(task.weight ?? 0) &&
    typeof task.meaning === "string" &&
    typeof task.assignee === "string" &&
    typeof task.isFocus === "boolean" &&
    typeof task.createdAt === "string"
  );
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

export function getMomentumDays(tasks: Task[], now = new Date()) {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return dates.map((date) => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const weight = tasks
      .filter((task) => {
        if (!task.completedAt) return false;
        const completed = new Date(task.completedAt);
        return completed >= date && completed < next;
      })
      .reduce((sum, task) => sum + task.weight, 0);
    return {
      date: date.toISOString(),
      label: new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(date),
      weight,
    };
  });
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
    assignee: "Calvin",
    status: "ready",
    isFocus: input.isFocus,
    createdAt: new Date().toISOString(),
    description: input.description?.trim() ?? "",
    priority: input.priority ?? "medium",
    dueDate: input.dueDate || undefined,
  };
}
