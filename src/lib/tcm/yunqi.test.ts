// 五运六气内核的回归：三个年份用**独立可核验的第三方结论**钉住
// （2026 丙午 / 2024 甲辰 / 2023 癸卯 的岁运、司天、在泉、客气六步均可从公开运气资料交叉验证）。

import { describe, expect, it } from "vitest";
import { analyzeYunQi, ganzhiOfYear, LIU_QI_ORDER } from "./yunqi";

it("reproduces the six guest steps for Zi–Wu and Mao–You years", () => {
  // 《素问经注节解》卷四及《类经图翼》卷二。
  expect(analyzeYunQi(2026).keQiSteps).toEqual([
    "太阳寒水", "厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金",
  ]);
  expect(analyzeYunQi(2029).keQiSteps).toEqual([
    "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水", "厥阴风木", "少阴君火",
  ]);
});

describe("五运六气内核", () => {
  it("干支纪年以 1984 甲子为基准", () => {
    expect(ganzhiOfYear(1984).ganzhi).toBe("甲子");
    expect(ganzhiOfYear(2026).ganzhi).toBe("丙午");
    expect(ganzhiOfYear(2024).ganzhi).toBe("甲辰");
    expect(ganzhiOfYear(2023).ganzhi).toBe("癸卯");
  });

  it("2026 丙午：水运太过（流衍之纪）、少阴君火司天、阳明燥金在泉、客气六步自太阳寒水起", () => {
    const result = analyzeYunQi(2026);
    expect(result.gan).toBe("丙");
    expect(result.yun.element).toBe("水");
    expect(result.yun.strength).toBe("太过");
    expect(result.yun.jiName).toBe("流衍");
    expect(result.siTian).toBe("少阴君火");
    expect(result.zaiQuan).toBe("阳明燥金");
    expect(result.keQiSteps).toEqual(["太阳寒水", "厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金"]);
    // 客气第三步必须是司天，第六步必须是在泉
    expect(result.keQiSteps[2]).toBe(result.siTian);
    expect(result.keQiSteps[5]).toBe(result.zaiQuan);
  });

  it("2024 甲辰：土运太过（敦阜之纪）、太阳寒水司天、太阴湿土在泉，且中运临四季之辰 → 岁会", () => {
    const result = analyzeYunQi(2024);
    expect(result.yun.element).toBe("土");
    expect(result.yun.strength).toBe("太过");
    expect(result.yun.jiName).toBe("敦阜");
    expect(result.siTian).toBe("太阳寒水");
    expect(result.zaiQuan).toBe("太阴湿土");
    expect(result.yun.suiHui).toBe(true); // 土运临四季（辰戌丑未）
    expect(result.yun.tianFu).toBe(false);
    expect(result.yun.taiYiTianFu).toBe(false);
  });

  it("2023 癸卯：火运不及（伏明之纪）、阳明燥金司天、少阴君火在泉", () => {
    const result = analyzeYunQi(2023);
    expect(result.yun.element).toBe("火");
    expect(result.yun.strength).toBe("不及");
    expect(result.yun.jiName).toBe("伏明");
    expect(result.siTian).toBe("阳明燥金");
    expect(result.zaiQuan).toBe("少阴君火");
    expect(result.yun.tianFu).toBe(false);
    expect(result.yun.suiHui).toBe(false);
  });

  it("2009 己丑：中运与司天同气（天符）且临岁支正位（岁会）→ 太乙天符", () => {
    const result = analyzeYunQi(2009);
    expect(result.ganzhi).toBe("己丑");
    expect(result.yun.element).toBe("土");
    expect(result.siTian).toBe("太阴湿土");
    expect(result.yun.tianFu).toBe(true);
    expect(result.yun.suiHui).toBe(true);
    expect(result.yun.taiYiTianFu).toBe(true);
  });

  it("六步主气固定不变，客主加临按同气/相生/相克判相得", () => {
    const result = analyzeYunQi(2026);
    expect(result.steps.map((step) => step.zhuQi)).toEqual([
      "厥阴风木",
      "少阴君火",
      "少阳相火",
      "太阴湿土",
      "阳明燥金",
      "太阳寒水",
    ]);
    // 初之气：主厥阴风木（木）／客太阳寒水（水）→ 水生木，相得
    expect(result.steps[0].generating).toBe(true);
    expect(result.steps[0].verdict).toBe("相得");
    // 三之气：主少阳相火／客少阴君火 → 同属火，按通行口径算同气相得（异说见模块注释）
    expect(result.steps[2].sameQi).toBe(true);
    expect(result.steps[2].verdict).toBe("相得");
    // 每一步的客主两气都必须是六气之一
    for (const step of result.steps) {
      expect(LIU_QI_ORDER).toContain(step.zhuQi);
      expect(LIU_QI_ORDER).toContain(step.keQi);
    }
  });

  it("distinguishes the two fire orders without conflating them with five-element overcoming", () => {
    const shun = analyzeYunQi(2026).steps[2];
    expect(shun).toMatchObject({ zhuQi: "少阳相火", keQi: "少阴君火", sameQi: true, overcoming: false, verdict: "相得", fireOrder: "顺" });
    const ni = analyzeYunQi(2029).steps[1];
    expect(ni).toMatchObject({ zhuQi: "少阴君火", keQi: "少阳相火", sameQi: true, overcoming: false, verdict: "相得", fireOrder: "逆" });
    for (let year = 2000; year < 2012; year++) for (const step of analyzeYunQi(year).steps) {
      const expected = step.zhuQi === "少阳相火" && step.keQi === "少阴君火" ? "顺" : step.zhuQi === "少阴君火" && step.keQi === "少阳相火" ? "逆" : null;
      expect(step.fireOrder, `${year} ${step.name}`).toBe(expected);
    }
  });

  it("客主相克时区分主胜逆与客胜从", () => {
    // 找一个人为组合验证判定方向：主木 / 客土 → 木克土（主胜）→ 主胜逆
    const cases = [2010, 2011, 2012, 2013, 2014].map((year) => analyzeYunQi(year));
    const overcomingSteps = cases.flatMap((item) => item.steps).filter((step) => step.overcoming);
    expect(overcomingSteps.length).toBeGreaterThan(0);
    for (const step of overcomingSteps) {
      expect(step.verdict === "不相得（主胜逆）" || step.verdict === "不相得（客胜从）").toBe(true);
    }
  });
});

