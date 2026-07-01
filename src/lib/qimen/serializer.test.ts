import { describe, expect, it } from "vitest";
import { buildChart } from "./chart";
import {
  serializeChartToCompactJson,
  serializeChartToStructuredText,
} from "./serializer";

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
    expect(parsed.legend.palace).toContain("十干克应");
    expect(parsed.chart).toHaveLength(parsed.legend.chart.length);
    expect(parsed.palaces).toHaveLength(9);
    expect(parsed.palaces[0]).toHaveLength(parsed.legend.palace.length);
  });
});
