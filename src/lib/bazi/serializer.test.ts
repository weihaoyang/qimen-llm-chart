import { describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "./chart";
import { serializeBaziToCompactJson, serializeBaziToStructuredText } from "./serializer";

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

  it("exposes observed stem/branch relations and current timing facts", () => {
    const chart = buildBaziChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "1990-01-01T12:00",
        timeZone: "Asia/Shanghai",
        gender: "male",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "1990-01-01T12:00",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });
    const referenceDate = new Date(2026, 7, 2);
    const parsed = JSON.parse(serializeBaziToCompactJson(chart, { referenceDate })) as {
      relations: {
        heavenlyStemCombinations: Array<{ stems?: string; pattern: string }>;
        earthlyBranchRelations: {
          liuChong: Array<{ branches?: string }>;
          xing: Array<{ branches?: string; pattern: string }>;
        };
        timing: {
          referenceDate: string;
          liuNian: { calendarYear: number; ganZhi: string };
          currentDaYun: { ganZhi: string } | null;
        };
      };
    };

    expect(parsed.relations.heavenlyStemCombinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stems: "甲己", pattern: "天干五合" }),
      ]),
    );
    expect(parsed.relations.earthlyBranchRelations.liuChong).toEqual(
      expect.arrayContaining([expect.objectContaining({ branches: "子午" })]),
    );
    expect(parsed.relations.earthlyBranchRelations.xing).toEqual(
      expect.arrayContaining([expect.objectContaining({ branches: "巳寅", pattern: "相刑" })]),
    );
    expect(parsed.relations.timing).toMatchObject({
      referenceDate: "2026-08-02",
      liuNian: { calendarYear: 2026, ganZhi: "丙午" },
      currentDaYun: { ganZhi: "癸酉" },
    });

    const structuredText = serializeBaziToStructuredText(chart, { referenceDate });
    expect(structuredText).toContain("### 结构关系摘要");
    expect(structuredText).toContain("### 流年与当前大运");
    expect(structuredText).toContain("当前大运: 癸酉");
  });
});
