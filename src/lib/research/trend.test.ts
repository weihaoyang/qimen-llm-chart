import { describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import type { NormalizedProfileInput } from "@/lib/profile";
import { buildLifeTrendDayun, buildLifeTrendData } from "./trend";

const profile = {
  original: { calendarMode: "solar", datetime: "1990-06-15T10:30", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" },
  normalized: { datetime: "1990-06-15T10:30", timeZone: "Asia/Shanghai", calendarMode: "solar", timeBasis: "civil" },
} as const;

describe("buildLifeTrendData", () => {
  it("reports luck pillar direction independently of calendar order", () => {
    const forward = buildLifeTrendData(profile);
    const backward = buildLifeTrendData({
      ...profile,
      original: { ...profile.original, gender: "female" },
    });
    // 庚午年壬午月，阳男顺、阳女逆（《三命通会》卷二〈论大运〉）。
    expect(forward.direction).toBe("forward");
    expect(forward.points[0].dayunGanZhi).toBe("癸未");
    expect(backward.direction).toBe("backward");
    expect(backward.points[0].dayunGanZhi).toBe("辛巳");
    expect(backward.points[10].dayunGanZhi).toBe("庚辰");
    expect(backward.points[10].year).toBeGreaterThan(backward.points[0].year);
  });

  it("returns transparent OHLC points and a disclaimer", () => {
    const result = buildLifeTrendData(profile);
    expect(result.points.length).toBeGreaterThan(20);
    expect(result.points[0]).toMatchObject({ open: expect.any(Number), high: expect.any(Number), low: expect.any(Number), close: expect.any(Number) });
    expect(result.disclaimer).toContain("不代表");
  });
});


const profileFor = (datetime: string, timeZone: string, yearBoundary: "li-chun" | "lunar-new-year", dayBoundary: "midnight" | "zi-start"): NormalizedProfileInput => ({
  original: { ...profile.original, datetime, timeZone, baziSettings: { yearBoundary, dayBoundary } },
  normalized: { ...profile.normalized, datetime, timeZone },
});

it("uses the same year-boundary direction and period years as the canonical natal chart", () => {
  for (const yearBoundary of ["li-chun", "lunar-new-year"] as const) {
    const input = profileFor("2024-02-08T12:00", "Asia/Shanghai", yearBoundary, "midnight");
    const natal = buildBaziChartFromProfile(input);
    const trend = buildLifeTrendData(input);
    expect(trend.direction).toBe(yearBoundary === "li-chun" ? "forward" : "backward");
    expect(trend.points[0].dayunGanZhi).toBe(yearBoundary === "li-chun" ? "丁卯" : "乙丑");
    expect(trend.direction).toBe(natal.raw.yun.direction);
    for (const [i, period] of natal.raw.yun.daYun.entries()) {
      expect(trend.points[i * 10]).toMatchObject({ dayunGanZhi: period.ganZhi, dayunStartYear: period.startYear, age: period.startAge });
    }
    const offset = natal.raw.yun.startOffset;
    expect(trend.startAgeDetail).toBe(`${offset.years}年${offset.months}月${offset.days}天${offset.hours}小时起运`);
  }
});

it("uses the selected late-Zi day master for period growth stages", () => {
  const at = (boundary: "midnight" | "zi-start") => buildLifeTrendDayun(profileFor("2026-07-03T23:30", "Asia/Shanghai", "li-chun", boundary));
  // 戊日土随阳火长生寅，未为衰；己日阴土长生酉逆行，未为冠带。
  expect(at("midnight").list[0]).toMatchObject({ ganZhi: "乙未", diShi: "衰" });
  expect(at("zi-start").list[0]).toMatchObject({ ganZhi: "乙未", diShi: "冠带" });
});

it("keeps the post-Li-Chun month and luck direction aligned for the same instant in UTC", () => {
  for (const [datetime, zone] of [["2024-02-04T08:30", "UTC"], ["2024-02-04T16:30", "Asia/Shanghai"]]) {
    const input = profileFor(datetime, zone, "li-chun", "midnight");
    const trend = buildLifeTrendData(input);
    const natal = buildBaziChartFromProfile(input);
    expect(trend.direction).toBe("forward");
    expect(trend.points[0].dayunGanZhi).toBe("丁卯");
    expect(trend.points[0].dayunGanZhi).toBe(natal.raw.yun.daYun[0].ganZhi);
  }
});
