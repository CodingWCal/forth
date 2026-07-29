export type ForthView = "today" | "board" | "proof" | "settings";

const HASH_TO_VIEW: Record<string, ForthView> = {
  today: "today",
  board: "board",
  proof: "proof",
  chronicle: "proof",
  settings: "settings",
  guild: "settings",
  hall: "settings",
};

export function viewFromHash(hash: string): ForthView | null {
  return HASH_TO_VIEW[hash.replace(/^#/, "").toLowerCase()] ?? null;
}

export function hashForView(view: ForthView): string {
  return `#${view}`;
}
