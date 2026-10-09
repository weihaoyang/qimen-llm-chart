import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildHarmonicChart, clampHarmonic, harmonicLongitude, HARMONIC_ORB } from "./chart";
import { serializeHarmonicToStructuredText } from "./serializer";

const profile = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return normalizeProfileInput(input);
};

describe("harmonic chart", () => {
  it("implements h = (longitude × n) mod 360", () => {
    expect(harmonicLongitude(10, 1)).toBeCloseTo(10);
    expect(harmonicLongitude(10, 5)).toBeCloseTo(50);
    // Two points 72° apart collapse onto one harmonic longitude at H5.
    expect(harmonicLongitude(82, 5)).toBeCloseTo(50);
    expect(harmonicLongitude(350, 3)).toBeCloseTo(330);
    expect(clampHarmonic(0)).toBe(1);
    expect(clampHarmonic(99)).toBe(36);
    expect(clampHarmonic(Number.NaN)).toBe(1);
  });

  it("keeps H1 equal to the natal longitudes", () => {
    const base = buildHarmonicChart(profile(), 1);
    for (const point of base.points) {
      expect(point.longitude).toBeCloseTo(point.natalLongitude, 6);
    }
  });

  it("converts harmonic conjunctions back to the natal angle", () => {
    const chart = buildHarmonicChart(profile(), 5);
    expect(chart.harmonic).toBe(5);
    expect(chart.orb).toBe(HARMONIC_ORB);
    expect(chart.points.length).toBeGreaterThan(0);
    for (const item of chart.conjunctions) {
      expect(item.harmonicOrb).toBeLessThanOrEqual(HARMONIC_ORB);
      expect(item.natalAngle).toBeCloseTo(72, 3);
      expect(item.natalOrb).toBeCloseTo(item.harmonicOrb / 5, 2);
    }
  });

  it("is deterministic and serializes the method", () => {
    const chart = buildHarmonicChart(profile(), 7);
    expect(buildHarmonicChart(profile(), 7)).toEqual(chart);
    const text = serializeHarmonicToStructuredText(chart);
    expect(text).toContain("第 7 谐波");
    expect(text).toContain("h = (黄经 × 7) mod 360");
    expect(text).toContain("边界：");
  });
});
