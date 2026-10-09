import { describe, expect, it } from "vitest";
import { calculateHuangjiChronology, formatHistoricalYear, parseHistoricalYear, toAstronomicalYear } from "./chronology";
import { serializeHuangjiToStructuredText } from "./serializer";

describe("huangji chronology", () => {
  it("anchors the epoch at 公元前 67017 = 甲子", () => {
    const epoch = calculateHuangjiChronology({ era: "BCE", year: 67017 });
    expect(epoch.ordinalFromEpoch).toBe(1);
    expect(epoch.yuan).toMatchObject({ number: 1, stem: "甲", year: 1 });
    expect(epoch.hui).toMatchObject({ number: 1, branch: "子" });
    expect(epoch.yun).toMatchObject({ number: 1, stem: "甲" });
    expect(epoch.shi).toMatchObject({ number: 1, branch: "子", year: 1 });
    expect(epoch.sexagenaryYear.name).toBe("甲子");
  });

  it("matches the two historical anchors from the spec", () => {
    // 公元前 87 年 -> ordinal 66931 -> 第 2232 世第 1 年
    const bce = calculateHuangjiChronology({ era: "BCE", year: 87 });
    expect(bce.ordinalFromEpoch).toBe(66931);
    expect(bce.shi.number).toBe(2232);
    expect(bce.shi.year).toBe(1);

    // 公元 544 年 -> ordinal 67561 -> 第 2253 世第 1 年
    const ce = calculateHuangjiChronology({ era: "CE", year: 544 });
    expect(ce.ordinalFromEpoch).toBe(67561);
    expect(ce.shi.number).toBe(2253);
    expect(ce.shi.year).toBe(1);
  });

  it("positions 公元 2026 across every level", () => {
    const chart = calculateHuangjiChronology({ era: "CE", year: 2026 });
    expect(chart.ordinalFromEpoch).toBe(69043);
    expect(chart.yuan.number).toBe(1);
    expect(chart.hui.number).toBe(7);
    expect(chart.yun.number).toBe(192);
    expect(chart.shi.number).toBe(2302);
    expect(chart.shi.numberWithinYun).toBe(10);
    expect(chart.shi.year).toBe(13);
    expect(chart.sexagenaryYear.name).toBe("丙午");
  });

  it("converts historical years and rejects 公元 0 年", () => {
    expect(toAstronomicalYear({ era: "BCE", year: 1 })).toBe(0);
    expect(toAstronomicalYear({ era: "CE", year: 1 })).toBe(1);
    expect(formatHistoricalYear({ era: "BCE", year: 67017 })).toBe("公元前67017年");
    expect(parseHistoricalYear("2026")).toEqual({ era: "CE", year: 2026 });
    expect(parseHistoricalYear("-87")).toEqual({ era: "BCE", year: 87 });
    expect(parseHistoricalYear("前87年")).toEqual({ era: "BCE", year: 87 });
    expect(parseHistoricalYear("公元前87年")).toEqual({ era: "BCE", year: 87 });
    expect(() => parseHistoricalYear("0")).toThrow();
    expect(() => parseHistoricalYear("abc")).toThrow();
  });

  it("serializes the coordinate chain", () => {
    const text = serializeHuangjiToStructuredText(calculateHuangjiChronology({ era: "CE", year: 2026 }));
    expect(text).toContain("元会运世");
    expect(text).toContain("第 2302 世");
    expect(text).toContain("丙午");
    expect(text).toContain("边界：");
  });
});
