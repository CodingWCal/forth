import { describe, expect, it, vi } from "vitest";
import { tryReadStorage, tryWriteStorage, type StorageLike } from "@/lib/browser-storage";

describe("browser storage safety", () => {
  it("reads and writes when storage is available", () => {
    const storage = {
      getItem: vi.fn(() => "saved"),
      setItem: vi.fn(),
    } satisfies StorageLike;

    expect(tryReadStorage(storage, "forth.key")).toEqual({ value: "saved", available: true });
    expect(tryWriteStorage(storage, "forth.key", "next")).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith("forth.key", "next");
  });

  it("turns blocked reads into a non-fatal unavailable result", () => {
    const storage = {
      getItem: vi.fn(() => { throw new DOMException("Blocked", "SecurityError"); }),
      setItem: vi.fn(),
    } satisfies StorageLike;

    expect(tryReadStorage(storage, "forth.key")).toEqual({ value: null, available: false });
  });

  it("turns quota failures into a false write result", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => { throw new DOMException("Full", "QuotaExceededError"); }),
    } satisfies StorageLike;

    expect(tryWriteStorage(storage, "forth.key", "next")).toBe(false);
  });
});
