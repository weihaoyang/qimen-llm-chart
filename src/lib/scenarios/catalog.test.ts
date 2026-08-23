import { describe, expect, it } from "vitest";
import { getScenario, SCENARIOS, SCENARIO_CATALOG_VERSION } from "./catalog";

describe("official scenario catalog", () => {
  it("contains versioned read-only seeds instead of user-owned battle state", () => {
    expect(SCENARIO_CATALOG_VERSION).toBeGreaterThan(0);
    expect(SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "saas-renewal-crisis",
      "saas-competitor-price-war",
      "funding-closing-failure",
    ]);
    expect(SCENARIOS.every((scenario) => scenario.version > 0 && scenario.modules.length === 4)).toBe(true);
  });

  it("resolves unknown scenarios without exposing mutable state", () => {
    expect(getScenario("missing-scenario")).toBeUndefined();
    const scenario = getScenario("saas-renewal-crisis");
    expect(scenario?.facts.some((fact) => fact.content.includes("42%"))).toBe(true);
  });
});
