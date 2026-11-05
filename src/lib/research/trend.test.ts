import { describe, expect, it } from "vitest";
import { buildLifeTrendData } from "./trend";

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
