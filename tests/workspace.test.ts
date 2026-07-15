import { describe, expect, it } from "vitest";
import { createSeedWorkspace } from "../lib/seed";
import {
  getFocusTasks,
  getPlannedWeight,
  getProjectProgress,
  parseStoredWorkspace,
  workspaceReducer,
} from "../lib/workspace";

describe("workspace state", () => {
  it("restores only valid versioned state", () => {
    const seed = createSeedWorkspace();
    expect(parseStoredWorkspace(JSON.stringify(seed))).toEqual(seed);
    expect(parseStoredWorkspace("not json")).toBeNull();
    expect(parseStoredWorkspace('{"version":99}')).toBeNull();
  });

  it("keeps the focus list to three moves", () => {
    const seed = createSeedWorkspace();
    const candidate = seed.tasks.find((task) => !task.isFocus && task.status !== "done");
    expect(candidate).toBeDefined();
    const next = workspaceReducer(seed, { type: "TOGGLE_FOCUS", taskId: candidate!.id });
    expect(getFocusTasks(next)).toHaveLength(3);
    expect(next).toEqual(seed);
  });

  it("records completion and removes a landed move from focus", () => {
    const seed = createSeedWorkspace();
    const task = getFocusTasks(seed)[0];
    const completedAt = "2026-07-14T18:00:00.000Z";
    const next = workspaceReducer(seed, {
      type: "SET_STATUS",
      taskId: task.id,
      status: "done",
      at: completedAt,
    });
    const completed = next.tasks.find((item) => item.id === task.id);
    expect(completed?.status).toBe("done");
    expect(completed?.completedAt).toBe(completedAt);
    expect(completed?.isFocus).toBe(false);
  });

  it("derives planned weight and project progress from task data", () => {
    const seed = createSeedWorkspace();
    expect(getPlannedWeight(seed)).toBe(6);
    expect(getProjectProgress(seed, "project-forth")).toBeGreaterThan(0);
    expect(getProjectProgress(seed, "missing-project")).toBe(0);
  });
});
