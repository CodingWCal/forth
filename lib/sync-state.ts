/**
 * Cloud sync status helpers for TICKET-002.
 * Keeps save-lifecycle labels and retry copy independent of Firebase UI details
 * so failure/recovery transitions can be unit-tested.
 */

export type CloudSyncPhase =
  | "demo"
  | "local-only"
  | "syncing"
  | "synced"
  | "offline"
  | "retry-required";

export type SyncBadgeInput = {
  mode: "demo" | "cloud";
  phase: CloudSyncPhase;
};

export function resolveCloudSyncPhase(input: {
  mode: "demo" | "cloud";
  online: boolean;
  syncing: boolean;
  dirty: boolean;
  saveFailed: boolean;
}): CloudSyncPhase {
  if (input.mode === "demo") return "demo";
  if (!input.online) return "offline";
  if (input.saveFailed) return "retry-required";
  if (input.syncing) return "syncing";
  if (input.dirty) return "local-only";
  return "synced";
}

export function syncBadgeLabel({ mode, phase }: SyncBadgeInput): string {
  if (mode === "demo") return "Disposable demo - this device only";
  switch (phase) {
    case "synced":
      return "Cloud workspace - saved";
    case "syncing":
      return "Cloud workspace - syncing";
    case "local-only":
      return "Cloud workspace - saved on this device, waiting to sync";
    case "offline":
      return "Cloud workspace - offline; changes stay on this device";
    case "retry-required":
      return "Cloud workspace - sync needs retry";
    case "demo":
      return "Disposable demo - this device only";
  }
}

export function syncStampLabel(phase: CloudSyncPhase): string {
  switch (phase) {
    case "synced":
      return "Cloud rune steady";
    case "syncing":
      return "Cloud rune syncing";
    case "local-only":
      return "Cloud rune waiting";
    case "offline":
      return "Cloud rune offline";
    case "retry-required":
      return "Cloud rune blocked";
    case "demo":
      return "Local parchment only";
  }
}

export function syncFailureCopy(input: {
  online: boolean;
  kind: "save" | "watch" | "validate" | "leave";
}): string {
  if (!input.online) {
    return "You appear offline. Your latest edits stay on this device; reconnect and use Retry cloud sync before switching guilds or signing out.";
  }
  switch (input.kind) {
    case "save":
      return "Forth could not save your latest changes to the cloud. Your edits remain on this device — stay in this workspace and retry before switching or signing out.";
    case "watch":
      return "Live cloud updates were interrupted. Your visible workspace remains in place; retry saving before leaving it.";
    case "validate":
      return "Forth could not validate this workspace. No tickets can be edited until cloud sync succeeds.";
    case "leave":
      return "Forth could not finish leaving this workspace. Your saved cloud data was not changed; try again.";
  }
}

export function shouldAttemptLocalRetry(input: {
  dirty: boolean;
  pendingSaves: number;
}): boolean {
  return input.dirty || input.pendingSaves > 0;
}
