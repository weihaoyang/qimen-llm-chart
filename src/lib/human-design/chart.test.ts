import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildHumanDesignChart } from "./chart";

describe("human design chart", () => {
  it("returns a stable typed center map", () => {
    const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai"));
    const chart = buildHumanDesignChart(profile);
    expect(chart.centers).toHaveLength(9);
    expect(buildHumanDesignChart(profile)).toEqual(chart);
    expect(["生成者", "显示生产者", "投射者", "反映者", "显化者"]).toContain(chart.type);
  });
});
