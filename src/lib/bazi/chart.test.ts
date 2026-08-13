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

  const chartFor = (datetime: string, gender: "male" | "female" = "male") =>
    buildBaziChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime,
        timeZone: "Asia/Shanghai",
        gender,
        timeBasis: "civil",
      },
      normalized: {
        datetime,
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

  it("keeps the current lunar-typescript solar-term boundary stable", () => {
    expect(chartFor("2024-02-04T16:20").raw.baZi).toEqual(["癸卯", "乙丑", "戊戌", "庚申"]);
    expect(chartFor("2024-02-04T17:20").raw.baZi).toEqual(["甲辰", "丙寅", "戊戌", "辛酉"]);
  });

  it("keeps the current engine day and 子时 behavior stable", () => {
    expect(chartFor("2024-02-10T23:30").raw.baZi).toEqual(["甲辰", "丙寅", "甲辰", "丙子"]);
    expect(chartFor("2024-02-11T00:30").raw.baZi).toEqual(["甲辰", "丙寅", "乙巳", "丙子"]);
  });

  it("marks a birth time close to an hour-pillar boundary for replay", () => {
    const chart = chartFor("2024-02-10T22:50");
    expect(chart.raw.boundaryAudit.sensitive).toBe(true);
    expect(chart.raw.boundaryAudit.changedPillars).toContain("time");
    expect(chart.raw.boundaryAudit.before).not.toEqual(chart.raw.boundaryAudit.after);
  });

  it("keeps gender-dependent 大运 direction and historical input coverage stable", () => {
    const male = chartFor("1990-01-01T12:00", "male");
    const female = chartFor("1990-01-01T12:00", "female");
    const historical = chartFor("1900-01-31T12:00");
    expect(male.raw.yun.direction).toBe("backward");
    expect(female.raw.yun.direction).toBe("forward");
    expect(male.raw.yun.startSolar).toBe("1998-05-01 12:00:00");
    expect(female.raw.yun.startSolar).toBe("1991-06-21 12:00:00");
    expect(historical.raw.baZi).toEqual(["己亥", "丁丑", "甲辰", "庚午"]);
  });
});
