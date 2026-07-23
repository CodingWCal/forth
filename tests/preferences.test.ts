import { describe, expect, it } from "vitest";
import {
  LAYOUT_OPTIONS,
  layoutPreferenceKey,
  parseLayoutMode,
} from "@/lib/preferences";

describe("layout preferences", () => {
  it("defaults unknown values to adventure", () => {
    expect(parseLayoutMode(null)).toBe("adventure");
    expect(parseLayoutMode(undefined)).toBe("adventure");
    expect(parseLayoutMode("")).toBe("adventure");
    expect(parseLayoutMode("pixel")).toBe("adventure");
  });

  it("accepts calm and adventure", () => {
    expect(parseLayoutMode("calm")).toBe("calm");
    expect(parseLayoutMode("adventure")).toBe("adventure");
  });

  it("scopes storage keys by demo vs cloud account", () => {
    expect(layoutPreferenceKey("demo")).toBe("forth.layout.v1.demo");
    expect(layoutPreferenceKey("cloud", "uid-42")).toBe("forth.layout.v1.cloud.uid-42");
  });

  it("offers both layout options for settings", () => {
    expect(LAYOUT_OPTIONS.map((option) => option.id)).toEqual(["adventure", "calm"]);
  });
});
