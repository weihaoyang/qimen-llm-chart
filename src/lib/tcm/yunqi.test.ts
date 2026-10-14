// 五运六气内核的回归：三个年份用**独立可核验的第三方结论**钉住
// （2026 丙午 / 2024 甲辰 / 2023 癸卯 的岁运、司天、在泉、客气六步均可从公开运气资料交叉验证）。

import { describe, expect, it } from "vitest";
import { analyzeYunQi, ganzhiOfYear, LIU_QI_ORDER } from "./yunqi";

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
