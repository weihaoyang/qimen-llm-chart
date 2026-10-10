import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildQizhengChart, FOUR_REMAINDERS, longitudeToMansion, longitudeToPalace, mingPalaceIndex, SEVEN_LUMINARIES, TWELVE_PALACES } from "./chart";
import { serializeQizhengToStructuredText } from "./serializer";

const profile = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return normalizeProfileInput(input);
};

describe("qizheng siyu chart", () => {
  it("maps longitudes into palaces and mansions (equal-division convention)", () => {
    expect(longitudeToPalace(0)).toBe(2); // 0° 落寅宫（脚本口径）
    expect(longitudeToPalace(300)).toBe(0); // 300° 落子宫
    expect(longitudeToMansion(0)).toBe("角");
    expect(longitudeToMansion(90)).toBe("斗"); // 每宿 360/28 ≈ 12.857°，第 7 宿为斗
  });

  it("derives the 命宫 from the birth month and hour", () => {
    // 五月巳时：寅起正月顺数至五月（临 巳?），再逆数至生时
    expect(mingPalaceIndex(5, 8)).toBe(2); // 寅
    expect(TWELVE_PALACES[0]).toBe("命宫");
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
