import { describe, expect, it } from "vitest";
import { buildVerificationData } from "./verification";

const profile = {
  original: { calendarMode: "solar", datetime: "2026-08-07T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" },
  normalized: { datetime: "2026-08-07T12:00", timeZone: "Asia/Shanghai", calendarMode: "solar", timeBasis: "civil" },
} as const;

describe("buildVerificationData", () => {
  it("reports unavailable systems without inventing a match", () => {
    const result = buildVerificationData({ profile, qimen: null, bazi: null, ziwei: null });
    expect(result.rows.some((row) => row.status === "unavailable")).toBe(true);
    expect(result.disclaimer).toContain("不把某一算法");
  });
});
