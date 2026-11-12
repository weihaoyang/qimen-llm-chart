import { describe, expect, it, vi } from "vitest";
import { buildBaziChartFromProfile } from "./chart";
import { normalizeProfileInput } from "@/lib/profile/normalize";
import { serializeBaziToCompactJson, serializeBaziToStructuredText } from "./serializer";

describe("serializeBaziToCompactJson", () => {
  it("retains both possible year pillars on the Beijing civil date containing lichun", () => {
    const chart = buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
    }));
    const timing = (day: number) => JSON.parse(serializeBaziToCompactJson(chart, {
      referenceDate: new Date(2024, 1, day),
    })).relations.timing as { liuNian: { ganZhi: string | null; xun: string | null; xunKong: string | null; candidates: Array<{ ganZhi: string }> }; note: string };
    expect(timing(3).liuNian.ganZhi).toBe("癸卯");
    expect(timing(4).liuNian).toMatchObject({ ganZhi: null, xun: null, xunKong: null, candidates: [{ ganZhi: "癸卯" }, { ganZhi: "甲辰" }] });
    expect(timing(4).note).toContain("缺少具体时刻");
    expect(timing(5).liuNian.ganZhi).toBe("甲辰");
    const text = serializeBaziToStructuredText(chart, { referenceDate: new Date(2024, 1, 4) });
    expect(text).toContain("交节前后待定：癸卯");
    expect(text).toContain("甲辰");
  });
  it("locates lichun on the reference zone's civil date rather than the server's date", () => {
    const chart = buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
    }));
    const year = (day: number, referenceTimeZone: string) => JSON.parse(serializeBaziToCompactJson(chart, {
      referenceDate: new Date(2024, 1, day), referenceTimeZone,
    })).relations.timing.liuNian as { ganZhi: string | null; candidates: Array<{ ganZhi: string }> };
    // 2024 立春 at 16:27 UTC+8 is February 3, 22:27 in Honolulu.
    expect(year(2, "Pacific/Honolulu").ganZhi).toBe("癸卯");
    expect(year(3, "Pacific/Honolulu")).toMatchObject({ ganZhi: null, candidates: [{ ganZhi: "癸卯" }, { ganZhi: "甲辰" }] });
    expect(year(4, "Pacific/Honolulu").ganZhi).toBe("甲辰");
    expect(year(3, "Asia/Shanghai").ganZhi).toBe("癸卯");
  });
  it("uses the profile zone for today's default and handles a DST-skipped midnight", () => {
    const chart = buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Pacific/Honolulu", gender: "male", timeBasis: "civil",
    }));
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2024-02-04T06:00:00Z"));
      const timing = JSON.parse(serializeBaziToCompactJson(chart)).relations.timing;
      expect(timing.referenceDate).toBe("2024-02-03");
      expect(timing.liuNian.ganZhi).toBeNull();
      const dst = JSON.parse(serializeBaziToCompactJson(chart, {
        referenceDate: new Date(2018, 10, 4), referenceTimeZone: "America/Sao_Paulo",
      })).relations.timing;
      expect(dst.referenceDate).toBe("2018-11-04");
      expect(dst.liuNian.ganZhi).toBe("戊戌");
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps the lunar-new-year convention distinct from the lichun boundary", () => {
    const chart = buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
      baziSettings: { yearBoundary: "lunar-new-year", dayBoundary: "midnight" },
    }));
    const year = (day: number) => JSON.parse(serializeBaziToCompactJson(chart, {
      referenceDate: new Date(2024, 1, day),
    })).relations.timing.liuNian as { ganZhi: string | null; candidates: unknown[] };
    expect(year(4).ganZhi).toBe("癸卯");
    expect(year(9).ganZhi).toBe("癸卯");
    expect(year(10).ganZhi).toBe("甲辰");
    expect(year(10).candidates).toHaveLength(1);
  });
  it("does not switch ten-year luck cycles at the beginning of the calendar year", () => {
    const chart = buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
    }));
    expect(chart.raw.yun.startSolar).toBe("1998-05-01 12:00:00");
    const timing = (year: number, month: number, day: number) => JSON.parse(serializeBaziToCompactJson(chart, {
      referenceDate: new Date(year, month - 1, day),
    })).relations.timing as { currentDaYun: { ganZhi: string } | null; note: string };
    const cycles = chart.raw.yun.daYun;
    expect(timing(1998, 4, 30).currentDaYun).toBeNull();
    expect(timing(1998, 5, 2).currentDaYun?.ganZhi).toBe(cycles[0].ganZhi);
    expect(timing(2008, 1, 1).currentDaYun?.ganZhi).toBe(cycles[0].ganZhi);
    expect(timing(2008, 4, 30).currentDaYun?.ganZhi).toBe(cycles[0].ganZhi);
    expect(timing(2008, 5, 1)).toMatchObject({ currentDaYun: null, note: expect.stringContaining("交运日") });
    expect(timing(2008, 5, 2).currentDaYun?.ganZhi).toBe(cycles[1].ganZhi);
    expect(serializeBaziToStructuredText(chart, { referenceDate: new Date(2008, 4, 1) })).toContain("当前大运: 无法按参考日期确定");
  });
  it("handles leap-day starting dates using the calendar library's year addition", () => {
    const chart = buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
    }));
    chart.raw.yun.startSolar = "2000-02-29 12:00:00";
    const timing = (month: number, day: number) => JSON.parse(serializeBaziToCompactJson(chart, {
      referenceDate: new Date(2010, month - 1, day),
    })).relations.timing as { currentDaYun: { ganZhi: string } | null; note: string };
    expect(timing(2, 27).currentDaYun?.ganZhi).toBe(chart.raw.yun.daYun[0].ganZhi);
    expect(timing(2, 28)).toMatchObject({ currentDaYun: null, note: expect.stringContaining("交运日") });
    expect(timing(3, 1).currentDaYun?.ganZhi).toBe(chart.raw.yun.daYun[1].ganZhi);
  });
  it("exports an empty-middle arch and preserves the six-break textual disagreement", () => {
    const chartAt = (datetime: string) => buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime, timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
    }));
    const missingZi = chartAt("2024-09-29T12:00");
    const fullTrine = chartAt("2024-09-29T00:00");
    const getArches = (chart: typeof missingZi) => JSON.parse(serializeBaziToCompactJson(chart)).relations.earthlyBranchRelations.gongHe as Array<{ symbols: string; detail: string }>;
    expect(getArches(missingZi)).toEqual(expect.arrayContaining([expect.objectContaining({ symbols: "辰申", detail: expect.stringContaining("虚拱子") })]));
    expect(getArches(fullTrine).some(item => item.symbols === "辰申")).toBe(false);
    expect(serializeBaziToStructuredText(missingZi)).toContain("虚拱子");
    const yinHai = chartAt("2022-07-01T21:00");
    const details = JSON.parse(serializeBaziToCompactJson(yinHai)).relations.earthlyBranchRelations.po as Array<{ detail: string }>;
    expect(details.some(item => item.detail.includes("《三命通会》破煞条对四生支不取"))).toBe(true);
    expect(serializeBaziToStructuredText(yinHai)).toContain("《三命通会》破煞条对四生支不取");
  });
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
        heavenlyStemClashes: Array<{ symbols?: string; pattern: string }>;
        earthlyBranchRelations: {
          liuChong: Array<{ branches?: string }>;
          banHe: Array<{ symbols?: string }>;
          xing: Array<{ branches?: string; pattern: string }>;
        };
        tianKeDiChong: unknown[];
        fuYin: unknown[];
        dayXunKongVoid: unknown[];
        missingElements: string[];
        dayMasterStrength: string;
        notes: string[];
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
    // The finer relation fields feed the Agent the same list the panel shows.
    expect(Array.isArray(parsed.relations.heavenlyStemClashes)).toBe(true);
    expect(Array.isArray(parsed.relations.earthlyBranchRelations.banHe)).toBe(true);
    expect(parsed.relations.tianKeDiChong).toBeInstanceOf(Array);
    expect(parsed.relations.dayXunKongVoid).toBeInstanceOf(Array);
    expect(parsed.relations.missingElements).toBeInstanceOf(Array);
    expect(typeof parsed.relations.dayMasterStrength).toBe("string");
    expect(parsed.relations.notes.length).toBeGreaterThan(0);
    expect(parsed.relations.timing).toMatchObject({
      referenceDate: "2026-08-02",
      liuNian: { calendarYear: 2026, ganZhi: "丙午" },
      currentDaYun: { ganZhi: "癸酉" },
    });

    const structuredText = serializeBaziToStructuredText(chart, { referenceDate });
    expect(structuredText).toContain("### 结构关系摘要");
    expect(structuredText).toContain("天干相冲:");
    expect(structuredText).toContain("关系提示:");
    expect(structuredText).toContain("### 流年与当前大运");
    expect(structuredText).toContain("当前大运: 癸酉");
  });

  it("serializes the selected year/day boundary convention for the AI", () => {
    const chart = buildBaziChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "1988-02-15T16:50",
        timeZone: "Asia/Shanghai",
        gender: "female",
        timeBasis: "civil",
        baziSettings: { yearBoundary: "lunar-new-year", dayBoundary: "zi-start" },
      },
      normalized: {
        datetime: "1988-02-15T16:50",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    expect(chart.raw.baZi[0]).toBe("丁卯");
    expect(serializeBaziToStructuredText(chart)).toContain("春节换年；子初换日（23时）");
    expect(serializeBaziToCompactJson(chart)).toContain('"yearBoundary":"lunar-new-year"');
  });
});
