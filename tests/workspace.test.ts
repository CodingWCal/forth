import { describe, expect, it } from "vitest";
import { createSeedWorkspace } from "../lib/seed";
import {
  createTask,
  createProject,
  getFocusTasks,
  getMomentumDays,
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

  it("creates deterministic seed data when the server supplies a render time", () => {
    const renderedAt = new Date("2026-07-16T23:59:59.000Z");
    expect(createSeedWorkspace(renderedAt)).toEqual(createSeedWorkspace(renderedAt));
  });

  it("rejects stored state that could crash project or proof rendering", () => {
    const seed = createSeedWorkspace();
    expect(parseStoredWorkspace(JSON.stringify({ ...seed, projects: [] }))).toBeNull();
    expect(parseStoredWorkspace(JSON.stringify({
      ...seed,
      tasks: [{ ...seed.tasks[0], projectId: "missing-project" }],
    }))).toBeNull();
    expect(parseStoredWorkspace(JSON.stringify({
      ...seed,
      tasks: [{ ...seed.tasks[0], status: "done", completedAt: undefined }],
    }))).toBeNull();
    expect(parseStoredWorkspace(JSON.stringify({
      ...seed,
      tasks: [{ ...seed.tasks[0], dueDate: "not-a-date" }],
    }))).toBeNull();
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
      changes: {
        title: "New quest title",
        description: "New acceptance criteria",
        projectId: seed.projects[1].id,
        priority: "high",
        dueDate: "2026-08-01",
        meaning: "New product purpose",
        weight: 3,
        assignee: "Jon",
        isFocus: false,
      },
    });
    expect(renamed.tasks.find((task) => task.id === target.id)).toMatchObject({
      title: "New quest title",
      description: "New acceptance criteria",
      projectId: seed.projects[1].id,
      priority: "high",
      dueDate: "2026-08-01",
      meaning: "New product purpose",
      weight: 3,
      assignee: "Jon",
      isFocus: false,
    });
    expect(workspaceReducer(renamed, { type: "DELETE_TASK", taskId: target.id }).tasks)
      .toHaveLength(seed.tasks.length - 1);
  });

  it("supports pace, add, focus removal, and full workspace reset actions", () => {
    const seed = createSeedWorkspace();
    const paced = workspaceReducer(seed, { type: "SET_PACE", pace: "light" });
    const task = createTask({
      title: "  Verify production headers  ",
      projectId: seed.projects[0].id,
      meaning: "  Keep the deployment observable.  ",
      weight: 1,
      isFocus: false,
    });
    const added = workspaceReducer(paced, { type: "ADD_TASK", task });
    const focusedTask = getFocusTasks(added)[0];
    const removed = workspaceReducer(added, { type: "TOGGLE_FOCUS", taskId: focusedTask.id });

    expect(paced.pace).toBe("light");
    expect(task.title).toBe("Verify production headers");
    expect(task.meaning).toBe("Keep the deployment observable.");
    expect(added.tasks[0]).toEqual(task);
    expect(removed.tasks.find((item) => item.id === focusedTask.id)?.isFocus).toBe(false);
    expect(workspaceReducer(removed, { type: "RESET", state: seed })).toEqual(seed);
  });

  it("creates a campaign charter and adds it without touching existing work", () => {
    const seed = createSeedWorkspace();
    const project = createProject({
      title: "  Harden private beta  ",
      code: " private beta! ",
      outcome: "  Invitations are safe to accept.  ",
      targetDate: "2026-08-12",
      color: "slate",
    });
    const next = workspaceReducer(seed, { type: "ADD_PROJECT", project });

    expect(project).toMatchObject({
      title: "Harden private beta",
      code: "PRIVATEB",
      outcome: "Invitations are safe to accept.",
      targetDate: "2026-08-12",
      color: "slate",
    });
    expect(next.projects.at(-1)).toEqual(project);
    expect(next.tasks).toEqual(seed.tasks);
  });

  it("adds focus below the limit and rejects missing or completed targets", () => {
    const seed = createSeedWorkspace();
    const focused = seed.tasks.map((task, index) => ({
      ...task,
      isFocus: index === 0,
    }));
    const belowLimit = { ...seed, tasks: focused };
    const candidate = belowLimit.tasks.find((task) => !task.isFocus && task.status !== "done")!;
    const added = workspaceReducer(belowLimit, { type: "TOGGLE_FOCUS", taskId: candidate.id });
    const completed = belowLimit.tasks.find((task) => task.status === "done")!;

    expect(added.tasks.find((task) => task.id === candidate.id)?.isFocus).toBe(true);
    expect(workspaceReducer(added, { type: "TOGGLE_FOCUS", taskId: "missing" })).toBe(added);
    expect(workspaceReducer(added, { type: "TOGGLE_FOCUS", taskId: completed.id })).toBe(added);
  });

  it("leaves unrelated tickets unchanged for unknown update, delete, and status ids", () => {
    const seed = createSeedWorkspace();

    expect(workspaceReducer(seed, {
      type: "UPDATE_TASK",
      taskId: "missing",
      changes: { title: "Never applied" },
    })).toEqual(seed);
    expect(workspaceReducer(seed, { type: "DELETE_TASK", taskId: "missing" })).toEqual(seed);
    expect(workspaceReducer(seed, {
      type: "SET_STATUS",
      taskId: "missing",
      status: "paused",
    })).toEqual(seed);
  });

  it("creates optional ticket fields with safe defaults", () => {
    const seed = createSeedWorkspace();
    const task = createTask({
      title: "Document the release",
      projectId: seed.projects[0].id,
      meaning: "Make the handoff reproducible.",
      weight: 2,
      isFocus: true,
      description: "  Include the complete QA matrix.  ",
      dueDate: "",
      assignee: "  Maya  ",
    });

    expect(task).toMatchObject({
      description: "Include the complete QA matrix.",
      priority: "medium",
      dueDate: undefined,
      status: "ready",
      isFocus: true,
      assignee: "Maya",
    });
    expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
  });

  it("derives seven-day momentum without counting older or unfinished work", () => {
    const now = new Date("2026-07-16T12:00:00.000Z");
    const tasks = [
      { ...createSeedWorkspace().tasks[0], status: "done" as const, weight: 2 as const, completedAt: "2026-07-16T10:00:00.000Z" },
      { ...createSeedWorkspace().tasks[1], status: "done" as const, weight: 3 as const, completedAt: "2026-07-09T10:00:00.000Z" },
      { ...createSeedWorkspace().tasks[2], status: "moving" as const, completedAt: undefined },
    ];
    const momentum = getMomentumDays(tasks, now);

    expect(momentum).toHaveLength(7);
    expect(momentum.at(-1)?.weight).toBe(2);
    expect(momentum.reduce((sum, day) => sum + day.weight, 0)).toBe(2);
  });

  it("can derive hydration-safe momentum against explicit UTC day boundaries", () => {
    const seed = createSeedWorkspace(new Date("2026-07-17T00:30:00.000Z"));
    const tasks = [{
      ...seed.tasks[0],
      status: "done" as const,
      completedAt: "2026-07-16T23:59:59.000Z",
    }];
    const momentum = getMomentumDays(tasks, new Date("2026-07-17T00:30:00.000Z"), true);

    expect(momentum.at(-2)?.weight).toBe(tasks[0].weight);
    expect(momentum.at(-1)?.weight).toBe(0);
  });
});
