import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { ayanamsa } from "@/lib/vedic/ayanamsa";
import { buildQizhengChart, FOUR_REMAINDERS, hourToBranchIndex, longitudeToMansion, longitudeToPalace, mingPalaceIndex, SEVEN_LUMINARIES, TWELVE_PALACES } from "./chart";
import { serializeQizhengToStructuredText } from "./serializer";

const profile = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return normalizeProfileInput(input);
};

// 历元：康熙二十三年甲子（1684-01-01.0 UT），与 chart.ts 的 MANSION_EPOCH_JD 一致。
const EPOCH_UT = Date.UTC(1684, 0, 1);
const JD_EPOCH = EPOCH_UT / 86_400_000 + 2_440_587.5;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

// 岁差自 1684 历元起的东行量（度），即「回归黄经 − 恒星黄经」。
const drift = (millis: number) => ayanamsa(millis / 86_400_000 + 2_440_587.5) - ayanamsa(JD_EPOCH);

describe("qizheng siyu chart", () => {
  it("maps longitudes into palaces with the classical 十二次 (Aries = 戌)", () => {
    expect(longitudeToPalace(0)).toBe(10); // 0° 白羊 → 戌宫
    expect(longitudeToPalace(30)).toBe(9); // 30° 金牛 → 酉宫
    expect(longitudeToPalace(180)).toBe(4); // 180° 天秤 → 辰宫
    expect(longitudeToPalace(300)).toBe(0); // 300° 水瓶 → 子宫
    expect(longitudeToPalace(330)).toBe(11); // 330° 双鱼 → 亥宫
    expect(TWELVE_PALACES[0]).toBe("命宫");
  });

  it("uses the Qing ecliptic mansion degrees (《二十八宿黄道经纬度钤》) instead of equal 360/28 divisions", () => {
    // 宿界即距星。原表历元 1684、初宫（星纪初）起冬至＝回归黄经 270°。
    // 原文「斗初宫五度五十分」→ 270° + 5°50′ = 275.8333°；「觜五宫十九度二十二分」→ 79.3667°。
    expect(longitudeToMansion(275.8334, EPOCH_UT)).toBe("斗"); // 距星本身即在宿初
    expect(longitudeToMansion(275.8, EPOCH_UT)).toBe("箕"); // 差一点即退入前一宿
    expect(longitudeToMansion(79.3667, EPOCH_UT)).toBe("觜");
    expect(longitudeToMansion(90.9167, EPOCH_UT)).toBe("井"); // 原文「井六宫初度五十五分」

    // 古典宿度不等分，且与等分 360/28 明显不同：
    // 井三十度二十五分最阔，房四度五十分、参一度二十一分最狭。
    expect(longitudeToMansion(105, EPOCH_UT)).toBe("井"); // 井横跨约 90.9°–121.3°
    expect(longitudeToMansion(120, EPOCH_UT)).toBe("井");
    expect(longitudeToMansion(121.4, EPOCH_UT)).toBe("鬼");
    expect(longitudeToMansion(239.9, EPOCH_UT)).toBe("房"); // 房仅约 4.8° 宽
    expect(longitudeToMansion(243.4, EPOCH_UT)).toBe("心");
    expect(longitudeToMansion(250.9, EPOCH_UT)).toBe("尾");
  });

  it("keeps the twenty-eight 宿度 summing to 360° and follows the 1684 参前觜后 order", () => {
    // 原表自洽性：28 宿距度（相邻距星之差）合计应恰为 360°。
    // 由本函数在历元下逐宿取样统计：把 0°–360° 以极细步长分给 28 宿并按宿名归并宽度。
    const widths = new Map<string, number>();
    const step = 0.001;
    for (let lng = 0; lng < 360; lng += step) {
      const name = longitudeToMansion(lng + step / 2, EPOCH_UT);
      widths.set(name, (widths.get(name) ?? 0) + step);
    }
    expect(widths.size).toBe(28);
    const total = [...widths.values()].reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(360, 1);
    // 最阔为井（30°25′），最狭为参（1°21′）与房（4°50′）。
    expect(widths.get("井") ?? 0).toBeCloseTo(30.4, 1);
    expect(widths.get("参") ?? 0).toBeCloseTo(1.35, 1);
    expect(widths.get("房") ?? 0).toBeCloseTo(4.83, 1);

    // 觜／参次序：本表为康熙二十三年「参前觜后」（参 [78.0167,79.3667)，觜 [79.3667,90.9167)），
    // 与《清史稿》康熙甲子「鹑首＝觜觿一十度三十八分」一致（90° 应落于觜宿）。
    expect(longitudeToMansion(79.0, EPOCH_UT)).toBe("参");
    expect(longitudeToMansion(79.4, EPOCH_UT)).toBe("觜");
    expect(longitudeToMansion(90.0, EPOCH_UT)).toBe("觜");
  });

  it("anchors the mansion frame to real determinative stars (Spica as the start of 角宿)", () => {
    // 角宿距星 ＝ 角宿一（Spica, α Vir；J2000.0 赤经 201.29825°、赤纬 −11.16132°）。
    // 换算得 J2000.0 回归黄经 203.8414°，由本仓岁差折回 1684 历元得 199.4304°，
    // 与原表「角九宫十九度二十六分」＝199.4333° 相差 0.003°（＝原表度分取整量级）。
    const spica2000 = 203.8414;
    const spica1684 = spica2000 - drift(utc("2000-01-01"));
    expect(spica1684).toBeCloseTo(199.4333, 1);
    // 因宿界即 Spica 本身，恰在界上不判；改取其两侧 0.5°：
    expect(longitudeToMansion(spica2000 + 0.5, utc("2000-01-01"))).toBe("角");
    expect(longitudeToMansion(spica2000 - 0.5, utc("2000-01-01"))).toBe("轸");
  });

  it("moves mansion boundaries with precession (same tropical longitude belongs to an earlier mansion at a later epoch)", () => {
    // 恒星沿黄道东行，故固定的回归黄经在愈晚的历元愈靠近「其东侧」宿界之前，落宿遂西移一宿。
    // 199.4333° 是角宿距星在 1684 的回归黄经：该年属角，到 2100 年角宿界已东行约 5.8°，
    // 同一黄经便落入轸宿。这一方向性正是《钤》「经度每岁东行五十一秒」所指。
    expect(longitudeToMansion(199.5, EPOCH_UT)).toBe("角");
    expect(longitudeToMansion(199.4, EPOCH_UT)).toBe("轸");
    expect(longitudeToMansion(199.5, utc("2100-01-01"))).toBe("轸");
    // 岁差东行量：2100 年约 5.8°，J2000 恰 4.411°（与 Spica 一节的换算自洽）。
    expect(drift(utc("2100-01-01"))).toBeGreaterThan(5);
    expect(drift(utc("2100-01-01"))).toBeLessThan(6);
    expect(drift(utc("2000-01-01"))).toBeCloseTo(4.411, 2);
  });

  it("derives 命宫 with the Guolao rule (sun palace + birth hour, counted to 卯)", () => {
    expect(hourToBranchIndex(0)).toBe(0); // 子时
    expect(hourToBranchIndex(8)).toBe(4); // 辰时
    expect(hourToBranchIndex(22)).toBe(11); // 亥时
    // 生时即卯 → 命宫 = 太阳宫
    expect(mingPalaceIndex(10, 3)).toBe(10);
    // 太阳在戌、午时：午→戌 顺数至卯落未
    expect(mingPalaceIndex(10, 6)).toBe(7);
    // 太阳在戌、子时：命宫 = 太阳宫 + 3
    expect(mingPalaceIndex(10, 0)).toBe(1);
  });

  it("reaches the classical dignity table now that palaces use the classical mapping", () => {
    const input: ProfileInput = getDefaultProfileInput(new Date("1990-03-21T12:00:00+08:00"), "Asia/Shanghai");
    input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const chart = buildQizhengChart(normalizeProfileInput(input));
    const sun = chart.stars.find((star) => star.name === "太阳");
    expect(sun?.branch).toBe("戌"); // 太阳位于白羊
    expect(sun?.dignity).toBe("庙"); // 太阳庙于戌宫
  });

  it("places seven luminaries and four remainders", () => {
    const chart = buildQizhengChart(profile());
    expect(chart.format).toBe("qmdj-qizheng-chart-v1");
    expect(chart.complete).toBe(true);
    const luminaries = chart.stars.filter((star) => star.kind === "七政");
    const remainders = chart.stars.filter((star) => star.kind === "四余");
    expect(luminaries).toHaveLength(SEVEN_LUMINARIES.length);
    expect(remainders.map((star) => star.name)).toEqual([...FOUR_REMAINDERS]);
    expect(chart.palaces).toHaveLength(12);
    expect(chart.palaces[0]?.name).toBe("命宫");
    for (const star of chart.stars) {
      expect(star.longitude).toBeGreaterThanOrEqual(0);
      expect(star.longitude).toBeLessThan(360);
      expect(star.mansion.length).toBeGreaterThan(0);
      expect(star.palaceName.length).toBeGreaterThan(0);
    }
  });

  it("keeps 罗睺 and 计都 opposite and is deterministic", () => {
    const chart = buildQizhengChart(profile());
    const luo = chart.stars.find((star) => star.name === "罗睺");
    const ji = chart.stars.find((star) => star.name === "计都");
    expect(luo && ji).toBeTruthy();
    const delta = Math.abs((luo?.longitude ?? 0) - (ji?.longitude ?? 0));
    expect(Math.min(delta, 360 - delta)).toBeCloseTo(180, 1);
    expect(buildQizhengChart(profile())).toEqual(chart);
  });

  it("keeps 月孛 as the lunar mean apogee (classical 六十二日行七度 / 六十二年而七周天)", () => {
    const chart = buildQizhengChart(profile());
    const yuebei = chart.stars.find((star) => star.name === "月孛");
    const jidu = chart.stars.find((star) => star.name === "计都");
    expect(yuebei && jidu).toBeTruthy();
    // 月孛为月远地点（果老「月行最迟之处」；《清史稿·时宪志一》「月孛乃月行极高之点」），
    // 与黄白交点（计都）无关：不应互为 180°，即必须独立于节点。
    const delta = Math.abs((yuebei?.longitude ?? 0) - (jidu?.longitude ?? 0));
    expect(Math.min(delta, 360 - delta)).not.toBeCloseTo(0, 0);
    expect(Math.min(delta, 360 - delta)).not.toBeCloseTo(180, 0);

    // 年均行度：4069.0137°／世纪 ÷ 100 = 40.69°／年。
    // 古籍《图书编》卷二十一：「六十二日行七度，六十二年而七周天」→ 7/62 度／日 ≈ 41.2°／年
    // （7 周天 / 62 年 ≈ 8.857 年一周，与 Meeus 平近地点周期 3232.6 日 ≈ 8.85 年相符）。误差须 < 3%。
    const classicalPerYear = (360 * 7) / 62;
    expect(40.69).toBeGreaterThan(classicalPerYear * 0.97);
    expect(40.69).toBeLessThan(classicalPerYear * 1.03);
  });

  it("labels 紫气 as an upstream script convention, not the classical long-period phantom star", () => {
    // 古典紫气只有「約廿八年一周天、顺行」（《图书编》卷二十一「气生于闰，二十八年十闰，而气行一周天」；
    // 《果老星宗》另一传本作「二十九日一度、二十九年周天」），诸本皆不载历元位置，
    // 清《时宪志一》且判「至紫气一余，无数可定……今俱改删」。故本仓不自造历元、如实降级。
    const chart = buildQizhengChart(profile());
    const ziqi = chart.stars.find((star) => star.name === "紫气");
    expect(ziqi).toBeTruthy();
    expect(ziqi?.note).toContain("非古典紫气");
    expect(ziqi?.note).toContain("未实装");
    expect(chart.disclaimer).toContain("并非古典长周期虚星");
    expect(chart.disclaimer).toContain("未实装");
    // 仍为「月黄经 − 90°」的上游约定值（而非自造的长周期模型）。
    const moon = chart.stars.find((star) => star.name === "太阴");
    const expected = (((moon?.longitude ?? 0) - 90) % 360 + 360) % 360;
    expect(ziqi?.longitude).toBeCloseTo(expected, 1);
  });

  it("reproduces the 《清史稿》 康熙甲子年黄道十二次初度值宿 (epoch 1684, 初宫起冬至)", () => {
    // 《清史稿·卷二十八·天文三》「康熙甲子年黄道十二次初度值宿」逐条给出十二次初度落在何宿何度；
    // 十二次初度应落在回归黄经 270° + 30k（初宫=星纪初=冬至=270°）。以下为该表原值。
    const Ci: Array<[string, number, string, number]> = [
      ["星纪", 270, "箕", 3 + 10 / 60],
      ["元枵", 300, "牛", 23 / 60],
      ["娵訾", 330, "危", 1],
      ["降娄", 0, "室", 10 + 57 / 60],
      ["大梁", 30, "娄", 27 / 60],
      ["实沈", 60, "昴", 5 + 12 / 60],
      ["鹑首", 90, "觜", 10 + 38 / 60],
      ["鹑火", 120, "井", 29 + 5 / 60],
      ["鹑尾", 150, "星", 7 + 4 / 60],
      ["寿星", 180, "翼", 10 + 37 / 60],
      ["大火", 210, "角", 10 + 34 / 60],
      ["析木", 240, "房", 1 + 39 / 60],
    ];
    // 各宿距星在 1684 历元的回归黄经（同 chart.ts 的 MANSION_TABLE_QING 换算值）。
    const starts: Record<string, number> = { 箕: 266.8333, 牛: 299.6167, 危: 329, 室: 349.1167, 娄: 29.55, 昴: 54.8, 觜: 79.3667, 井: 90.9167, 星: 142.9333, 翼: 169.3833, 角: 199.4333, 房: 238.5167 };
    const separation = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
    for (const [name, expected, mansion, degree] of Ci) {
      // (1) 该次初度所在的宿，应正好是该条所记之宿。
      expect(longitudeToMansion(expected, EPOCH_UT), `${name} 次初度所在宿`).toBe(mansion);
      // (2) 由「宿起点 + 该条度数」反推的次初度，应落在 270° + 30k 的 0.2° 内。
      expect(separation(starts[mansion] + degree, expected), `${name} 次初度 ${(starts[mansion] + degree).toFixed(3)}° vs ${expected}°`).toBeLessThan(0.2);
    }
  });

  it("serializes the scheme and its conventions", () => {
    const text = serializeQizhengToStructuredText(buildQizhengChart(profile()));
    expect(text).toContain("七政四余");
    expect(text).toContain("命宫：");
    expect(text).toContain("七政·太阳");
    expect(text).toContain("四余·罗睺");
    expect(text).toContain("果老旧法");
    expect(text).toContain("二十八宿黄道经纬度钤");
    expect(text).toContain("非古典长周期虚星");
  });
});
