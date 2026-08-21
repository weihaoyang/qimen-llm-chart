import { describe, expect, it } from "vitest";
import { buildDecisionReadiness, buildDecisionTreeSnapshot, collectRealityFacts } from "./decision-tree-panel";

const life = {
  kind: "life" as const,
  title: "人生 K 线",
  disclaimer: "",
  methodology: "",
  sourceCount: 0,
  keyPoints: [],
  points: [],
};

describe("decision readiness", () => {
  it("does not treat the issue or an assistant answer as a reality fact", () => {
    const conversation = [
      { role: "user" as const, content: "我要不要离职" },
      { role: "assistant" as const, content: "你一定会成功" },
    ];

    expect(collectRealityFacts("我要不要离职", conversation)).toEqual([]);
    expect(buildDecisionReadiness("我要不要离职", conversation)).toMatchObject({
      label: "还不能下结论",
      canChoose: false,
      facts: [],
    });
  });

  it("requires three distinct user-supplied facts before presenting a choice as ready", () => {
    const conversation = [
      { role: "user" as const, content: "我要不要离职" },
      { role: "assistant" as const, content: "先说现金流" },
      { role: "user" as const, content: "存款只能支撑三个月" },
      { role: "assistant" as const, content: "还有 offer 吗" },
      { role: "user" as const, content: "已经拿到书面 offer" },
      { role: "assistant" as const, content: "试用期呢" },
      { role: "user" as const, content: "新岗位有六个月试用期" },
    ];

    const readiness = buildDecisionReadiness("我要不要离职", conversation);
    expect(readiness).toMatchObject({ label: "可以选择一条路", canChoose: true });
    expect(readiness.facts).toHaveLength(3);

    const tree = buildDecisionTreeSnapshot(life, undefined, "我要不要离职", conversation);
    expect(tree.root.source).toBe("现实事实 · 访谈");
    expect(tree.branches[0].assumptions).toContain("访谈事实：存款只能支撑三个月");
  });
});
