import { readBrowserStorage, writeBrowserStorage } from "@/lib/browser-storage";

/** Device-local layout preference. Kept out of WorkspaceState (never cloud-synced). */
export type LayoutMode = "adventure" | "calm";

export const LAYOUT_PREF_KEY = "forth.layout.v1";

export function layoutPreferenceKey(
  mode: "demo" | "cloud",
  uid?: string,
): string {
  return mode === "cloud" && uid
    ? `${LAYOUT_PREF_KEY}.cloud.${uid}`
    : `${LAYOUT_PREF_KEY}.demo`;
}

export function parseLayoutMode(value: string | null | undefined): LayoutMode {
  return value === "calm" ? "calm" : "adventure";
}

export function readLayoutMode(storageKey: string): LayoutMode {
  return parseLayoutMode(readBrowserStorage(storageKey).value);
}

export function writeLayoutMode(storageKey: string, layout: LayoutMode): boolean {
  return writeBrowserStorage(storageKey, layout);
}

export const LAYOUT_OPTIONS: Array<{
  id: LayoutMode;
  title: string;
  summary: string;
}> = [
  {
    id: "adventure",
    title: "Adventure",
    summary: "Full guild theme with fantasy labels, sprites, and a playful rank HUD.",
  },
  {
    id: "calm",
    title: "Calm",
    summary: "Plain project labels, larger text, and quieter chrome — same work tools, less game feel.",
  },
];
