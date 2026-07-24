import { describe, expect, it } from "vitest";
import { isTabNavigationKey, resolveTabNavigation } from "../lib/tabs";

describe("tab keyboard navigation", () => {
  it("moves to the next and previous tab", () => {
    expect(resolveTabNavigation("ArrowRight", 0, 3)).toBe(1);
    expect(resolveTabNavigation("ArrowLeft", 2, 3)).toBe(1);
  });

  it("wraps around both ends", () => {
    expect(resolveTabNavigation("ArrowRight", 2, 3)).toBe(0);
    expect(resolveTabNavigation("ArrowLeft", 0, 3)).toBe(2);
  });

  it("jumps to the first and last tab with Home and End", () => {
    expect(resolveTabNavigation("Home", 2, 3)).toBe(0);
    expect(resolveTabNavigation("End", 0, 3)).toBe(2);
  });

  it("ignores keys that are not part of the tabs pattern", () => {
    expect(resolveTabNavigation("Enter", 0, 3)).toBeNull();
    expect(resolveTabNavigation("Tab", 0, 3)).toBeNull();
    expect(resolveTabNavigation("a", 0, 3)).toBeNull();
  });

  it("returns null when there are no tabs to focus", () => {
    expect(resolveTabNavigation("ArrowRight", 0, 0)).toBeNull();
  });

  it("recovers from an out-of-range starting index", () => {
    expect(resolveTabNavigation("ArrowRight", 9, 3)).toBe(1);
    expect(resolveTabNavigation("ArrowLeft", -1, 3)).toBe(2);
  });

  it("classifies navigation keys", () => {
    expect(isTabNavigationKey("Home")).toBe(true);
    expect(isTabNavigationKey("End")).toBe(true);
    expect(isTabNavigationKey("ArrowRight")).toBe(true);
    expect(isTabNavigationKey("ArrowLeft")).toBe(true);
    expect(isTabNavigationKey("Space")).toBe(false);
  });
});
