import { describe, expect, it, vi } from "vitest";
import { isIn, narrowColumn } from "./type-narrowing";

describe("isIn", () => {
  it("narrows to a member of the set", () => {
    expect(isIn("a", ["a", "b"] as const)).toBe(true);
    expect(isIn("c", ["a", "b"] as const)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isIn(1, ["a"] as const)).toBe(false);
    expect(isIn(null, ["a"] as const)).toBe(false);
    expect(isIn(undefined, ["a"] as const)).toBe(false);
    expect(isIn({ a: 1 }, ["a"] as const)).toBe(false);
  });
});

describe("narrowColumn", () => {
  // The cast this replaces compiled for any string, so a column holding a value
  // this build cannot represent reached callers typed as a valid member.
  it("passes a known value through without reporting", () => {
    const report = vi.fn();
    expect(narrowColumn("authorized", ["authorized", "revoked"] as const, "revoked", report)).toBe("authorized");
    expect(report).not.toHaveBeenCalled();
  });

  it("reports and substitutes an unknown value", () => {
    const report = vi.fn();
    expect(narrowColumn("pending_review", ["authorized", "revoked"] as const, "revoked", report)).toBe("revoked");
    expect(report).toHaveBeenCalledWith("pending_review");
  });

  it("reports a non-string column value too", () => {
    const report = vi.fn();
    expect(narrowColumn(42, ["a"] as const, "a", report)).toBe("a");
    expect(report).toHaveBeenCalledWith(42);
  });
});
