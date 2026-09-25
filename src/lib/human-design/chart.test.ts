import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildHumanDesignChart } from "./chart";

describe("human design chart", () => {
  it("returns a stable typed center map", () => {
    const input = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const profile = normalizeProfileInput(input);
    const chart = buildHumanDesignChart(profile);
    expect(chart.centers).toHaveLength(0);
    expect(Object.keys(chart.activations)).toHaveLength(13);
    expect(chart.activations.sun.personality.gate).toBeGreaterThanOrEqual(1);
    expect(chart.activations.sun.design.line).toBeGreaterThanOrEqual(1);
    expect(chart.precision?.gate).toBe("reliable");
    expect(buildHumanDesignChart(profile)).toEqual(chart);
    expect(chart.type).toBeNull();
  });

  it("does not infer a chart without coordinates", () => {
    const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai"));
    const chart = buildHumanDesignChart(profile);
    expect(chart.complete).toBe(false);
    expect(chart.type).toBeNull();
    expect(Object.keys(chart.activations)).toHaveLength(0);
  });
});
