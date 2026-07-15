import type { Project, Task, WorkspaceState } from "@/lib/types";

const day = 86_400_000;

function isoFromNow(days: number, hour = 12) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setTime(date.getTime() + days * day);
  return date.toISOString();
}

export function createSeedWorkspace(): WorkspaceState {
  const projects: Project[] = [
    {
      id: "project-forth",
      title: "Forth private beta",
      code: "FOR",
      outcome: "Give small teams a project space they genuinely want to open each morning.",
      color: "clay",
      targetDate: isoFromNow(18),
    },
    {
      id: "project-stories",
      title: "Member stories",
      code: "STR",
      outcome: "Turn five builder journeys into honest, useful launch stories.",
      color: "moss",
      targetDate: isoFromNow(31),
    },
    {
      id: "project-fieldnotes",
      title: "Field notes library",
      code: "FLD",
      outcome: "Publish a reusable playbook for thoughtful agent-assisted building.",
      color: "slate",
      targetDate: isoFromNow(46),
    },
  ];

  const tasks: Task[] = [
    {
      id: "task-promise",
      title: "Name the five-second product promise",
      projectId: "project-forth",
      status: "moving",
      weight: 2,
      meaning: "A clear promise gives every later product decision a filter.",
      assignee: "Calvin",
      isFocus: true,
      createdAt: isoFromNow(-2),
    },
    {
      id: "task-pace",
      title: "Prototype the daily pace ritual",
      projectId: "project-forth",
      status: "ready",
      weight: 3,
      meaning: "A believable plan should feel motivating before any task is checked off.",
      assignee: "Calvin",
      isFocus: true,
      createdAt: isoFromNow(-1),
    },
    {
      id: "task-mobile",
      title: "Test task completion at 375 px",
      projectId: "project-forth",
      status: "ready",
      weight: 1,
      meaning: "Momentum should be available wherever the work happens.",
      assignee: "Maya",
      isFocus: true,
      createdAt: isoFromNow(-1),
    },
    {
      id: "task-launch-story",
      title: "Draft the private-beta invitation",
      projectId: "project-stories",
      status: "paused",
      weight: 2,
      meaning: "The invitation should attract thoughtful testers, not passive sign-ups.",
      assignee: "Maya",
      isFocus: false,
      createdAt: isoFromNow(-3),
    },
    {
      id: "task-interviews",
      title: "Schedule three builder interviews",
      projectId: "project-stories",
      status: "ready",
      weight: 2,
      meaning: "Real language keeps the launch story grounded in people, not claims.",
      assignee: "Jon",
      isFocus: false,
      createdAt: isoFromNow(-2),
    },
    {
      id: "task-agent-notes",
      title: "Outline the agent handoff chapter",
      projectId: "project-fieldnotes",
      status: "ready",
      weight: 3,
      meaning: "Future builders need a repeatable way to hand context to coding agents.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(-1),
    },
    {
      id: "done-research",
      title: "Compare motivation patterns across four tools",
      projectId: "project-forth",
      status: "done",
      weight: 2,
      meaning: "The product now has a defendable gap instead of a feature collage.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(-8),
      completedAt: isoFromNow(-6, 16),
    },
    {
      id: "done-language",
      title: "Replace shame states with recovery language",
      projectId: "project-forth",
      status: "done",
      weight: 1,
      meaning: "Paused work can be discussed without making the person feel behind.",
      assignee: "Maya",
      isFocus: false,
      createdAt: isoFromNow(-6),
      completedAt: isoFromNow(-4, 11),
    },
    {
      id: "done-story-frame",
      title: "Choose the member-story interview frame",
      projectId: "project-stories",
      status: "done",
      weight: 2,
      meaning: "Every interview will now capture tension, turning point, and practical lesson.",
      assignee: "Jon",
      isFocus: false,
      createdAt: isoFromNow(-5),
      completedAt: isoFromNow(-3, 15),
    },
    {
      id: "done-tokens",
      title: "Set the field-journal design tokens",
      projectId: "project-forth",
      status: "done",
      weight: 2,
      meaning: "The interface has a recognizable visual grammar without generic AI styling.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(-4),
      completedAt: isoFromNow(-1, 17),
    },
    {
      id: "done-glossary",
      title: "Start the agentic workflow glossary",
      projectId: "project-fieldnotes",
      status: "done",
      weight: 1,
      meaning: "Technical decisions can be explained in language a new builder can reuse.",
      assignee: "Calvin",
      isFocus: false,
      createdAt: isoFromNow(-2),
      completedAt: isoFromNow(0, 9),
    },
  ];

  return { version: 1, pace: "steady", projects, tasks };
}
