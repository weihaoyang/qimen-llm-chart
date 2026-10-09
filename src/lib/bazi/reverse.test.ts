import { describe, expect, it } from "vitest";

import { buildBaziChartFromProfile } from "./chart";
import { deriveBirthDatesFromBazi } from "./reverse";
import type { BaziSettings } from "./settings";
import { normalizeProfileInput } from "@/lib/profile/normalize";
import type { ProfileInput } from "@/lib/profile";

const profile = (
  datetime: string,
  baziSettings?: BaziSettings,
): ProfileInput => ({
  calendarMode: "solar",
  datetime,
  timeZone: "Asia/Shanghai",
  gender: "male",
  timeBasis: "civil",
  baziSettings,
});

const chartFor = (datetime: string, baziSettings?: BaziSettings) =>
  buildBaziChartFromProfile(normalizeProfileInput(profile(datetime, baziSettings)));

const pillarsOf = (datetime: string, baziSettings?: BaziSettings) => {
  const [year, month, day, time] = chartFor(datetime, baziSettings).raw.baZi;
  return { year, month, day, time };
};

describe("deriveBirthDatesFromBazi", () => {
  it("round-trips the four pillars of a known birth date back to that date", () => {
    const source = "1990-05-20T14:30";
    const result = deriveBirthDatesFromBazi({
      pillars: pillarsOf(source),
      startYear: 1940,
      endYear: 2020,
    });

    const hit = result.candidates.find((candidate) => candidate.date === "1990-05-20");

    expect(result.truncated).toBe(false);
    expect(hit).toBeTruthy();
    expect(hit?.hourRanges).toEqual(["13:00-14:59"]);
    expect(hit?.datetime.startsWith("1990-05-20")).toBe(true);
  });

  it("returns only dates whose chart re-derives the requested pillars", () => {
    const source = "1988-11-07T06:45";
    const target = pillarsOf(source);
    const result = deriveBirthDatesFromBazi({
      pillars: target,
      startYear: 1900,
      endYear: 2100,
      maxResults: 50,
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.length).toBeLessThanOrEqual(50);

    result.candidates.forEach((candidate) => {
      expect(chartFor(candidate.datetime).raw.baZi).toEqual([
        target.year,
        target.month,
        target.day,
        target.time,
      ]);
      expect(candidate.ganzhi).toEqual([target.year, target.month, target.day, target.time]);
    });
  });

  it("keeps a whole-day answer when the time pillar is unknown", () => {
    const { year, month, day } = pillarsOf("1996-03-08T09:10");
    const result = deriveBirthDatesFromBazi({
      pillars: { year, month, day },
      startYear: 1990,
      endYear: 2000,
    });

    const hit = result.candidates.find((candidate) => candidate.date === "1996-03-08");

    expect(hit?.datetime).toBe("1996-03-08T12:00");
    expect(hit?.hourRanges).toEqual(["00:00-23:59"]);
    expect(result.notes.some((note) => note.includes("未给出时柱"))).toBe(true);
  });

  it("matches the 子初换日 convention and reports the 23 时 window", () => {
    const settings: BaziSettings = { yearBoundary: "li-chun", dayBoundary: "zi-start" };
    const source = "2024-02-10T23:30";
    const result = deriveBirthDatesFromBazi({
      pillars: pillarsOf(source, settings),
      startYear: 2020,
      endYear: 2026,
      settings,
    });

    const lateNight = result.candidates.find((candidate) => candidate.date === "2024-02-10");
    const earlyMorning = result.candidates.find((candidate) => candidate.date === "2024-02-11");

    expect(lateNight?.hourRanges).toEqual(["23:00-23:59"]);
    // 次日 0 时仍是子时，但日柱已换，因此只有 0 时这一个整点。
    expect(earlyMorning?.hourRanges).toEqual(["00:00-00:59"]);
    expect(result.notes.some((note) => note.includes("子初换日"))).toBe(true);
  });

  it("honours the 春节换年 convention", () => {
    const settings: BaziSettings = { yearBoundary: "lunar-new-year", dayBoundary: "midnight" };
    const source = "1990-01-30T12:00";
    const target = pillarsOf(source, settings);

    expect(target.year).toBe("庚午");

    const hit = deriveBirthDatesFromBazi({
      pillars: target,
      startYear: 1985,
      endYear: 1995,
      settings,
    }).candidates.find((candidate) => candidate.date === "1990-01-30");

    expect(hit?.ganzhi[0]).toBe("庚午");
    expect(hit?.ganzhi).toEqual([
      target.year,
      target.month,
      target.day,
      target.time,
    ]);
  });

  it("searches by month pillar alone and still lands on matching months", () => {
    const { month } = pillarsOf("1994-07-19T08:00");
    const result = deriveBirthDatesFromBazi({
      pillars: { month },
      startYear: 1990,
      endYear: 1996,
      maxResults: 400,
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    result.candidates.forEach((candidate) => {
      expect(candidate.ganzhi[1]).toBe(month);
      expect(chartFor(candidate.datetime).raw.baZi[1]).toBe(month);
    });
  });

  it("stops at the result cap instead of walking the whole range", () => {
    const { day } = pillarsOf("1975-04-02T08:00");
    const result = deriveBirthDatesFromBazi({
      pillars: { day },
      startYear: 1900,
      endYear: 2100,
      maxResults: 5,
    });

    expect(result.candidates).toHaveLength(5);
    expect(result.truncated).toBe(true);
    expect(result.notes.some((note) => note.includes("截断"))).toBe(true);
  });

  it("returns an explained empty result when nothing matches", () => {
    const result = deriveBirthDatesFromBazi({
      pillars: { year: "甲子" },
      startYear: 1991,
      endYear: 1994,
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.scannedDays).toBe(0);
    expect(result.notes.some((note) => note.includes("没有与所填干支一致"))).toBe(true);
  });

  it("rejects inputs that cannot narrow the search", () => {
    expect(() =>
      deriveBirthDatesFromBazi({ pillars: { time: "甲子" }, startYear: 1990, endYear: 2000 }),
    ).toThrow("请至少给出年柱、月柱或日柱之一");

    expect(() =>
      deriveBirthDatesFromBazi({ pillars: { year: "甲丑" }, startYear: 1990, endYear: 2000 }),
    ).toThrow("不是有效干支");

    expect(() =>
      deriveBirthDatesFromBazi({ pillars: { year: "庚午" }, startYear: 2000, endYear: 1990 }),
    ).toThrow("起始年不能晚于结束年");

    expect(() =>
      deriveBirthDatesFromBazi({ pillars: { year: "庚午" }, startYear: 1800, endYear: 1900 }),
    ).toThrow("须在 1900 至 2100 之间");
  });
});
