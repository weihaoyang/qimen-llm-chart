// 「八字 + 中医运气」对照视图：用真实八字输入跑通，钉住"干支 → 脏腑/经络"的对应与边界声明。

import { describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildTcmYunqiView, DI_ZHI_WU_XING, TIAN_GAN_WU_XING } from "./chart";

const chartFor = (iso: string) => {
  const input: ProfileInput = getDefaultProfileInput(new Date(iso), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildBaziChartFromProfile(normalizeProfileInput(input));
};

describe("八字 + 中医运气对照视图", () => {
  const chart = chartFor("1990-05-20T08:30:00+08:00");
  const view = buildTcmYunqiView(chart, 2026);

  it("四柱的干支五行与脏腑/经络对应齐全（依《针灸聚英》《针灸大全》）", () => {
    expect(view.pillars).toHaveLength(4);
    for (const pillar of view.pillars) {
      expect(TIAN_GAN_WU_XING[pillar.gan]).toBe(pillar.ganElement);
      expect(DI_ZHI_WU_XING[pillar.zhi]).toBe(pillar.zhiElement);
      // 《针灸聚英·十二经纳天干歌》：甲胆乙肝丙小肠，丁心戊胃己脾乡，庚属大肠辛属肺，壬属膀胱癸肾藏
      expect(typeof pillar.ganOrgan).toBe("string");
      expect(pillar.ganOrgan).not.toBe("");
      // 《针灸大全·十二经纳地支歌》：肺寅大卯胃辰宫，脾巳心午小未中，申胱酉肾心包戌，亥三子胆丑肝通
      expect(typeof pillar.zhiMeridian).toBe("string");
      expect(pillar.zhiMeridian).not.toBe("");
    }
  });

  it("十干配脏腑的具体取值与歌诀一致", () => {
    const byGan = Object.fromEntries(view.pillars.map((pillar) => [pillar.gan, pillar.ganOrgan]));
    const expected: Record<string, string> = {
      甲: "胆", 乙: "肝", 丙: "小肠", 丁: "心", 戊: "胃",
      己: "脾", 庚: "大肠", 辛: "肺", 壬: "膀胱", 癸: "肾",
    };
    for (const [gan, organ] of Object.entries(byGan)) {
      expect(organ).toBe(expected[gan]);
    }
  });

  it("流年运气与本人五行分布并置，且不产出任何判断", () => {
    expect(view.year).toBe(2026);
    expect(view.yearGanzhi).toBe("丙午");
    expect(view.yunqi.siTian).toBe("少阴君火");
    expect(view.elementShares).toHaveLength(5);
    const totalShare = view.elementShares.reduce((sum, item) => sum + item.share, 0);
    expect(totalShare).toBeGreaterThan(0.9);
    expect(totalShare).toBeLessThan(1.1);
    // 2026 丙午：中运水、司天少阴君火、在泉阳明燥金 → 这三个角色必须出现在对照表里
    const water = view.contrast.find((row) => row.element === "水");
    const fire = view.contrast.find((row) => row.element === "火");
    const metal = view.contrast.find((row) => row.element === "金");
    expect(water?.yunRoles.join()).toContain("中运");
    expect(fire?.yunRoles.join()).toContain("司天");
    expect(metal?.yunRoles.join()).toContain("在泉");
  });

  it("边界声明必须包含「不诊断 / 不给方药」与异说标注", () => {
    const text = view.boundaries.join(" ");
    expect(text).toContain("不做诊断");
    expect(text).toContain("不给方药");
    expect(text).toContain("大寒");
    expect(text).toContain("医宗金鉴");
  });

  it("五行配属表五行齐全（《阴阳应象大论》《金匮真言论》）", () => {
    expect(view.elementAttributes.map((item) => item.element)).toEqual(["木", "火", "土", "金", "水"]);
    expect(view.elementAttributes.find((item) => item.element === "木")?.orifice).toContain("目");
    expect(view.elementAttributes.find((item) => item.element === "水")?.flavor).toBe("咸");
  });

  it("大运覆盖所选流年时给出该步大运", () => {
    const later = buildTcmYunqiView(chart, 1996);
    expect(later.daYun?.coversSelectedYear).toBe(true);
    expect(later.daYun?.ganZhi.length).toBeGreaterThanOrEqual(2);
  });
});
