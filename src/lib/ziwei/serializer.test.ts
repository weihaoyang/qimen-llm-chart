import { describe, expect, it } from "vitest";
import { buildZiweiChartFromProfile } from "./chart";
import { serializeZiweiToCompactJson } from "./serializer";

describe("serializeZiweiToCompactJson", () => {
  it("serializes a 12-palace ziwei payload", () => {
    const chart = buildZiweiChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "female",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    const parsed = JSON.parse(serializeZiweiToCompactJson(chart)) as {
      format: string;
      legend: { palace: string[] };
      palaces: unknown[][];
    };

    expect(parsed.format).toBe("ziwei-llm-compact-v1");
    expect(parsed.legend.palace).toContain("宫位名称");
    expect(parsed.palaces).toHaveLength(12);
  });
});
