import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSeedWorkspace } from "../lib/seed";
import { getSeedFingerprint, looksLikeEngineeringSeed } from "../lib/seed-detection";
import {
  hasMigrationDecision,
  migrationStorageKey,
  MIGRATION_STATE_KEY,
  readMigrationRecord,
  recordMigrationChoice,
} from "../lib/migration";
import { createCleanWorkspace } from "../lib/entry";

describe("seed detection", () => {
  it("recognizes the canonical engineering demo workspace", () => {
    expect(looksLikeEngineeringSeed(createSeedWorkspace(new Date("2026-07-20T12:00:00.000Z")))).toBe(true);
  });

  it("does not flag a clean real workspace as seed content", () => {
    const clean = createCleanWorkspace({
      campaignTitle: "Real project",
      outcome: "Ship something meaningful.",
      targetDate: "2026-08-20",
    });
    expect(looksLikeEngineeringSeed(clean)).toBe(false);
  });

  it("returns a stable fingerprint for the demo template", () => {
    expect(getSeedFingerprint()).toContain("project-forth");
    expect(getSeedFingerprint()).toContain("task-auth-errors");
  });
});

describe("migration records", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
      },
    });
  });

  it("stores and reads a migration decision per user and workspace", () => {
    const userId = "user-test";
    const workspaceId = "guild-test";
    const fingerprint = getSeedFingerprint();

    expect(hasMigrationDecision(userId, workspaceId, fingerprint)).toBe(false);

    recordMigrationChoice({
      userId,
      workspaceId,
      seedFingerprint: fingerprint,
      choice: "keep",
    });

    expect(hasMigrationDecision(userId, workspaceId, fingerprint)).toBe(true);
    expect(readMigrationRecord(userId, workspaceId)?.choice).toBe("keep");
    expect(migrationStorageKey(userId, workspaceId)).toBe(`${MIGRATION_STATE_KEY}.${userId}.${workspaceId}`);
  });
});
