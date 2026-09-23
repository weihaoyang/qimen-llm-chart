import { describe, expect, it } from "vitest";
import { asDate, asOptionalText, asText, isConstraintKind, isFactKind, isInventoryCategory, isMoveKind, isStorageReference, stripReservedJobId, stripReservedReviewKeys } from "./input";

describe("battle API input contract", () => {
  it("accepts only the closed domain vocabularies", () => {
    expect(isFactKind("fact")).toBe(true);
    expect(isFactKind("model-output")).toBe(false);
    expect(isConstraintKind("legal")).toBe(true);
    expect(isInventoryCategory("relationship")).toBe(true);
    expect(isMoveKind("probe")).toBe(true);
    expect(isMoveKind("advance")).toBe(false);
  });

  it("bounds free text and dates before persistence", () => {
    expect(asText("  可验证事实  ", 20)).toBe("可验证事实");
    expect(asText("", 20)).toBeNull();
    expect(asText("x".repeat(21), 20)).toBeNull();
    expect(asOptionalText(undefined, 20)).toBe("");
    expect(asOptionalText("", 20)).toBe("");
    expect(asDate("2026-09-01T00:00:00.000Z")).toBe("2026-09-01T00:00:00.000Z");
    expect(asDate("not-a-date")).toBeUndefined();
    expect(isStorageReference("https://evidence.example/item")).toBe(true);
    expect(isStorageReference("javascript:alert(1)")).toBe(false);
  });

  it("strips the server-reserved review idempotency key from client diagnosis", () => {
    expect(stripReservedReviewKeys({ summary: "ok", _idempotencyKey: "ai-job:abc" })).toEqual({ summary: "ok" });
    expect(stripReservedReviewKeys({ _idempotencyKey: "only" })).toEqual({});
    // A non-object diagnosis degrades to an empty record rather than throwing.
    expect(stripReservedReviewKeys(null)).toEqual({});
    expect(stripReservedReviewKeys("nope")).toEqual({});
    // The caller's object is never mutated.
    const source = { summary: "ok", _idempotencyKey: "k" };
    stripReservedReviewKeys(source);
    expect(source._idempotencyKey).toBe("k");
  });

  it("strips the server-reserved advice job id from client source", () => {
    expect(stripReservedJobId({ kind: "red_team", jobId: "job-1" })).toEqual({ kind: "red_team" });
    expect(stripReservedJobId({ jobId: "only" })).toEqual({});
    expect(stripReservedJobId(null)).toEqual({});
    expect(stripReservedJobId("nope")).toEqual({});
    // Advice data that merely looks similar must survive.
    expect(stripReservedJobId({ jobId: "x", jobIDs: "keep", nested: { jobId: "keep" } })).toEqual({
      jobIDs: "keep",
      nested: { jobId: "keep" },
    });
    // The caller's object is never mutated.
    const source = { kind: "cards", jobId: "job-1" };
    stripReservedJobId(source);
    expect(source.jobId).toBe("job-1");
  });
});
