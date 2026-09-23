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

  it("recovers the result from the prose and fences models actually emit", () => {
    // Every one of these is a shape the old start-and-end-anchored fence strip
    // failed on, turning a paid turn into a 500.
    expect(parseBattleAiJson('好的，以下是结构化结果：\n```json\n{"cards":[]}\n```')).toEqual({ cards:[] });
    expect(parseBattleAiJson('```json\n{"cards":[]}\n```\n以上为本次推演结果。')).toEqual({ cards:[] });
    expect(parseBattleAiJson('```\n{"cards":[]}\n```')).toEqual({ cards:[] });
    expect(parseBattleAiJson('```json\n{"cards":[]}')).toEqual({ cards:[] });
    expect(parseBattleAiJson('{ "cards": [] }')).toEqual({ cards:[] });
  });

  it("does not scavenge an object out of text that is already valid JSON", () => {
    // A top-level array or a bare string is a contract violation, not something
    // to be repaired by hunting for a nested object.
    expect(parseBattleAiJson('[{"cards":[]}]')).toBeNull();
    // A JSON *string* whose content looks like an object is still a string.
    expect(parseBattleAiJson(JSON.stringify('{"cards":[]}'))).toBeNull();
    expect(parseBattleAiJson('{"cards": [}')).toBeNull();
  });

  it("keeps a brace inside a string from closing the extracted object early", () => {
    expect(parseBattleAiJson('说明：\n```json\n{"summary":"包含 } 的说明","facts":"x"}\n```')).toEqual({
      summary: "包含 } 的说明",
      facts: "x",
    });
  });

  it("rejects an opaque item with nothing a reader could see", () => {
    // These arrays are stored and rendered generically, so `{}` would be
    // persisted as though it were a real answer.
    const base = { assistantMessage: "继续", extractedFacts: [], extractedConstraints: [], nextQuestion: "然后？", confidence: 0.5 };
    expect(validateBattleAiResult("interview", { ...base, updatedFields: [{}] })).toContain("updatedFields");
    expect(validateBattleAiResult("interview", { ...base, updatedFields: [{ weight: 3 }] })).toContain("updatedFields");
    expect(validateBattleAiResult("interview", { ...base, updatedFields: [{ field: "现金底线", value: 1000 }] })).toBeNull();

    const breakthrough = { phases: [], strategies: [], actions: [], stopConditions: ["停"] };
    expect(validateBattleAiResult("breakthrough", { ...breakthrough, phases: [{}] })).toContain("phases");
    expect(validateBattleAiResult("breakthrough", { ...breakthrough, strategies: [{ steps: [{ text: "先验证渠道" }] }] })).toBeNull();
  });

  it("rejects a result that is too large, too deep or too wide to store", () => {
    const review = { summary: "完成", facts: "事实", whatChanged: "变化", nextAdjustment: "调整", diagnosis: {} };
    expect(validateBattleAiResult("review", { ...review, summary: "长".repeat(6001) })).toContain("summary");
    expect(validateBattleAiResult("review", { ...review, diagnosis: { notes: "x".repeat(6001) } })).toContain("$.diagnosis.notes");
    expect(validateBattleAiResult("review", { ...review, diagnosis: { value: Number.POSITIVE_INFINITY } })).toContain("非有限数字");

    let deep: Record<string, unknown> = { leaf: "x" };
    for (let level = 0; level < 8; level += 1) deep = { nested: deep };
    expect(validateBattleAiResult("review", { ...review, diagnosis: deep })).toContain("嵌套层级");

    expect(validateBattleAiResult("interview", {
      assistantMessage: "继续", extractedConstraints: [], updatedFields: [], nextQuestion: "然后？", confidence: 0.5,
      extractedFacts: Array.from({ length: 41 }, (_, index) => ({ content: `事实${index}`, confidence: 50 })),
    })).toContain("超过 40 项");
  });
});