it("distinguishes year-branch agreement from heaven agreement", () => {
  expect(analyzeYunQi(2024).yun).toMatchObject({ suiHui: true, tianFu: false, taiYiTianFu: false });
  expect(analyzeYunQi(2025).yun).toMatchObject({ suiHui: false, tianFu: false, taiYiTianFu: false });
  expect(analyzeYunQi(2027).yun.suiHui).toBe(false);
});

it("matches all twenty-four heaven and earth coincidences in 六元正纪大论", () => {
  const heaven = new Set(["戊子", "戊午", "戊寅", "戊申", "丙辰", "丙戌", "丁巳", "丁亥", "乙卯", "乙酉", "己丑", "己未"]);
  const earthExcess = new Set(["甲辰", "甲戌", "壬寅", "壬申", "庚子", "庚午"]);
  const earthDeficiency = new Set(["癸巳", "癸亥", "辛丑", "辛未", "癸卯", "癸酉"]);
  for (let year = 1984; year < 2044; year += 1) {
    const { ganzhi, yun } = analyzeYunQi(year);
    expect(yun.tianFu, ganzhi).toBe(heaven.has(ganzhi));
    expect(yun.tongTianFu, ganzhi).toBe(earthExcess.has(ganzhi));
    expect(yun.tongSuiHui, ganzhi).toBe(earthDeficiency.has(ganzhi));
  }
});

