import { describe, expect, it } from "vitest";
import { UserFacingError } from "@/lib/user-facing-error";
import { ResearchRuleValidationError, validateResearchRuleDefinition } from "./research-rules";
import { stageResearchRuleRelease } from "./research-rule-repository";

const bundle = (definition: unknown) => ({
  release_contract_version: "bazi-research-release-v1",
  experiment_id: "a".repeat(32),
  rule_hash: "b".repeat(64),
  base_prediction_version: "bazi-v3",
  rule_definition: definition,
  validation_metrics: {},
  published_at_iso: "2026-08-13T00:00:00Z",
}) as never;

const capture = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
};

// A rejected bundle must reach the research pipeline with the sentence that
// names the offending field, because that sentence is the only thing telling the
// pipeline what to fix. The same validator also runs over rows read back from
// the table, where a failure means our own data is corrupt — so the distinction
// has to live at the staging boundary rather than inside the validator.
describe("research rule release staging", () => {
  it("re-marks a caller-supplied definition failure as user-facing", async () => {
    await expect(
      stageResearchRuleRelease(
        bundle({
          dsl_version: "bazi-axis-rule-v1",
          rules: [{ id: "bad", all: [{ field: "chart.birth_date", op: "equals", value: "x" }], adjustments: { ei: 1 } }],
        }),
      ),
    ).rejects.toBeInstanceOf(UserFacingError);
  });

  it("keeps the validator's own sentence", async () => {
    await expect(stageResearchRuleRelease(bundle({ dsl_version: "bazi-axis-rule-v1", rules: [] }))).rejects.toThrow(
      "研究规则必须使用 bazi-axis-rule-v1，且含 1–20 条子规则。",
    );
  });

  it("leaves the shared validator on its own class so the read path stays generic", () => {
    const error = capture(() => validateResearchRuleDefinition({ dsl_version: "wrong", rules: [] }));
    expect(error).toBeInstanceOf(ResearchRuleValidationError);
    expect(error).not.toBeInstanceOf(UserFacingError);
  });
});
