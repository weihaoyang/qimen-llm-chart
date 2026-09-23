import { describe, expect, it } from "vitest";
import { buildHistoricalBenchmarkContext } from "./history-benchmark-context";

describe("buildHistoricalBenchmarkContext", () => {
  it("uses the product Bazi and Ziwei serializers with the question's target year", () => {
    const context = buildHistoricalBenchmarkContext({
      birth: { year: 1974, month: 4, day: 28, hour: 16, minute: 40, gender: "男" },
      question: "此命 1996 年发生何事？",
    });

    expect(context.targetYear).toBe(1996);
    expect(context.timeConvention).toContain("不启用真太阳时");
    expect(context.structuredText).toContain("### 八字（产品引擎）");
    expect(context.structuredText).toContain("### 紫微（产品引擎）");
    expect(context.structuredText).toContain("流年: 1996 丙子");
    expect(context.structuredText).toContain("目标年份: 1996");
    expect(JSON.parse(context.jsonPayload)).toMatchObject({
      format: "qmdj-history-benchmark-context-v1",
      targetYear: 1996,
    });
    expect(context.candidateYears).toEqual([1996]);
  });

  it("builds separate product time slices for years embedded in answer options", () => {
    const context = buildHistoricalBenchmarkContext({
      birth: { year: 1974, month: 4, day: 28, hour: 16, minute: 40, gender: "男" },
      question: "何年应事？",
      candidateYears: [1996, 2001, 2008, 1996],
    });

    expect(context.targetYear).toBeNull();
    expect(context.candidateYears).toEqual([1996, 2001, 2008]);
    expect(context.structuredText).toContain("候选年份时间切片");
    expect(context.structuredText).toContain("1996（虚岁 23）");
    expect(context.structuredText).toContain("2008（虚岁 35）");
    expect(context.structuredText).toContain("流年十神:");
    expect(context.structuredText).toContain("流年支触发:");
    expect(JSON.parse(context.jsonPayload).timingSlices).toHaveLength(3);
  });

  it("does not manufacture a target-year timing context when no year is asked", () => {
    const context = buildHistoricalBenchmarkContext({
      birth: { year: 1974, month: 4, day: 28, gender: "male" },
      question: "请判断此人的性格倾向。",
    });

    expect(context.targetYear).toBeNull();
    expect(context.structuredText).toContain("不得补造流年结论");
  });

  it("pins the reference instant to a mid-year date that survives the local round-trip", () => {
    // The 流年 of a calendar year is identified from a mid-year instant: both the
    // 立春 and the 农历春节 boundary fall in January/February, so an early-year
    // instant would belong to the previous 干支 year. July must also read back as
    // July on every server time zone — the payload is compared across runs, so a
    // `Date.UTC` instant (which reads back as June 30 west of UTC) would make it
    // time-zone dependent.
    const context = buildHistoricalBenchmarkContext({
      birth: { year: 1974, month: 4, day: 28, hour: 16, minute: 40, gender: "男" },
      question: "此命 1996 年发生何事？",
    });
    const payload = JSON.parse(context.jsonPayload);

    expect(payload.bazi.relations.timing.referenceDate).toBe("1996-07-01");
    expect(context.structuredText).toContain("流年: 1996 丙子");
  });

  it("gives every candidate year its own mid-year reference instant", () => {
    const context = buildHistoricalBenchmarkContext({
      birth: { year: 1974, month: 4, day: 28, hour: 16, minute: 40, gender: "男" },
      question: "何年应事？",
      candidateYears: [1996, 2001, 2008],
    });
    const payload = JSON.parse(context.jsonPayload);

    expect(payload.timingSlices.map((slice: { liuNian: { calendarYear: number } }) => slice.liuNian.calendarYear))
      .toEqual([1996, 2001, 2008]);
    expect(payload.timingSlices.map((slice: { liuNian: { ganZhi: string } }) => slice.liuNian.ganZhi))
      .toEqual(["丙子", "辛巳", "戊子"]);
  });
});
