import { describe, expect, it } from "vitest";
import {
  getEarnedBadgeCount,
  getGuildRank,
  getProgressBadges,
  getTotalGold,
} from "@/lib/badges";
import { createProject, createTask } from "@/lib/workspace";
import type { WorkspaceState } from "@/lib/types";

function emptyState(): WorkspaceState {
  return { version: 2, pace: "steady", projects: [], tasks: [] };
}

describe("progress badges", () => {
  it("starts with no earned badges", () => {
    const state = emptyState();
    expect(getTotalGold(state)).toBe(0);
    expect(getGuildRank(state)).toBe(1);
    expect(getEarnedBadgeCount(state)).toBe(0);
    expect(getProgressBadges(state).every((badge) => !badge.earned)).toBe(true);
  });

  it("awards first landing and gold from a completed task", () => {
    const project = createProject({
      title: "Alpha",
      code: "ALPHA",
      outcome: "Ship",
      targetDate: "2030-01-01",
    });
    const task = createTask({
      title: "Land auth",
      projectId: project.id,
      weight: 2,
      meaning: "Secure entry",
      assignee: "Ada",
      isFocus: false,
    });
    const state: WorkspaceState = {
      version: 2,
      pace: "steady",
      projects: [project],
      tasks: [{ ...task, status: "done", completedAt: "2030-01-02T00:00:00.000Z" }],
    };

    expect(getTotalGold(state)).toBe(20);
    expect(getGuildRank(state)).toBe(1);
    const badges = getProgressBadges(state);
    expect(badges.find((badge) => badge.id === "first-landing")?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === "steady-five")?.earned).toBe(false);
    expect(badges.find((badge) => badge.id === "campaign-complete")?.earned).toBe(true);
  });

  it("reaches rank milestones from accumulated effort", () => {
    const project = createProject({
      title: "Beta",
      code: "BETA",
      outcome: "Ship",
      targetDate: "2030-01-01",
    });
    const tasks = Array.from({ length: 10 }, (_, index) => {
      const task = createTask({
        title: `Ticket ${index + 1}`,
        projectId: project.id,
        weight: 3,
        meaning: "Work",
        assignee: "Ada",
        isFocus: false,
      });
      return { ...task, status: "done" as const, completedAt: "2030-01-02T00:00:00.000Z" };
    });
    const state: WorkspaceState = {
      version: 2,
      pace: "full",
      projects: [project],
      tasks,
    };

    // 10 × weight 3 × 10 = 300 gold → rank 4
    expect(getTotalGold(state)).toBe(300);
    expect(getGuildRank(state)).toBe(4);
    expect(getProgressBadges(state).find((badge) => badge.id === "steady-ten")?.earned).toBe(true);
    expect(getProgressBadges(state).find((badge) => badge.id === "rank-three")?.earned).toBe(true);
  });
});
