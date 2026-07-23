import { describe, expect, it } from "vitest";
import { getDisplayTerms, TERMINOLOGY_MAP } from "@/lib/terminology";

describe("terminology map", () => {
  it("keeps fantasy and plain pairs for every status", () => {
    expect(TERMINOLOGY_MAP.status.ready).toEqual({ fantasy: "Quest Log", plain: "Ready" });
    expect(TERMINOLOGY_MAP.status.moving).toEqual({ fantasy: "In Forge", plain: "In progress" });
    expect(TERMINOLOGY_MAP.status.paused).toEqual({ fantasy: "Camped", plain: "Paused" });
    expect(TERMINOLOGY_MAP.status.done).toEqual({ fantasy: "Shipped", plain: "Done" });
  });

  it("returns adventure labels by default", () => {
    const terms = getDisplayTerms("adventure");
    expect(terms.nav.today).toBe("Quest Log");
    expect(terms.status.paused).toBe("Camped");
    expect(terms.pace.steady.label).toBe("Venture");
    expect(terms.newTask).toBe("New quest");
  });

  it("switches to plain labels in calm mode without changing domain keys", () => {
    const terms = getDisplayTerms("calm");
    expect(terms.nav.today).toBe("Today");
    expect(terms.nav.board).toBe("Board");
    expect(terms.nav.proof).toBe("Completed");
    expect(terms.nav.settings).toBe("Settings");
    expect(terms.status.ready).toBe("Ready");
    expect(terms.status.moving).toBe("In progress");
    expect(terms.status.paused).toBe("Paused");
    expect(terms.status.done).toBe("Done");
    expect(terms.pace.light.label).toBe("Light");
    expect(terms.newTask).toBe("New task");
    expect(terms.pageTitle.settings).toBe("Manage your workspace.");
  });
});
