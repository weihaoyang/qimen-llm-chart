import { describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "./chart";

describe("buildBaziChartFromProfile", () => {
  it("builds a bazi chart from normalized profile input", () => {
    const chart = buildBaziChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "male",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    expect(chart.raw.baZi).toHaveLength(4);
    expect(chart.raw.solar).toContain("2026");
  });
});
