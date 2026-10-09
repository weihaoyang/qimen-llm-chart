import { describe, expect, it } from "vitest";
import { buildChart } from "./chart";
import {
  serializeChartToCompactJson,
  serializeSequenceToCompactJson,
  serializeChartToStructuredText,
  summarizeRegisteredPatterns,
} from "./serializer";
import { buildChartSequence } from "./sequence";

describe("serializeChartToStructuredText", () => {
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
      legend: { chart: string[]; palace: string[] };
      items: Array<{
        datetime: string;
        chart: unknown[];
        palaces: unknown[][];
      }>;
    };

    expect(parsed.format).toBe("qmdj-llm-sequence-compact-v1");
    expect(parsed.count).toBe(2);
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
