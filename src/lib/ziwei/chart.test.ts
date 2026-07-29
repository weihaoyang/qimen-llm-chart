import { describe, expect, it } from "vitest";
import { buildZiweiChartFromProfile } from "./chart";

describe("buildZiweiChartFromProfile", () => {
  it("builds a 12-palace ziwei chart from normalized profile input", () => {
    const chart = buildZiweiChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "female",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    expect(chart.raw.palaces).toHaveLength(12);
  });
});
