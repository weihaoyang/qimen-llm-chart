import { describe, expect, it } from "vitest";
import { buildChart } from "./chart";
import {
  serializeChartToCompactJson,
  serializeSequenceToCompactJson,
  serializeChartToStructuredText,
  summarizeRegisteredPatterns,
} from "./serializer";
import { buildChartSequence } from "./sequence";
import { DEFAULT_QIMEN_SETTINGS } from "./settings";

describe("serializeChartToStructuredText", () => {
  it("retains the 玉女守门 source disagreement in text and compact JSON", () => {
    const chart = buildChart({ datetime: "2026-01-01T12:00", timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "冬至", dunType: "yang", juNumber: 5 } });
    expect(serializeChartToStructuredText(chart)).toContain("时柱壬午不属于《奇门宝鉴》所列六时");
    expect(serializeChartToCompactJson(chart)).toContain("地丁与值使同宫成立");
    expect(serializeChartToCompactJson(chart)).toContain("值使原到中五宫后寄出");
    expect(serializeChartToStructuredText(chart)).toContain("阴阳均寄坤二，天禽随天芮");
    expect(serializeChartToStructuredText(chart)).toContain("本站迫指门克宫，制指宫克门");
    expect(serializeChartToCompactJson(chart)).toContain("本站迫指门克宫，制指宫克门");
    expect(serializeChartToCompactJson(chart)).toContain("中五阴阳均寄坤二");
    expect(serializeChartToCompactJson(chart)).toContain("八神用白虎、玄武");
  });
  it("exports the actual 丁临六 textual disagreement in both formats", () => {
    const chart = buildChart({ datetime: "2026-01-02T06:00", timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "冬至", dunType: "yang", juNumber: 1 } });
    expect(serializeChartToStructuredText(chart)).toContain("丁临六：王璋列入，本站未列");
    expect(serializeChartToCompactJson(chart)).toContain("丁临六：王璋列入，本站未列");
  });
  it("serializes overview and all nine palaces in stable order", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });

    const result = serializeChartToStructuredText(chart);

    expect(result).toContain("### 总览");
    expect(result).toContain("### 宫位 1");
    expect(result).toContain("### 宫位 9");
    expect(result.indexOf("### 宫位 1")).toBeLessThan(result.indexOf("### 宫位 9"));
  });

  it("writes explicit values for booleans and arrays", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });

    const result = serializeChartToStructuredText(chart);

    expect(result).toContain("是否值符宫: ");
    expect(result).toContain("空亡: [");
    expect(result).toContain("吉格列表: ");
    expect(result).toContain("登记格局_统计: ");
    expect(result).toContain("登记格局_未成立: [");
  });

  it("serializes a compact unambiguous JSON payload for LLM input", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });

    const result = serializeChartToCompactJson(chart);
    const parsed = JSON.parse(result) as {
      format: string;
      legend: { chart: string[]; palace: string[] };
      chart: unknown[];
      palaces: unknown[][];
    };

    expect(result).not.toContain("\n");
    expect(parsed.format).toBe("qmdj-llm-compact-v1");
    expect(parsed.legend.chart).toContain("时间信息");
    const timeInfo = parsed.chart[parsed.legend.chart.indexOf("时间信息")] as { voidness: unknown };
    expect(timeInfo.voidness).toBeDefined();
    expect(parsed.legend.chart).toContain("登记格局判定");
    expect(parsed.legend.palace).toContain("十干克应_天对地");
    expect(parsed.chart).toHaveLength(parsed.legend.chart.length);
    expect(parsed.palaces).toHaveLength(9);
    expect(parsed.palaces[0]).toHaveLength(parsed.legend.palace.length);
  });

  it("serializes a compact sequence payload", () => {
    const sequence = buildChartSequence({
      startDatetime: "2026-07-01T21:30",
      endDatetime: "2026-07-01T23:30",
      timeZone: "Asia/Shanghai",
      step: "double-hour",
    });

    const parsed = JSON.parse(serializeSequenceToCompactJson(sequence)) as {
      format: string;
      count: number;
      strengthMethod: string;
      legend: { chart: string[]; palace: string[] };
      items: Array<{
        datetime: string;
        chart: unknown[];
        palaces: unknown[][];
      }>;
    };

    expect(parsed.format).toBe("qmdj-llm-sequence-compact-v1");
    expect(parsed.count).toBe(2);
    expect(parsed.strengthMethod).toContain("旺3、相2");
    const patternIndex = parsed.legend.chart.indexOf("登记格局判定");
    expect(patternIndex).toBeGreaterThanOrEqual(0);
    expect(parsed.items[0]?.chart[patternIndex]).not.toHaveProperty("strengthMethod");
    expect(parsed.legend.chart).toContain("时间信息");
    expect(parsed.items[1]?.datetime).toBe("2026-07-01T23:30");
    expect(parsed.items[0]?.palaces).toHaveLength(9);
  });

  // The compact JSON must carry the whole 格局识别 result (成立/未成立 + 旺衰 +
  // 落宫证据) so it can be copied into an AI analysis, not just a summary.
  it("carries the full registered 格局 judgement in the compact JSON", () => {
    const chart = buildChart({ datetime: "2026-07-01T21:30", timeZone: "Asia/Shanghai" });
    const full = summarizeRegisteredPatterns(chart);
    const parsed = JSON.parse(serializeChartToCompactJson(chart)) as { legend: { chart: string[] }; chart: unknown[] };
    expect(parsed.legend.chart).toContain("登记格局判定");

    const judgement = parsed.chart[parsed.chart.length - 1] as {
      registered: number;
      formedCount: number;
      failedCount: number;
      strengthCounts: Record<string, number>;
      formed: Array<{ name: string; kind: string; group: string; strength: string; positions: number[]; evidence: string[] }>;
      failed: string[];
    };
    expect(judgement.registered).toBe(full.registered);
    expect(judgement.formed).toHaveLength(full.formedCount);
    expect(judgement.failed).toHaveLength(full.failedCount);
    for (const item of judgement.formed) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.strength.length).toBeGreaterThan(0);
      expect(Array.isArray(item.evidence)).toBe(true);
    }

    // Single-chart payloads stay well under the agent route limits.
    expect(serializeChartToCompactJson(chart).length).toBeLessThan(40_000);
    expect(serializeChartToStructuredText(chart).length).toBeLessThan(60_000);
  });

  it("explains the abbreviated classical convention in compact output", () => {
    const chart = buildChart({ datetime: "2026-01-01T06:00", timeZone: "Asia/Shanghai" });
    const payload = serializeChartToCompactJson(chart);
    expect(payload).toContain("门宫证据的“旨”指《奇门旨归》");
    expect(payload).toContain("休门生4宫（和/旨义）");
    expect(payload).toContain("8宫生惊门（义/旨和）");
  });

  it("keeps a twelve-step sequence compact payload within the agent API limit", () => {
    const sequence = buildChartSequence({
      startDatetime: "2026-07-01T00:00",
      endDatetime: "2026-07-01T22:00",
      timeZone: "Asia/Shanghai",
      step: "double-hour",
    });
    expect(sequence).toHaveLength(12);
    expect(serializeSequenceToCompactJson(sequence).length).toBeLessThan(80_000);
  });
});


it("exports same-palace usage restrictions and the grading method to AI context", () => {
  const chart = buildChart({ datetime: "2026-01-05T02:00", timeZone: "Asia/Shanghai" });
  Object.assign(chart.raw.palaces.find(p => p.position === 3)!, {
    heavenlyStem: "乙", gate: "开门", gatePressure: "迫", status: { gate: "旺", star: "旺" },
  });
  const summary = summarizeRegisteredPatterns(chart);
  const promotion = summary.formed.find(item => item.name === "三奇贵人升殿")!;
  expect(promotion.strength).toBe("有力");
  expect(promotion.strengthNote).toContain("门旺");
  expect(promotion.usageRestrictions).toContain("第 3 宫：开门门迫，未满足无迫取用条件");
  expect(serializeChartToStructuredText(chart)).toContain("登记格局_旺衰算法:");
  expect(serializeChartToCompactJson(chart)).toContain("未满足无迫取用条件");
});
