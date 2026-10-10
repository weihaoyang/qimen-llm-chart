import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildAstroChart } from "./chart";
import { serializeAstroToCompactJson, serializeAstroToStructuredText } from "./serializer";

describe("astro chart", () => {
  it("is deterministic and exposes the three core points", () => {
    const input = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const profile = normalizeProfileInput(input);
    const first = buildAstroChart(profile);
    expect(buildAstroChart(profile)).toEqual(first);
    expect(first.sun.sign).toBeTruthy();
    expect(first.complete).toBe(true);
    expect(first.points).toHaveLength(18); // 10 行星 + 5 小行星/凯龙 + 2 交点 + 莉莉丝
    expect(first.angles.midheaven.longitude).not.toBeNull();
    expect(first.houses).toHaveLength(12);
    expect(first.aspects).toEqual(expect.any(Array));
    expect(first.aspectSummary).toEqual(expect.any(Object));
    expect(first.patterns).toEqual(expect.any(Array));
    expect(first.sun.longitude).toBeGreaterThan(279);
    expect(first.sun.longitude).toBeLessThan(281);
    expect(first.moon.house).toBeGreaterThanOrEqual(1);
    expect(serializeAstroToStructuredText(first)).toContain("上升");
    expect(JSON.parse(serializeAstroToCompactJson(first)).format).toBe("qmdj-astro-chart-v1");
  });

  it("computes planets without a birth place but leaves the angles open", () => {
    const input = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    delete input.location;
    const profile = normalizeProfileInput(input);
    const chart = buildAstroChart(profile);

    // Planets and aspects are geocentric, so they still resolve.
    expect(chart.complete).toBe(false);
    expect(chart.points).toHaveLength(18);
    expect(chart.sun.longitude).toBeGreaterThan(279);
    expect(chart.sun.longitude).toBeLessThan(281);
    expect(chart.sun.house).toBeNull();
    expect(chart.aspects.length).toBeGreaterThan(0);

    // Place-dependent parts stay absent.
    expect(chart.ascendant.longitude).toBeNull();
    expect(chart.angles.midheaven.longitude).toBeNull();
    expect(chart.houses).toHaveLength(0);

    // Located and unlocated charts agree on the planets.
    const locatedInput = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    locatedInput.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const located = buildAstroChart(normalizeProfileInput(locatedInput));
    expect(chart.points.map((point) => point.longitude)).toEqual(located.points.map((point) => point.longitude));

    const text = serializeAstroToStructuredText(chart);
    expect(text).toContain("宫位未计算");
    expect(text).toContain("行星与相位按地心坐标计算");
  });
});
