import { describe, expect, it } from "vitest";
import { createSeedWorkspace } from "../lib/seed";
import {
  createTask,
  createProject,
  getDaysUntilDue,
  getDueSoonTasks,
  getFocusTasks,
  getMomentumDays,
  getNextLocalDayDelay,
  getPlannedWeight,
  getProjectProgress,
  getTaskTiming,
  parseStoredWorkspace,
  workspaceReducer,
} from "../lib/workspace";
import type { Task } from "../lib/types";

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
    expect(parseStoredWorkspace(JSON.stringify({
      ...seed,
      tasks: [{ ...seed.tasks[0], dueDate: "2026-02-30" }],
    }))).toBeNull();
  });

  it("migrates a valid version 1 browser save to version 2", () => {
    const legacy = { ...createSeedWorkspace(), version: 1 };
    expect(parseStoredWorkspace(JSON.stringify(legacy))?.version).toBe(2);
  });

  it("defaults legacy saves to the code squire and rejects unknown sprites", () => {
    const seed = createSeedWorkspace();
    const legacy = { ...seed, sprite: undefined };

    expect(parseStoredWorkspace(JSON.stringify(legacy))?.sprite).toBe("code-squire");
    expect(parseStoredWorkspace(JSON.stringify({ ...seed, sprite: "ambiguous-squire" }))?.sprite)
      .toBe("ambiguous-squire");
    expect(parseStoredWorkspace(JSON.stringify({ ...seed, sprite: "ambiguos-squire" }))?.sprite)
      .toBe("ambiguous-squire");
    expect(parseStoredWorkspace(JSON.stringify({ ...seed, sprite: "missing-squire" }))).toBeNull();
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

  it("archives completed tickets reversibly without allowing active tickets to disappear", () => {
    const seed = createSeedWorkspace();
    const completed = workspaceReducer(seed, {
      type: "SET_STATUS",
      taskId: seed.tasks[0].id,
      status: "done",
      at: "2026-07-14T18:00:00.000Z",
    });
    const archived = workspaceReducer(completed, { type: "ARCHIVE_TASK", taskId: seed.tasks[0].id });
    const archivedTask = archived.tasks.find((task) => task.id === seed.tasks[0].id);
    expect(archivedTask).toMatchObject({ status: "done", archived: true, isFocus: false });
    expect(workspaceReducer(seed, { type: "ARCHIVE_TASK", taskId: seed.tasks[1].id })).toEqual(seed);
    expect(workspaceReducer(archived, { type: "RESTORE_TASK", taskId: seed.tasks[0].id })
      .tasks.find((task) => task.id === seed.tasks[0].id)?.archived).toBe(false);
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
    expect(workspaceReducer(paced, { type: "SET_SPRITE", sprite: "ambiguous-squire" }).sprite)
      .toBe("ambiguous-squire");
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

describe("due-date timing", () => {
  // Local noon so the calendar-day math is stable regardless of the test machine's zone.
  const now = new Date("2026-07-20T12:00:00");

  function questWithDue(dueDate: string | undefined, overrides: Partial<Task> = {}): Task {
    const base = createSeedWorkspace().tasks[0];
    return { ...base, id: `t-${dueDate ?? "none"}-${overrides.status ?? "ready"}`, dueDate, ...overrides };
  }

  it("counts whole calendar days to the due date, signed for overdue", () => {
    expect(getDaysUntilDue(questWithDue("2026-07-20"), now)).toBe(0);
    expect(getDaysUntilDue(questWithDue("2026-07-23"), now)).toBe(3);
    expect(getDaysUntilDue(questWithDue("2026-07-18"), now)).toBe(-2);
    expect(getDaysUntilDue(questWithDue(undefined), now)).toBeNull();
    expect(getDaysUntilDue(questWithDue("2026-02-30"), now)).toBeNull();
    expect(getDaysUntilDue(questWithDue("2026-07-20"), new Date("invalid"))).toBeNull();
  });

  it("uses calendar dates at the start and end of a local day", () => {
    const startOfDay = new Date(2026, 6, 20, 0, 1);
    const endOfDay = new Date(2026, 6, 20, 23, 59);
    expect(getDaysUntilDue(questWithDue("2026-07-20"), startOfDay)).toBe(0);
    expect(getDaysUntilDue(questWithDue("2026-07-20"), endOfDay)).toBe(0);
  });

  it("handles month, year, leap-day, and daylight-saving calendar boundaries", () => {
    expect(getDaysUntilDue(questWithDue("2027-01-01"), new Date(2026, 11, 31, 23, 59))).toBe(1);
    expect(getDaysUntilDue(questWithDue("2028-02-29"), new Date(2028, 1, 28, 12))).toBe(1);
    expect(getDaysUntilDue(questWithDue("2026-03-09"), new Date(2026, 2, 8, 12))).toBe(1);
    expect(getDaysUntilDue(questWithDue("2026-11-02"), new Date(2026, 10, 1, 12))).toBe(1);
  });

  it("calculates a bounded refresh just after the next local midnight", () => {
    expect(getNextLocalDayDelay(new Date(2026, 6, 20, 23, 59, 59, 900))).toBe(150);
    expect(getNextLocalDayDelay(new Date("invalid"))).toBe(1);
  });

  it("classifies timing into overdue, due-today, due-soon, later, and none", () => {
    expect(getTaskTiming(questWithDue("2026-07-18"), now).category).toBe("overdue");
    expect(getTaskTiming(questWithDue("2026-07-20"), now).category).toBe("due-today");
    expect(getTaskTiming(questWithDue("2026-07-22"), now).category).toBe("due-soon");
    expect(getTaskTiming(questWithDue("2026-07-23"), now).category).toBe("due-soon");
    expect(getTaskTiming(questWithDue("2026-07-24"), now).category).toBe("later");
    expect(getTaskTiming(questWithDue(undefined), now).category).toBe("none");
  });

  it("honors a custom due-soon window", () => {
    expect(getTaskTiming(questWithDue("2026-07-27"), now, 7).category).toBe("due-soon");
    expect(getTaskTiming(questWithDue("2026-07-28"), now, 7).category).toBe("later");
  });

  it("collects only unshipped, dated quests inside the window, most pressing first", () => {
    const state = {
      version: 2 as const,
      pace: "steady" as const,
      sprite: "code-squire" as const,
      projects: createSeedWorkspace().projects,
      tasks: [
        questWithDue("2026-07-22", { id: "soon" }), // due-soon (+2)
        questWithDue("2026-07-17", { id: "overdue" }), // overdue (-3)
        questWithDue("2026-07-20", { id: "today" }), // due-today (0)
        questWithDue("2026-08-15", { id: "later" }), // outside window
        questWithDue(undefined, { id: "undated" }), // no due date
        questWithDue("2026-07-19", { id: "shipped", status: "done", completedAt: now.toISOString() }), // shipped
      ],
    };
    const due = getDueSoonTasks(state, now);
    expect(due.map((entry) => entry.task.id)).toEqual(["overdue", "today", "soon"]);
    expect(due.map((entry) => entry.category)).toEqual(["overdue", "due-today", "due-soon"]);
    expect(due[0].daysUntilDue).toBe(-3);
  });

  it("breaks same-day ties by heavier weight, then title", () => {
    const state = {
      version: 2 as const,
      pace: "steady" as const,
      sprite: "code-squire" as const,
      projects: createSeedWorkspace().projects,
      tasks: [
        questWithDue("2026-07-22", { id: "light", title: "Amber", weight: 1 }),
        questWithDue("2026-07-22", { id: "heavy", title: "Zephyr", weight: 3 }),
      ],
    };
    expect(getDueSoonTasks(state, now).map((entry) => entry.task.id)).toEqual(["heavy", "light"]);
  });

  it("returns the complete due set so presentation can cap without losing work", () => {
    const state = {
      version: 2 as const,
      pace: "steady" as const,
      sprite: "code-squire" as const,
      projects: createSeedWorkspace().projects,
      tasks: Array.from({ length: 9 }, (_, index) =>
        questWithDue("2026-07-21", { id: `due-${index}`, title: `Quest ${index}` }),
      ),
    };
    expect(getDueSoonTasks(state, now)).toHaveLength(9);
  });
});
