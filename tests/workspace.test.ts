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

  it("migrates a valid version 1 browser save to version 2", () => {
    const legacy = { ...createSeedWorkspace(), version: 1 };
    expect(parseStoredWorkspace(JSON.stringify(legacy))?.version).toBe(2);
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

  it("clears completion evidence when a shipped quest returns to the board", () => {
    const seed = createSeedWorkspace();
    const task = seed.tasks[0];
    const shipped = workspaceReducer(seed, {
      type: "SET_STATUS",
      taskId: task.id,
      status: "done",
      at: "2026-07-14T18:00:00.000Z",
    });
    const returned = workspaceReducer(shipped, {
      type: "SET_STATUS",
      taskId: task.id,
      status: "moving",
    });

    expect(returned.tasks.find((item) => item.id === task.id)).toMatchObject({
      status: "moving",
      completedAt: undefined,
    });
  });

  it("derives planned weight and project progress from task data", () => {
    const seed = createSeedWorkspace();
    expect(getPlannedWeight(seed)).toBe(6);
    expect(getProjectProgress(seed, "project-forth")).toBeGreaterThan(0);
    expect(getProjectProgress(seed, "missing-project")).toBe(0);
  });

  it("updates and deletes a ticket without mutating other tickets", () => {
    const seed = createSeedWorkspace();
    const target = seed.tasks[0];
    const renamed = workspaceReducer(seed, {
      type: "UPDATE_TASK",
      taskId: target.id,
      changes: { title: "New quest title", priority: "high", dueDate: "2026-08-01" },
    });
    expect(renamed.tasks.find((task) => task.id === target.id)).toMatchObject({
      title: "New quest title",
      priority: "high",
      dueDate: "2026-08-01",
    });
    expect(workspaceReducer(renamed, { type: "DELETE_TASK", taskId: target.id }).tasks)
      .toHaveLength(seed.tasks.length - 1);
  });
});
