import { describe, expect, it } from "vitest";
import { buildDecisionTreeSnapshot, collectRealityFacts } from "./decision-tree-panel";
import type { KlineSeries } from "@/lib/qimen/kline";

const life: KlineSeries = {
  kind: "life",
  title: "人生 K 线",
  disclaimer: "",
  methodology: "",
  sourceCount: 1,
  keyPoints: [],
  points: [{ index: 0, datetime: "2026-09-01T00:00", open: 50, high: 70, low: 42, close: 66, score: 66, delta: 12, phase: "上行", label: "2026", keyPoint: "结构跃迁", prediction: "等待验证", evidence: ["流年支持条件"] }],
};

describe("decision tree reality evidence", () => {
  it("uses only the user's interview words as reality evidence", () => {
    expect(collectRealityFacts("我要不要换工作", [
      { role: "assistant", content: "请说明现金储备。" },
      { role: "user", content: "我的现金储备只够三个月。" },
      { role: "assistant", content: "模型推断不应被当作事实。" },
    ])).toEqual(["我要不要换工作", "我的现金储备只够三个月。"]);
  });

  it("turns current interview facts into the root and every decision branch", () => {
    const tree = buildDecisionTreeSnapshot(life, undefined, "我要不要换工作", [
      { role: "user", content: "我已经拿到书面 offer，但现金储备只够三个月。" },
    ]);

    expect(tree.root).toMatchObject({ source: "现实事实 · 访谈", evidence: "我已经拿到书面 offer，但现金储备只够三个月。" });
    expect(tree.branches.every((branch) => branch.assumptions.some((item) => item.includes("现金储备")))).toBe(true);
    expect(tree.branches.map((branch) => branch.firstAction).join(" ")).toContain("现金储备");
  });
});
