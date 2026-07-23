import type { WorkspaceState } from "@/lib/types";

export type BadgeId =
  | "first-landing"
  | "steady-five"
  | "steady-ten"
  | "rank-two"
  | "rank-three"
  | "campaign-complete";

export type ProgressBadge = {
  id: BadgeId;
  title: string;
  description: string;
  earned: boolean;
  /** Optional count progress toward the milestone (never a public grade). */
  progress?: { current: number; target: number };
};

export function getCompletedTaskCount(state: WorkspaceState): number {
  return state.tasks.filter((task) => task.status === "done").length;
}

/** Same reward math as the Today HUD: effort weight × 10. */
export function getTotalGold(state: WorkspaceState): number {
  return state.tasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + task.weight * 10, 0);
}

export function getGuildRank(state: WorkspaceState): number {
  return Math.floor(getTotalGold(state) / 100) + 1;
}

function hasCompletedCampaign(state: WorkspaceState): boolean {
  return state.projects.some((project) => {
    const tasks = state.tasks.filter((task) => task.projectId === project.id);
    return tasks.length > 0 && tasks.every((task) => task.status === "done");
  });
}

/**
 * Private, derived milestones from completed work.
 * No streaks, leaderboards, or punishment — only recognition of progress already in the ledger.
 */
export function getProgressBadges(state: WorkspaceState): ProgressBadge[] {
  const completed = getCompletedTaskCount(state);
  const rank = getGuildRank(state);
  const campaignDone = hasCompletedCampaign(state);

  return [
    {
      id: "first-landing",
      title: "First landing",
      description: "Complete your first task.",
      earned: completed >= 1,
      progress: { current: Math.min(completed, 1), target: 1 },
    },
    {
      id: "steady-five",
      title: "Steady hand",
      description: "Complete five tasks.",
      earned: completed >= 5,
      progress: { current: Math.min(completed, 5), target: 5 },
    },
    {
      id: "steady-ten",
      title: "Reliable finisher",
      description: "Complete ten tasks.",
      earned: completed >= 10,
      progress: { current: Math.min(completed, 10), target: 10 },
    },
    {
      id: "rank-two",
      title: "Rising rank",
      description: "Reach rank 2 from shipped effort.",
      earned: rank >= 2,
      progress: { current: Math.min(rank, 2), target: 2 },
    },
    {
      id: "rank-three",
      title: "Seasoned craft",
      description: "Reach rank 3 from shipped effort.",
      earned: rank >= 3,
      progress: { current: Math.min(rank, 3), target: 3 },
    },
    {
      id: "campaign-complete",
      title: "Campaign closed",
      description: "Finish every task in a project.",
      earned: campaignDone,
      progress: { current: campaignDone ? 1 : 0, target: 1 },
    },
  ];
}

export function getEarnedBadgeCount(state: WorkspaceState): number {
  return getProgressBadges(state).filter((badge) => badge.earned).length;
}
