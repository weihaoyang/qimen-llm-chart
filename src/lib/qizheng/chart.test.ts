import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildQizhengChart, FOUR_REMAINDERS, hourToBranchIndex, longitudeToMansion, longitudeToPalace, mingPalaceIndex, SEVEN_LUMINARIES, TWELVE_PALACES } from "./chart";
import { serializeQizhengToStructuredText } from "./serializer";

const profile = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return normalizeProfileInput(input);
};

describe("qizheng siyu chart", () => {
  it("maps longitudes into palaces with the classical 十二次 (Aries = 戌) and uses equal-division mansions", () => {
    expect(longitudeToPalace(0)).toBe(10); // 0° 白羊 → 戌宫
    expect(longitudeToPalace(30)).toBe(9); // 30° 金牛 → 酉宫
    expect(longitudeToPalace(180)).toBe(4); // 180° 天秤 → 辰宫
    expect(longitudeToPalace(300)).toBe(0); // 300° 水瓶 → 子宫
    expect(longitudeToPalace(330)).toBe(11); // 330° 双鱼 → 亥宫
    expect(longitudeToMansion(0)).toBe("角");
    expect(longitudeToMansion(90)).toBe("斗"); // 等分近似：360/28 ≈ 12.857°，第 7 宿为斗
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
    expect(TWELVE_PALACES[0]).toBe("命宫");
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

  it("serializes the scheme and its conventions", () => {
    const text = serializeQizhengToStructuredText(buildQizhengChart(profile()));
    expect(text).toContain("七政四余");
    expect(text).toContain("命宫：");
    expect(text).toContain("七政·太阳");
    expect(text).toContain("四余·罗睺");
    expect(text).toContain("果老旧法");
  });
});
