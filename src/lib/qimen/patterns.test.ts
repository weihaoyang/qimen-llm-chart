import { describe, expect, it } from "vitest";
import type { NormalizedQimenChart } from "./types";
import { QIMEN_PATTERN_CATALOG, evaluateQimenPatterns } from "./patterns";

const palace = (position: number, overrides: Record<string, unknown> = {}) => ({
  position,
  heavenlyStem: "无",
  earthlyStem: "无",
  gate: "无门",
  gatePressure: "无",
  liuYiJiXing: { hasJiXing: false },
  ...overrides,
});

const chartWith = (
  palaces: unknown[],
  options: { zhiShi?: number; wuBuYuShi?: boolean } = {},
) =>
  ({
    raw: {
      palaces,
      zhiShi: { position: options.zhiShi ?? 1, gate: "无门" },
      specialPatterns: { wuBuYuShi: { isWuBuYuShi: Boolean(options.wuBuYuShi) } },
    },
  }) as unknown as NormalizedQimenChart;

const statusOf = (report: ReturnType<typeof evaluateQimenPatterns>, id: string) =>
  report.checks.find((check) => check.id === id)?.status;

describe("evaluateQimenPatterns", () => {
  it("partitions the whole catalog into formed and failed", () => {
    const report = evaluateQimenPatterns(chartWith([palace(1)]));
    expect(report.registered).toBe(QIMEN_PATTERN_CATALOG.length);
    expect(report.formed.length + report.failed.length).toBe(QIMEN_PATTERN_CATALOG.length);
  });

  it("marks a stem pair as formed only when the pairing is on the board", () => {
    const report = evaluateQimenPatterns(chartWith([palace(3, { heavenlyStem: "戊", earthlyStem: "丙" })]));
    expect(statusOf(report, "qing_long_fan_shou")).toBe("成立");
    // 飞鸟跌穴 is the reverse pairing, so it must still be absent.
    expect(statusOf(report, "fei_niao_die_xue")).toBe("未成立");
    expect(report.checks.find((check) => check.id === "qing_long_fan_shou")?.positions).toEqual([3]);
  });

  it("ties 玉女守门 and 三奇得使 to the 值使 palace", () => {
    const report = evaluateQimenPatterns(chartWith([palace(6, { earthlyStem: "丁" })], { zhiShi: 6 }));
    expect(statusOf(report, "yu_nu_shou_men")).toBe("成立");
    expect(statusOf(report, "san_qi_de_shi")).toBe("成立");
    // The same palace is not 值使 elsewhere.
    const other = evaluateQimenPatterns(chartWith([palace(6, { earthlyStem: "丁" })], { zhiShi: 2 }));
    expect(statusOf(other, "yu_nu_shou_men")).toBe("未成立");
  });

  it("detects 门迫 and 六仪击刑 from the palace flags", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(1, { gatePressure: "迫", gate: "开门" }),
      palace(8, { liuYiJiXing: { hasJiXing: true, type: "六仪击刑" } }),
    ]));
    expect(statusOf(report, "men_po")).toBe("成立");
    expect(statusOf(report, "liu_yi_ji_xing")).toBe("成立");
  });

  it("treats 五不遇时 as a global pattern", () => {
    expect(statusOf(evaluateQimenPatterns(chartWith([palace(1)], { wuBuYuShi: true })), "wu_bu_yu_shi")).toBe("成立");
    expect(statusOf(evaluateQimenPatterns(chartWith([palace(1)])), "wu_bu_yu_shi")).toBe("未成立");
  });

  it("gives every check a requirement, a hint and a kind", () => {
    const report = evaluateQimenPatterns(chartWith([palace(1)]));
    for (const check of report.checks) {
      expect(check.requirement.length).toBeGreaterThan(0);
      expect(check.hint.length).toBeGreaterThan(0);
      expect(["吉格", "凶格"]).toContain(check.kind);
    }
  });
});
