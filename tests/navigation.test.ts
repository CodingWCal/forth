import { describe, expect, it } from "vitest";
import { hashForView, viewFromHash } from "../lib/navigation";

describe("Forth hash navigation", () => {
  it.each([
    ["#today", "today"],
    ["#board", "board"],
    ["#proof", "proof"],
    ["#chronicle", "proof"],
    ["#settings", "settings"],
    ["#guild", "settings"],
    ["#hall", "settings"],
  ])("maps %s to %s", (hash, view) => {
    expect(viewFromHash(hash)).toBe(view);
  });

  it("leaves unknown hashes on the default route", () => {
    expect(viewFromHash("#unknown")).toBeNull();
    expect(hashForView("proof")).toBe("#proof");
  });
});
