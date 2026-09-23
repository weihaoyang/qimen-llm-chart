import { describe, expect, it } from "vitest";
import { astro } from "iztro";
import type { NormalizedProfileInput } from "@/lib/profile";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import type { BaziDayBoundary } from "@/lib/bazi/settings";
import { buildZiweiChartFromProfile } from "./chart";

const profileAt = (dayBoundary: BaziDayBoundary, datetime = "2026-07-03T23:30"): NormalizedProfileInput => ({
  original: {
    calendarMode: "solar",
    datetime,
    timeZone: "Asia/Shanghai",
    gender: "female",
    timeBasis: "civil",
    baziSettings: { yearBoundary: "li-chun", dayBoundary },
  },
  normalized: {
    datetime,
    timeZone: "Asia/Shanghai",
    calendarMode: "solar",
    timeBasis: "civil",
  },
});

const majorStarsByPalace = (chart: ReturnType<typeof buildZiweiChartFromProfile>) =>
  chart.raw.palaces.map((palace) => palace.majorStars.map((star) => star.name).join(","));

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
    expect(chart.raw.chineseDate).toBe("丙午 甲午 戊寅 戊午");
  });

  it("agrees with the bazi engine on which day a 23:30 birth belongs to", () => {
    // iztro defaults to 晚子时算次日 while the product defaults to 子正换日. If the
    // ziwei builder ignored the setting, the two panels would place the birth on
    // different days — and therefore at different 紫微 positions — for every birth
    // between 23:00 and 23:59.
    for (const dayBoundary of ["midnight", "zi-start"] as const) {
      const profile = profileAt(dayBoundary);
      const ziwei = buildZiweiChartFromProfile(profile);
      const baziDayPillar = buildBaziChartFromProfile(profile).raw.baZi[2];

      // iztro reports the pillar as [heavenlyStem, earthlyBranch].
      expect(ziwei.raw.rawDates.chineseDate.daily.join("")).toBe(baziDayPillar);
    }
  });

  it("actually moves the chart across the 子时 boundary", () => {
    const midnight = buildZiweiChartFromProfile(profileAt("midnight"));
    const ziStart = buildZiweiChartFromProfile(profileAt("zi-start"));

    // Same birth instant, two conventions: the day differs, so the 紫微 position
    // must differ. Without the fix both branches would return the same chart.
    expect(midnight.raw.rawDates.chineseDate.daily).not.toBe(ziStart.raw.rawDates.chineseDate.daily);
    expect(majorStarsByPalace(midnight)).not.toEqual(majorStarsByPalace(ziStart));
  });

  it("leaves iztro's process-wide convention exactly as it found it", () => {
    // iztro stores the convention in module state; leaking a request's value
    // would silently change every later chart built in the same process.
    const before = astro.getConfig().dayDivide;
    buildZiweiChartFromProfile(profileAt("midnight"));
    buildZiweiChartFromProfile(profileAt("zi-start"));

    expect(astro.getConfig().dayDivide).toBe(before);
  });
});
