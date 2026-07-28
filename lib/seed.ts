import type { Project, Task, WorkspaceState } from "@/lib/types";

const day = 86_400_000;

function isoFromNow(referenceDate: Date, days: number, hour = 12) {
  const date = new Date(referenceDate);
  date.setHours(hour, 0, 0, 0);
  date.setTime(date.getTime() + days * day);
  return date.toISOString();
}

function dateFromNow(referenceDate: Date, days: number) {
  const date = new Date(referenceDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function createSeedWorkspace(referenceDate = new Date()): WorkspaceState {
  const projects: Project[] = [
    {
      id: "project-forth",
      title: "Forth Core",
      code: "CORE",
      outcome: "Ship a fast, dependable ticket workflow that developers can trust every day.",
      color: "clay",
      targetDate: isoFromNow(referenceDate, 18),
    },
    {
      id: "project-stories",
      title: "Cloud Keep",
      code: "SYNC",
      outcome: "Keep every authenticated workspace private, synchronized, and recoverable.",
      color: "moss",
      targetDate: isoFromNow(referenceDate, 31),
    },
    {
      id: "project-fieldnotes",
      title: "Release Gate",
      code: "QA",
      outcome: "Make each production deploy observable, accessible, secure, and boring in the best way.",
      color: "slate",
      targetDate: isoFromNow(referenceDate, 46),
    },
  ];

  const tasks: Task[] = [
    {
      id: "task-auth-errors",
      title: "Surface actionable Firebase sync errors",
      description: "Replace silent persistence failures with a visible state, error code, and retry path.",
      projectId: "project-stories",
      status: "moving",
      priority: "high",
      dueDate: dateFromNow(referenceDate, 2),
      weight: 2,
      meaning: "A developer should know whether work is local, syncing, saved, or blocked.",
      assignee: "Calvin",
      isFocus: true,
      createdAt: isoFromNow(referenceDate, -2),
    },
    {
      id: "task-rules-ci",
      title: "Run Firestore rules tests in CI",
      description: "Add the emulator-backed authorization suite to the pull-request quality gate.",
      projectId: "project-stories",
      status: "ready",
      priority: "high",
      dueDate: dateFromNow(referenceDate, 4),
      weight: 3,
      meaning: "Authorization regressions should fail before they can reach production.",
      assignee: "Calvin",
      isFocus: true,
      createdAt: isoFromNow(referenceDate, -1),
    },
    {
      id: "task-mobile-board",
      title: "Verify the quest board at 375px",
      description: "Exercise search, status changes, ticket creation, and horizontal board navigation on a phone viewport.",
      projectId: "project-fieldnotes",
      status: "ready",
      priority: "medium",
      dueDate: dateFromNow(referenceDate, 3),
      weight: 1,
      meaning: "Core ticket actions must remain reachable when the workstation is a phone.",
      assignee: "Maya",
      isFocus: true,
      createdAt: isoFromNow(referenceDate, -1),
    },
    {
      id: "task-offline-copy",
      title: "Define offline and recovery copy",
      description: "Document what happens when Firestore is unavailable and how the local fallback reconciles later.",
      projectId: "project-stories",
      status: "paused",
      priority: "medium",
      weight: 2,
      meaning: "A temporary network failure should never feel like lost work.",
      assignee: "Maya",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -3),
    },
    {
      id: "task-keyboard-dialog",
      title: "Audit keyboard flow in the ticket dialog",
      description: "Check focus entry, field order, Escape behavior, validation, and focus return.",
      projectId: "project-fieldnotes",
      status: "ready",
      priority: "medium",
      dueDate: dateFromNow(referenceDate, 7),
      weight: 2,
      meaning: "Creating work should not require a mouse.",
      assignee: "Jon",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -2),
    },
    {
      id: "task-domain-events",
      title: "Extract workspace persistence events",
      description: "Separate sync lifecycle events from view state so error handling can be tested independently.",
      projectId: "project-forth",
      status: "ready",
      priority: "low",
      weight: 3,
      meaning: "A clear persistence boundary makes future collaboration features safer to add.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -1),
    },
    {
      id: "done-schema",
      title: "Add ticket priority and due-date fields",
      projectId: "project-forth",
      status: "done",
      priority: "high",
      weight: 2,
      meaning: "The work map now carries enough context for real sprint decisions.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -8),
      completedAt: isoFromNow(referenceDate, -6, 16),
    },
    {
      id: "done-auth",
      title: "Connect Google authentication",
      projectId: "project-stories",
      status: "done",
      priority: "high",
      weight: 2,
      meaning: "Each engineer can enter a private workspace with a verified identity.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -6),
      completedAt: isoFromNow(referenceDate, -4, 11),
    },
    {
      id: "done-rules",
      title: "Publish owner-scoped Firestore rules",
      projectId: "project-stories",
      status: "done",
      priority: "high",
      weight: 3,
      meaning: "Anonymous visitors and unrelated accounts cannot read guild workspaces.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -5),
      completedAt: isoFromNow(referenceDate, -3, 15),
    },
    {
      id: "done-reducer",
      title: "Cover workspace transitions with unit tests",
      projectId: "project-fieldnotes",
      status: "done",
      priority: "medium",
      weight: 2,
      meaning: "Ready, moving, paused, and shipped behavior now has a repeatable safety net.",
      assignee: "Maya",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -4),
      completedAt: isoFromNow(referenceDate, -1, 17),
    },
    {
      id: "done-deploy",
      title: "Deploy the private beta to Vercel",
      projectId: "project-fieldnotes",
      status: "done",
      priority: "medium",
      weight: 1,
      meaning: "The team has a stable production URL for real workflow testing.",
      assignee: "Jon",
      isFocus: false,
      createdAt: isoFromNow(referenceDate, -2),
      completedAt: isoFromNow(referenceDate, 0, 9),
    },
  ];

  return { version: 2, pace: "steady", sprite: "code-squire", projects, tasks };
}
