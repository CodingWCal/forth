import { describe, expect, it } from "vitest";
import {
  resolveCloudSyncPhase,
  shouldAttemptLocalRetry,
  syncBadgeLabel,
  syncFailureCopy,
  syncStampLabel,
} from "@/lib/sync-state";

describe("resolveCloudSyncPhase", () => {
  it("keeps demo mode isolated from cloud states", () => {
    expect(
      resolveCloudSyncPhase({
        mode: "demo",
        online: false,
        syncing: true,
        dirty: true,
        saveFailed: true,
      }),
    ).toBe("demo");
  });

  it("prefers offline over syncing or retry", () => {
    expect(
      resolveCloudSyncPhase({
        mode: "cloud",
        online: false,
        syncing: true,
        dirty: true,
        saveFailed: true,
      }),
    ).toBe("offline");
  });

  it("surfaces retry-required after a failed save while online", () => {
    expect(
      resolveCloudSyncPhase({
        mode: "cloud",
        online: true,
        syncing: false,
        dirty: true,
        saveFailed: true,
      }),
    ).toBe("retry-required");
  });

  it("marks dirty local work as local-only until acknowledged", () => {
    expect(
      resolveCloudSyncPhase({
        mode: "cloud",
        online: true,
        syncing: false,
        dirty: true,
        saveFailed: false,
      }),
    ).toBe("local-only");
  });

  it("reports synced only when clean and acknowledged", () => {
    expect(
      resolveCloudSyncPhase({
        mode: "cloud",
        online: true,
        syncing: false,
        dirty: false,
        saveFailed: false,
      }),
    ).toBe("synced");
  });
});

describe("sync copy", () => {
  it("pairs fantasy badge labels with literal save meaning", () => {
    expect(syncBadgeLabel({ mode: "cloud", phase: "retry-required" })).toContain("retry");
    expect(syncStampLabel("offline")).toContain("offline");
    expect(syncFailureCopy({ online: false, kind: "save" })).toMatch(/offline/i);
    expect(syncFailureCopy({ online: true, kind: "save" })).toMatch(/remain on this device/i);
  });

  it("retries from local state when dirty or pending", () => {
    expect(shouldAttemptLocalRetry({ dirty: true, pendingSaves: 0 })).toBe(true);
    expect(shouldAttemptLocalRetry({ dirty: false, pendingSaves: 2 })).toBe(true);
    expect(shouldAttemptLocalRetry({ dirty: false, pendingSaves: 0 })).toBe(false);
  });
});
