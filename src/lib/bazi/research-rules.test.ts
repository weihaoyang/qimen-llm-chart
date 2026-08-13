import { describe, expect, it } from "vitest";
import { applyResearchRules, researchRuleHash, validateResearchRuleDefinition } from "./research-rules";

const definition = validateResearchRuleDefinition({
  dsl_version: "bazi-axis-rule-v1",
  rules: [{ id: "weak-ei-soften", all: [{ field: "chart.day_master_strength", op: "equals", value: "weak" }], adjustments: { ei: -8 } }],
});

describe("Bazi research rule DSL", () => {
  it("reproduces the platform hash and applies only matching bounded adjustments", () => {
    expect(researchRuleHash("bazi-v3-ziping-luming-rules", definition)).toMatch(/^[a-f0-9]{64}$/);
    expect(applyResearchRules({ ei: 60, sn: 50, tf: 50, jp: 50 }, { chart: { day_master_strength: "weak" } }, definition)).toEqual({
      axes: { ei: 52, sn: 50, tf: 50, jp: 50 },
      applied: [{ id: "weak-ei-soften", adjustments: { ei: -8 } }],
    });
  });

  it("rejects identity-bearing paths and oversized adjustments", () => {
    expect(() => validateResearchRuleDefinition({ dsl_version: "bazi-axis-rule-v1", rules: [{ id: "bad", all: [{ field: "chart.birth_date", op: "equals", value: "x" }], adjustments: { ei: 1 } }] })).toThrow();
    expect(() => validateResearchRuleDefinition({ dsl_version: "bazi-axis-rule-v1", rules: [{ id: "bad", all: [{ field: "chart.day_master_strength", op: "equals", value: "weak" }], adjustments: { ei: 31 } }] })).toThrow();
  });

  it("allows approved count fields without exposing the underlying evidence or pillars", () => {
    expect(validateResearchRuleDefinition({ dsl_version: "bazi-axis-rule-v1", rules: [{ id: "count", all: [{ field: "boundary.changed_pillar_count", op: "gte", value: 1 }, { field: "prediction.axis_evidence_count.ei", op: "gte", value: 2 }], adjustments: { ei: -2 } }] }).rules).toHaveLength(1);
  });

  it("normalizes truthy conditions identically to the platform contract", () => {
    expect(validateResearchRuleDefinition({ dsl_version: "bazi-axis-rule-v1", rules: [{ id: "boundary", all: [{ field: "boundary.sensitive", op: "truthy" }], adjustments: { ei: 1 } }] }).rules[0].all[0]).toEqual({ field: "boundary.sensitive", op: "truthy", value: null });
  });
});
