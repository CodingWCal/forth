import type { Pace, TaskStatus } from "@/lib/types";
import type { LayoutMode } from "@/lib/preferences";

export type NavView = "today" | "board" | "proof" | "settings";

type Bilingual = { fantasy: string; plain: string };

const NAV: Record<NavView, Bilingual> = {
  today: { fantasy: "Quest Log", plain: "Today" },
  board: { fantasy: "Realm Map", plain: "Board" },
  proof: { fantasy: "Chronicle", plain: "Completed" },
  settings: { fantasy: "Guild Hall", plain: "Settings" },
};

const NAV_SHORT: Record<NavView, Bilingual> = {
  today: { fantasy: "Quest Log", plain: "Today" },
  board: { fantasy: "Map", plain: "Board" },
  proof: { fantasy: "Chronicle", plain: "Done" },
  settings: { fantasy: "Guild Hall", plain: "Settings" },
};

const STATUS: Record<TaskStatus, Bilingual> = {
  ready: { fantasy: "Quest Log", plain: "Ready" },
  moving: { fantasy: "In Forge", plain: "In progress" },
  paused: { fantasy: "Camped", plain: "Paused" },
  done: { fantasy: "Shipped", plain: "Done" },
};

const PACE: Record<Pace, { fantasy: Bilingual; hint: Bilingual }> = {
  light: {
    fantasy: { fantasy: "Scout", plain: "Light" },
    hint: { fantasy: "A short expedition", plain: "A lighter day" },
  },
  steady: {
    fantasy: { fantasy: "Venture", plain: "Steady" },
    hint: { fantasy: "A grounded build day", plain: "A balanced day" },
  },
  full: {
    fantasy: { fantasy: "Raid", plain: "Full" },
    hint: { fantasy: "Deep-work reserves ready", plain: "A deep-work day" },
  },
};

const PAGE_TITLE: Record<NavView, Bilingual> = {
  today: {
    fantasy: "Choose today’s three quests.",
    plain: "Choose today’s three tasks.",
  },
  board: {
    fantasy: "Survey the engineering realm.",
    plain: "Review your project board.",
  },
  proof: {
    fantasy: "Read what the guild has shipped.",
    plain: "Review completed work.",
  },
  settings: {
    fantasy: "Tend the guild hall.",
    plain: "Manage your workspace.",
  },
};

function pick(entry: Bilingual, mode: LayoutMode): string {
  return mode === "calm" ? entry.plain : entry.fantasy;
}

export type DisplayTerms = {
  mode: LayoutMode;
  nav: Record<NavView, string>;
  navShort: Record<NavView, string>;
  status: Record<TaskStatus, string>;
  pace: Record<Pace, { label: string; hint: string }>;
  pageTitle: Record<NavView, string>;
  projectsEyebrow: string;
  newTask: string;
  newProject: string;
  hudEyebrow: (level: number) => string;
  hudTitle: string;
  xpRemaining: (remaining: number) => string;
  goldLabel: string;
  completedLabel: string;
  paceEyebrow: string;
  paceTitle: string;
  energyLabel: string;
  focusEyebrow: string;
  focusTitle: string;
  openBoard: string;
  emptyFocusTitle: string;
  emptyFocusHint: string;
  dueEyebrow: string;
  dueTitle: string;
  momentumEyebrow: string;
  momentumTitle: string;
  shippedToast: (title: string, gold: number) => string;
  statusToast: (title: string, status: TaskStatus) => string;
};

export function getDisplayTerms(mode: LayoutMode): DisplayTerms {
  const calm = mode === "calm";

  return {
    mode,
    nav: {
      today: pick(NAV.today, mode),
      board: pick(NAV.board, mode),
      proof: pick(NAV.proof, mode),
      settings: pick(NAV.settings, mode),
    },
    navShort: {
      today: pick(NAV_SHORT.today, mode),
      board: pick(NAV_SHORT.board, mode),
      proof: pick(NAV_SHORT.proof, mode),
      settings: pick(NAV_SHORT.settings, mode),
    },
    status: {
      ready: pick(STATUS.ready, mode),
      moving: pick(STATUS.moving, mode),
      paused: pick(STATUS.paused, mode),
      done: pick(STATUS.done, mode),
    },
    pace: {
      light: {
        label: pick(PACE.light.fantasy, mode),
        hint: pick(PACE.light.hint, mode),
      },
      steady: {
        label: pick(PACE.steady.fantasy, mode),
        hint: pick(PACE.steady.hint, mode),
      },
      full: {
        label: pick(PACE.full.fantasy, mode),
        hint: pick(PACE.full.hint, mode),
      },
    },
    pageTitle: {
      today: pick(PAGE_TITLE.today, mode),
      board: pick(PAGE_TITLE.board, mode),
      proof: pick(PAGE_TITLE.proof, mode),
      settings: pick(PAGE_TITLE.settings, mode),
    },
    projectsEyebrow: calm ? "Active projects" : "Active campaigns",
    newTask: calm ? "New task" : "New quest",
    newProject: calm ? "New project" : "New campaign",
    hudEyebrow: (level) => (calm ? `Progress · Level ${level}` : `Engineer class · Rank ${level}`),
    hudTitle: calm ? "Your progress" : "Code Squire",
    xpRemaining: (remaining) =>
      calm ? `${remaining} effort until the next level` : `${remaining} craft XP until the next rank`,
    goldLabel: calm ? "Effort points" : "Gold",
    completedLabel: calm ? "Completed" : "Quests",
    paceEyebrow: calm ? "I · Daily capacity" : "I · Choose provisions",
    paceTitle: calm ? "How much can you take on today?" : "How far can the party travel?",
    energyLabel: calm ? "effort" : "energy",
    focusEyebrow: calm ? "II · Today’s focus" : "II · Ready the party",
    focusTitle: calm ? "Today’s three tasks" : "Today’s three quests",
    openBoard: calm ? "Open board" : "Open realm map",
    emptyFocusTitle: calm ? "Add another task" : "Take another quest",
    emptyFocusHint: calm
      ? "Only three unfinished tasks may stay in Today."
      : "Only three may travel in the active party.",
    dueEyebrow: calm ? "Deadlines" : "Mind the horizon",
    dueTitle: "Due soon and overdue",
    momentumEyebrow: calm ? "III · Recent progress" : "III · Read the campaign",
    momentumTitle: calm ? "Last seven days" : "Seven-day expedition",
    shippedToast: (title, gold) =>
      calm
        ? `Completed: ${title} · +${gold} effort points`
        : `Quest shipped: ${title} · +${gold} gold`,
    statusToast: (title, status) =>
      `${title} is now ${pick(STATUS[status], mode).toLowerCase()}.`,
  };
}

/** Canonical bilingual pairs for tests and documentation. */
export const TERMINOLOGY_MAP = {
  nav: NAV,
  status: STATUS,
  pace: PACE,
  pageTitle: PAGE_TITLE,
} as const;
