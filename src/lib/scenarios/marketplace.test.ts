import { describe, expect, it } from "vitest";
import { OFFICIAL_TEMPLATE_CATALOG } from "./marketplace";

describe("official marketplace catalog", () => {
  it("is a non-empty read-only catalog with unique identifiers", () => {
    expect(OFFICIAL_TEMPLATE_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(new Set(OFFICIAL_TEMPLATE_CATALOG.map((item) => item.id)).size).toBe(OFFICIAL_TEMPLATE_CATALOG.length);
    expect(OFFICIAL_TEMPLATE_CATALOG.every((item) => item.includes.length > 0 && item.price >= 0)).toBe(true);
  });
});
