import { readBrowserStorage, writeBrowserStorage } from "@/lib/browser-storage";

export const MIGRATION_STATE_KEY = "forth.migration.v1";

export type MigrationChoice = "keep" | "replace-demo" | "start-empty";

export type MigrationRecord = {
  schemaVersion: 1;
  seedFingerprint: string;
  choice: MigrationChoice;
  decidedAt: string;
  workspaceId: string;
  userId: string;
};

export function migrationStorageKey(userId: string, workspaceId: string) {
  return `${MIGRATION_STATE_KEY}.${userId}.${workspaceId}`;
}

export function readMigrationRecord(userId: string, workspaceId: string): MigrationRecord | null {
  const raw = readBrowserStorage(migrationStorageKey(userId, workspaceId)).value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MigrationRecord;
    if (
      parsed.schemaVersion !== 1
      || parsed.workspaceId !== workspaceId
      || parsed.userId !== userId
      || !["keep", "replace-demo", "start-empty"].includes(parsed.choice)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeMigrationRecord(record: MigrationRecord) {
  writeBrowserStorage(
    migrationStorageKey(record.userId, record.workspaceId),
    JSON.stringify(record),
  );
}

export function hasMigrationDecision(
  userId: string,
  workspaceId: string,
  seedFingerprint: string,
): boolean {
  const record = readMigrationRecord(userId, workspaceId);
  return record?.seedFingerprint === seedFingerprint;
}

export function recordMigrationChoice(input: {
  userId: string;
  workspaceId: string;
  seedFingerprint: string;
  choice: MigrationChoice;
}) {
  writeMigrationRecord({
    schemaVersion: 1,
    seedFingerprint: input.seedFingerprint,
    choice: input.choice,
    decidedAt: new Date().toISOString(),
    workspaceId: input.workspaceId,
    userId: input.userId,
  });
}

export function clearMigrationRecord(userId: string, workspaceId: string) {
  writeBrowserStorage(migrationStorageKey(userId, workspaceId), "");
}
