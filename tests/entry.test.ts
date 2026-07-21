import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ForthEntry } from "../components/forth-entry";
import {
  createCleanWorkspace,
  createExplicitDemoWorkspace,
  DEMO_STORAGE_KEY,
  selectPreferredWorkspace,
} from "../lib/entry";
import { createSeedWorkspace } from "../lib/seed";
import { STORAGE_KEY } from "../lib/workspace";

describe("production entry boundary", () => {
  it("server-renders only the entry boundary, never sample tickets", () => {
    const html = renderToString(React.createElement(ForthEntry));

    expect(html).toContain("Sign in to your workspace");
    expect(html).not.toContain("Surface actionable Firebase sync errors");
    expect(html).not.toContain("New quest");
    expect(html).not.toContain("Quest Log");
  });

  it("keeps disposable demo persistence separate from legacy workspace data", () => {
    expect(DEMO_STORAGE_KEY).not.toBe(STORAGE_KEY);
    expect(DEMO_STORAGE_KEY).toContain("demo");
  });

  it("creates seed content only when the explicit demo resolver is called", () => {
    const referenceDate = new Date("2026-07-20T12:00:00.000Z");
    const demo = createExplicitDemoWorkspace(null, referenceDate);

    expect(demo).toEqual(createSeedWorkspace(referenceDate));
    expect(demo.tasks.length).toBeGreaterThan(0);
  });

  it("resumes only valid state from the demo-specific key", () => {
    const storedDemo = createSeedWorkspace(new Date("2026-07-20T12:00:00.000Z"));
    storedDemo.tasks[0] = { ...storedDemo.tasks[0], title: "Saved demo-only quest" };

    expect(createExplicitDemoWorkspace(JSON.stringify(storedDemo)).tasks[0].title)
      .toBe("Saved demo-only quest");
    expect(createExplicitDemoWorkspace("corrupt").tasks[0].id).toBe("task-auth-errors");
  });

  it("creates a clean real workspace with one named campaign and zero tickets", () => {
    const state = createCleanWorkspace(
      {
        campaignTitle: "Cohort platform",
        outcome: "Ship reliable team coordination.",
        targetDate: "2026-08-20",
      },
    );

    expect(state.tasks).toEqual([]);
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0]).toMatchObject({
      title: "Cohort platform",
      outcome: "Ship reliable team coordination.",
      targetDate: "2026-08-20",
    });
    expect(state.projects[0].id).not.toBe("project-forth");
    expect(JSON.stringify(state)).not.toContain("Calvin");
  });

  it("rejects blank or invented campaign details instead of fabricating cloud data", () => {
    expect(() => createCleanWorkspace({
      campaignTitle: "   ",
      outcome: "Real outcome",
      targetDate: "2026-08-20",
    })).toThrow(
      "Enter a name for your first campaign.",
    );
    expect(() => createCleanWorkspace({
      campaignTitle: "Real project",
      outcome: " ",
      targetDate: "2026-08-20",
    })).toThrow("Describe the real outcome");
    expect(() => createCleanWorkspace({
      campaignTitle: "Real project",
      outcome: "Real outcome",
      targetDate: "2026-02-30",
    })).toThrow("Choose a valid target date");
  });

  it("routes to a valid last guild, then the UID owner guild, then a deterministic fallback", () => {
    const guilds = [
      { id: "member-a", name: "Alpha" },
      { id: "user-123", name: "Personal" },
      { id: "member-z", name: "Zeta" },
    ];

    expect(selectPreferredWorkspace(guilds, "member-z", "user-123")?.id).toBe("member-z");
    expect(selectPreferredWorkspace(guilds, "revoked", "user-123")?.id).toBe("user-123");
    expect(selectPreferredWorkspace(guilds, "revoked", "missing-owner")?.id).toBe("member-a");
    expect(selectPreferredWorkspace([], null, "user-123")).toBeNull();
  });
});
