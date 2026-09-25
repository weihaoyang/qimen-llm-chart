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
    expect(first.points).toHaveLength(10);
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

  it("fails closed when coordinates are absent", () => {
    const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai"));
    expect(buildAstroChart(profile).complete).toBe(false);
    expect(buildAstroChart(profile).ascendant.longitude).toBeNull();
  });
});
