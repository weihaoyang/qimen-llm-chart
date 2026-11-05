import { describe, expect, it } from "vitest";
import { calculateHuangjiChronology, formatHistoricalYear, parseHistoricalYear, toAstronomicalYear } from "./chronology";
import { serializeHuangjiToStructuredText } from "./serializer";

describe("huangji chronology", () => {
  it("reproduces three dated entries in Huangji Jingshi volume four", () => {
    for (const [year, shi, yearInShi, ganzhi] of [
      [684, 2257, 21, "甲申"],
      [694, 2258, 1, "甲午"],
      [1064, 2270, 11, "甲辰"],
    ] as const) {
      const result = calculateHuangjiChronology({ era: "CE", year });
      expect(result.shi).toMatchObject({ number: shi, year: yearInShi });
      expect(result.sexagenaryYear.name).toBe(ganzhi);
    }
  });
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

it("resets the nested cycles at the second yuan", () => {
  const last = calculateHuangjiChronology({ era: "CE", year: 62583 });
  const next = calculateHuangjiChronology({ era: "CE", year: 62584 });
  expect([last.yuan.year, last.hui.number, last.yun.number, last.shi.number, last.sexagenaryYear.name])
    .toEqual([129600, 12, 360, 4320, "癸亥"]);
  expect([next.yuan.number, next.yuan.year, next.hui.number, next.yun.number, next.shi.number, next.sexagenaryYear.name])
    .toEqual([2, 1, 1, 1, 1, "甲子"]);
});

it("matches four historical 世 boundaries in 皇极经世卷四下", () => {
  for (const [year, shi, within, ganzhi] of [
    [693, 2257, 30, "癸巳"], [694, 2258, 1, "甲午"],
    [723, 2258, 30, "癸亥"], [724, 2259, 1, "甲子"],
    [1053, 2269, 30, "癸巳"], [1054, 2270, 1, "甲午"],
    [1083, 2270, 30, "癸亥"], [1084, 2271, 1, "甲子"],
  ] as const) {
    const chart = calculateHuangjiChronology({ era: "CE", year });
    expect([chart.shi.number, chart.shi.year, chart.sexagenaryYear.name]).toEqual([shi, within, ganzhi]);
  }
});

it("matches Zhou, Qin-Han and Jin rows across the BCE/CE boundary", () => {
  for (const [era, year, yun, shi, within, ganzhi] of [
    ["BCE", 770, 185, 2209, 8, "辛未"],
    ["BCE", 207, 186, 2228, 1, "甲午"],
    ["BCE", 206, 186, 2228, 2, "乙未"],
    ["BCE", 57, 187, 2233, 1, "甲子"],
    ["CE", 304, 188, 2245, 1, "甲子"],
  ] as const) {
    const chart = calculateHuangjiChronology({ era, year });
    expect([chart.yun.number, chart.shi.number, chart.shi.year, chart.sexagenaryYear.name]).toEqual([yun, shi, within, ganzhi]);
  }
});

it("keeps the nested coordinates continuous at the adopted epoch", () => {
  const before = calculateHuangjiChronology({ era: "BCE", year: 67018 });
  const first = calculateHuangjiChronology({ era: "BCE", year: 67017 });
  expect([before.ordinalFromEpoch, before.yuan.number, before.yuan.year, before.shi.year, before.sexagenaryYear.name])
    .toEqual([0, 0, 129600, 30, "癸亥"]);
  expect([first.ordinalFromEpoch, first.yuan.number, first.yuan.year, first.shi.year, first.sexagenaryYear.name])
    .toEqual([1, 1, 1, 1, "甲子"]);
});
