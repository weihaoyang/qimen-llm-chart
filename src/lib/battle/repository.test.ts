import { describe, expect, it } from "vitest";
import { asDate, asOptionalText, asText, isConstraintKind, isFactKind, isInventoryCategory, isMoveKind, isStorageReference } from "./input";

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
});
