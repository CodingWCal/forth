import type { WorkspaceState } from "@/lib/types";

/** Stable IDs from the engineering demo workspace — used to detect legacy seed content. */
export const SEED_PROJECT_IDS = ["project-forth", "project-stories", "project-fieldnotes"] as const;

export const SEED_TASK_IDS = [
  "task-auth-errors",
  "task-rules-ci",
  "task-mobile-board",
  "task-offline-copy",
  "task-keyboard-dialog",
  "task-domain-events",
  "done-schema",
  "done-auth",
  "done-rules",
  "done-reducer",
  "done-deploy",
] as const;

export function getSeedFingerprint(): string {
  return `seed-v2:${SEED_PROJECT_IDS.join(",")}:${SEED_TASK_IDS.join(",")}`;
}

/**
 * Returns true when the workspace still contains the canonical engineering demo
 * project and task IDs — indicating sample content that may need an explicit choice.
 */
export function looksLikeEngineeringSeed(state: WorkspaceState): boolean {
  const projectIds = new Set(state.projects.map((project) => project.id));
  const taskIds = new Set(state.tasks.map((task) => task.id));
  const hasAllSeedProjects = SEED_PROJECT_IDS.every((id) => projectIds.has(id));
  const hasCoreSeedTasks = ["task-auth-errors", "task-rules-ci", "task-mobile-board"]
    .every((id) => taskIds.has(id));
  return hasAllSeedProjects && hasCoreSeedTasks;
}
