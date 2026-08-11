import { describe, expect, it } from "vitest";
import { buildDaliurenResearch, buildTaiyiResearch } from "./extensions";

const profile = {
  original: { calendarMode: "solar", datetime: "2026-08-07T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" },
  normalized: { datetime: "2026-08-07T12:00", timeZone: "Asia/Shanghai", calendarMode: "solar", timeBasis: "civil" },
} as const;

describe("research extensions", () => {
  it("builds Daliuren four lessons and three transmissions", () => {
    const result = buildDaliurenResearch(profile);
    expect(result.text).toContain("三传");
    expect(result.json).toBeTruthy();
  });
  it("builds Taiyi day-scale output", () => {
    const result = buildTaiyiResearch(profile);
    expect(result.text).toContain("日盘");
    expect(result.json).toBeTruthy();
  });
});
