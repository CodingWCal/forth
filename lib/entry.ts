import { createSeedWorkspace } from "@/lib/seed";
import type { WorkspaceState } from "@/lib/types";
import { createProject, parseStoredWorkspace } from "@/lib/workspace";

/** Demo persistence is intentionally isolated from legacy/local and cloud data. */
export const DEMO_STORAGE_KEY = "forth.demo.workspace.v2";

export type WorkspaceDirectoryEntry = { id: string };

export function selectPreferredWorkspace<T extends WorkspaceDirectoryEntry>(
  workspaces: T[],
  preferredId: string | null,
  ownerDefaultId?: string,
): T | null {
  if (workspaces.length === 0) return null;
  return workspaces.find((workspace) => workspace.id === preferredId)
    ?? workspaces.find((workspace) => workspace.id === ownerDefaultId)
    ?? workspaces[0];
}

/** Called only after the visitor explicitly chooses the disposable demo. */
export function createExplicitDemoWorkspace(
  storedDemo: string | null,
  referenceDate = new Date(),
): WorkspaceState {
  return parseStoredWorkspace(storedDemo) ?? createSeedWorkspace(referenceDate);
}

/**
 * Create a real first workspace with one user-named campaign and no tickets.
 * A project is required by the current domain contract, but fabricated work is not.
 */
export function createCleanWorkspace(
  input: {
    campaignTitle: string;
    outcome: string;
    targetDate: string;
  },
): WorkspaceState {
  const title = input.campaignTitle.trim();
  if (!title) throw new Error("Enter a name for your first campaign.");
  const outcome = input.outcome.trim();
  if (!outcome) throw new Error("Describe the real outcome for your first campaign.");
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.targetDate);
  if (!dateMatch) throw new Error("Choose a valid target date for your first campaign.");
  const targetDate = new Date(Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
  ));
  if (
    targetDate.getUTCFullYear() !== Number(dateMatch[1])
    || targetDate.getUTCMonth() !== Number(dateMatch[2]) - 1
    || targetDate.getUTCDate() !== Number(dateMatch[3])
  ) throw new Error("Choose a valid target date for your first campaign.");
  const project = createProject({
    title,
    code: title,
    outcome,
    targetDate: input.targetDate,
    color: "moss",
  });

  return {
    version: 2,
    pace: "steady",
    sprite: "code-squire",
    projects: [project],
    tasks: [],
  };
}
