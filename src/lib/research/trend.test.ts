import { describe, expect, it } from "vitest";
import { buildLifeTrendData } from "./trend";

const profile = {
  original: { calendarMode: "solar", datetime: "1990-06-15T10:30", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" },
  normalized: { datetime: "1990-06-15T10:30", timeZone: "Asia/Shanghai", calendarMode: "solar", timeBasis: "civil" },
} as const;

describe("buildLifeTrendData", () => {
  it("returns transparent OHLC points and a disclaimer", () => {
    const result = buildLifeTrendData(profile);
    expect(result.points.length).toBeGreaterThan(20);
    expect(result.points[0]).toMatchObject({ open: expect.any(Number), high: expect.any(Number), low: expect.any(Number), close: expect.any(Number) });
    expect(result.disclaimer).toContain("不代表");
  });
});
