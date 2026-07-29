import { describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "./chart";
import { serializeBaziToCompactJson } from "./serializer";

describe("serializeBaziToCompactJson", () => {
  it("serializes a compact bazi payload without programmatic conclusions", () => {
    const chart = buildBaziChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "male",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    const parsed = JSON.parse(serializeBaziToCompactJson(chart)) as {
      format: string;
      legend: { chart: string[] };
      chart: unknown[];
      note: string;
    };

    expect(parsed.format).toBe("bazi-llm-compact-v1");
    expect(parsed.legend.chart).toContain("四柱");
    expect(parsed.legend.chart).not.toContain("身强身弱");
    expect(parsed.legend.chart).not.toContain("喜用神");
    expect(parsed.note).not.toContain("身强身弱");
    expect(parsed.note).not.toContain("喜用神");
    expect(parsed.chart).toHaveLength(parsed.legend.chart.length);
  });
});
