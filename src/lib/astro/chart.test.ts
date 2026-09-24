import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildAstroChart } from "./chart";
import { serializeAstroToCompactJson, serializeAstroToStructuredText } from "./serializer";

describe("astro chart", () => {
  it("is deterministic and exposes the three core points", () => {
    const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai"));
    const first = buildAstroChart(profile);
    expect(buildAstroChart(profile)).toEqual(first);
    expect(first.sun.sign).toBeTruthy();
    expect(first.moon.house).toBeGreaterThanOrEqual(1);
    expect(serializeAstroToStructuredText(first)).toContain("上升");
    expect(JSON.parse(serializeAstroToCompactJson(first)).format).toBe("qmdj-astro-chart-v1");
  });
});