it("assigns six consecutive Jin Jian intervals to the HKO 2026 solar-term dates", () => {
  const steps = analyzeYunQi(2026).steps;
  expect(steps.map(({ startTerm }) => startTerm)).toEqual(["大寒", "春分", "小满", "大暑", "秋分", "小雪"]);
  expect(steps.map(({ startDate }) => startDate)).toEqual([
    "2026-01-20", "2026-03-20", "2026-05-21", "2026-07-23", "2026-09-23", "2026-11-22",
  ]);
  expect(steps.slice(0, -1).map(({ endDateExclusive }) => endDateExclusive)).toEqual(steps.slice(1).map(({ startDate }) => startDate));
  expect(steps.at(-1)?.endDateExclusive).toBe("2027-01-20");
});

it("rejects fractional years and retains the sexagenary cycle for safe integers", () => {
  expect(() => analyzeYunQi(2026.5)).toThrow(RangeError);
  expect(analyzeYunQi(-Number.MAX_SAFE_INTEGER).ganzhi).toBe(analyzeYunQi(-Number.MAX_SAFE_INTEGER % 60).ganzhi);
});

it("exports pre-reform solar-term dates in the proleptic Gregorian calendar", () => {
  // Julian 1500-01-11 and Gregorian 1500-01-20 denote the same day.
  expect(analyzeYunQi(1500).steps[0].startDate).toBe("1500-01-20");
});

it("keeps the Jin Jian five movement periods separate from the six qi steps", () => {
  const { movementPeriods } = analyzeYunQi(2026);
  expect(movementPeriods.map(period => period.startDate)).toEqual([
    "2026-01-20", "2026-04-02", "2026-06-15", "2026-08-30", "2026-11-11",
  ]);
  expect(movementPeriods.map(period => period.endDateExclusive)).toEqual([
    "2026-04-02", "2026-06-15", "2026-08-30", "2026-11-11", "2027-01-20",
  ]);
  expect(movementPeriods.map(period => period.host)).toEqual(["木", "火", "土", "金", "水"]);
  expect(movementPeriods.map(period => period.guest)).toEqual(["水", "木", "火", "土", "金"]);
});

it("reproduces the four traditional handover groups and six half-ke steps", () => {
  expect([2024, 2025, 2026, 2027].map(year => analyzeYunQi(year).handoverKe)).toEqual([
    ["1刻", "87刻6分", "76刻", "62刻6分", "51刻", "37刻6分"],
    ["26刻", "12刻6分", "1刻", "87刻6分", "76刻", "62刻6分"],
    ["51刻", "37刻6分", "26刻", "12刻6分", "1刻", "87刻6分"],
    ["76刻", "62刻6分", "51刻", "37刻6分", "26刻", "12刻6分"],
  ]);
});

it("anchors the traditional clock at yin-chu and handles midnight without ordinal drift", () => {
  // 《类经图翼》卷二列四组刻序；《运气易览》列寅初与同刻分组。
  expect([2024, 2025, 2026, 2027].map(year => analyzeYunQi(year).handoverLocalTime[0]))
    .toEqual(["03:00:00", "09:00:00", "15:00:00", "21:00:00"]);
  expect(analyzeYunQi(2026).handoverLocalTime).toEqual([
    "15:00:00", "12:00:00", "09:00:00", "06:00:00", "03:00:00", "00:00:00",
  ]);
  expect(analyzeYunQi(2024).handoverLocalTime).toEqual([
    "03:00:00", "00:00:00", "21:00:00", "18:00:00", "15:00:00", "12:00:00",
  ]);
  // 《类经图翼》卷二丁卯例：初气始于七十六刻；《天元玉册》释为亥初。
  // 21:00 是等时钟面约定，不能据此称为原文给出的现代法定时刻。
  const dingMao = analyzeYunQi(2027);
  expect(dingMao.handoverKe[0]).toBe("76刻");
  expect(dingMao.handoverLocalTime[0]).toBe("21:00:00");
});
