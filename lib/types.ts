export type Pace = "light" | "steady" | "full";
export type SpriteId = "code-squire" | "diverse-squire" | "girl-squire" | "asian-squire" | "ambiguos-squire";

export type TaskStatus = "ready" | "moving" | "paused" | "done";
export type TaskPriority = "low" | "medium" | "high";

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
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
};

export type WorkspaceState = {
  version: 2;
  pace: Pace;
  sprite: SpriteId;
  projects: Project[];
  tasks: Task[];
};

export type WorkspaceAction =
  | { type: "SET_PACE"; pace: Pace }
  | { type: "SET_SPRITE"; sprite: SpriteId }
  | { type: "ADD_PROJECT"; project: Project }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; taskId: string; changes: Partial<Omit<Task, "id" | "createdAt">> }
  | { type: "DELETE_TASK"; taskId: string }
  | { type: "SET_STATUS"; taskId: string; status: TaskStatus; at?: string }
  | { type: "TOGGLE_FOCUS"; taskId: string }
  | { type: "RESET"; state: WorkspaceState };