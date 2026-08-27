import { describe, expect, it } from "vitest";
import { parseBattleAiJson, validateBattleAiResult } from "./ai-contract";

describe("battle AI structured output contract", () => {
  it("accepts a fully structured interview response", () => {
    expect(validateBattleAiResult("interview", {
      assistantMessage:"请确认现金底线。", extractedFacts:[{ content:"现金仅够 60 天", confidence:90 }],
      extractedConstraints:[{ label:"现金", description:"60 天" }], updatedFields:[], nextQuestion:"最低可接受结果是什么？", confidence:0.9,
    })).toBeNull();
  });

  it("rejects shallow or out-of-range model output", () => {
    expect(validateBattleAiResult("interview", { assistantMessage:"好", extractedFacts:["伪事实"], extractedConstraints:[], updatedFields:[], nextQuestion:"继续？", confidence:90 })).toContain("extractedFacts");
    expect(validateBattleAiResult("red_team", { critique:"风险", biasWarning:"偏差", failureProbability:80, fatalVulnerability:"现金", suggestedFocus:"验证" })).toContain("failureProbability");
    expect(validateBattleAiResult("review", { summary:"完成", facts:"事实", whatChanged:"变化", diagnosis:[], nextAdjustment:"调整" })).toContain("diagnosis");
  });

  it("parses fenced JSON but rejects arrays and prose", () => {
    expect(parseBattleAiJson('```json\n{"cards":[]}\n```')).toEqual({ cards:[] });
    expect(parseBattleAiJson('[{"cards":[]}]')).toBeNull();
    expect(parseBattleAiJson('结果如下')).toBeNull();
  });
});
