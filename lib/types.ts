export type Pace = "light" | "steady" | "full";

export type TaskStatus = "ready" | "moving" | "paused" | "done";

export type Project = {
  id: string;
  title: string;
  code: string;
  outcome: string;
  color: "clay" | "moss" | "slate";
  targetDate: string;
};

export type Task = {
  id: string;
  title: string;
  projectId: string;
  status: TaskStatus;
  weight: 1 | 2 | 3;
  meaning: string;
  assignee: string;
  isFocus: boolean;
  createdAt: string;
  completedAt?: string;
};

export type WorkspaceState = {
  version: 1;
  pace: Pace;
  projects: Project[];
  tasks: Task[];
};

export type WorkspaceAction =
  | { type: "SET_PACE"; pace: Pace }
  | { type: "ADD_TASK"; task: Task }
  | { type: "SET_STATUS"; taskId: string; status: TaskStatus; at?: string }
  | { type: "TOGGLE_FOCUS"; taskId: string }
  | { type: "RESET"; state: WorkspaceState };
