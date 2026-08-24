import { describe, expect, it } from "vitest";
import { DEEP_ARCHIVES_CATALOG, WORLD_PULSE_CATALOG, WORLD_PULSE_TICKER } from "./ecosystem";

describe("ecosystem official catalogs", () => {
  it("contains only server-owned world pulse entries with intervention metadata", () => {
    expect(WORLD_PULSE_CATALOG.length).toBeGreaterThan(0);
    expect(WORLD_PULSE_CATALOG.every((event) => event.status === "ACTIVE" && event.equityCostToIntervene >= 0)).toBe(true);
    expect(WORLD_PULSE_TICKER.length).toBeGreaterThan(0);
  });

  it("contains versionable deep archive entries with unique ids", () => {
    const ids = DEEP_ARCHIVES_CATALOG.map((archive) => archive.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEEP_ARCHIVES_CATALOG.every((archive) => archive.finalRippleSequence.length > 0)).toBe(true);
  });
});
