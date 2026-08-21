import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "./chart";
import { buildZiweiChartFromProfile } from "@/lib/ziwei/chart";

const casesPath = process.env.FATE_BENCH_CASES_PATH;
const conventions = [
  { yearBoundary: "li-chun", dayBoundary: "midnight" },
  { yearBoundary: "li-chun", dayBoundary: "zi-start" },
  { yearBoundary: "lunar-new-year", dayBoundary: "midnight" },
  { yearBoundary: "lunar-new-year", dayBoundary: "zi-start" },
] as const;

describe("Fate-Bench four-pillar audit (opt-in external corpus)", () => {
  it.skipIf(!casesPath)("reproduces every eligible public four-pillar chart with an explicit supported convention", async () => {
    const entries = JSON.parse(await readFile(casesPath!, "utf8"));
    const unresolved: Array<{ caseId: string; expected: string }> = [];
    let eligible = 0;
    let defaultMatched = 0;

    for (const entry of entries) {
      const birth = entry.birth_info;
      const resolvedTime = entry.resolved_time;
      const pillars = entry.charts?.bazi?.pillars;
      if (birth?.calendar_type !== "solar" || !resolvedTime || !pillars) continue;
      eligible += 1;
      const datetime = `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}T${String(resolvedTime.hour).padStart(2, "0")}:${String(resolvedTime.minute ?? 0).padStart(2, "0")}`;
      const expected = [pillars.year, pillars.month, pillars.day, pillars.hour].join("");
      const matched = conventions.filter((baziSettings) => {
        const chart = buildBaziChartFromProfile({
          original: { calendarMode: "solar", datetime, timeZone: "Asia/Shanghai", gender: birth.gender === "女" ? "female" : "male", timeBasis: "civil", baziSettings },
          normalized: { calendarMode: "solar", datetime, timeZone: "Asia/Shanghai", timeBasis: "civil" },
        });
        return chart.raw.baZi.join("") === expected;
      });
      if (matched.some((setting) => setting.yearBoundary === "li-chun" && setting.dayBoundary === "midnight")) defaultMatched += 1;
      if (!matched.length) unresolved.push({ caseId: entry.case_id, expected });
    }

    expect(eligible).toBeGreaterThan(0);
    expect(defaultMatched).toBe(eligible);
    expect(unresolved).toEqual([]);
  });

  it.skipIf(!casesPath)("matches Fate-Bench Ziwei structure except its documented upstream-source variance", async () => {
    const entries = JSON.parse(await readFile(casesPath!, "utf8"));
    const unexpected: string[] = [];
    const sourceVariances: string[] = [];
    let eligible = 0;

    for (const entry of entries) {
      const birth = entry.birth_info;
      const resolvedTime = entry.resolved_time;
      const expected = entry.charts?.ziwei;
      if (birth?.calendar_type !== "solar" || !resolvedTime || !expected) continue;
      eligible += 1;
      const datetime = `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}T${String(resolvedTime.hour).padStart(2, "0")}:${String(resolvedTime.minute ?? 0).padStart(2, "0")}`;
      const chart = buildZiweiChartFromProfile({
        original: { calendarMode: "solar", datetime, timeZone: "Asia/Shanghai", gender: birth.gender === "女" ? "female" : "male", timeBasis: "civil" },
        normalized: { calendarMode: "solar", datetime, timeZone: "Asia/Shanghai", timeBasis: "civil" },
      });
      const actualStructure = {
        soul: chart.raw.soul,
        body: chart.raw.body,
        fiveElementsClass: chart.raw.fiveElementsClass,
        palaces: chart.raw.palaces.map((palace) => ({ name: palace.name, branch: palace.earthlyBranch, majorStars: palace.majorStars.map((star) => star.name) })),
      };
      const expectedStructure = {
        soul: expected.soul,
        body: expected.body,
        fiveElementsClass: expected.five_elements_class,
        palaces: expected.palaces.map((palace: { name: string; branch: string; major_stars: Array<{ name: string }> }) => ({
          name: palace.name,
          branch: palace.branch,
          majorStars: palace.major_stars.map((star) => star.name),
        })),
      };
      if (JSON.stringify(actualStructure) === JSON.stringify(expectedStructure)) continue;
      if (entry.case_id === "mlb_case_31") sourceVariances.push(entry.case_id);
      else unexpected.push(entry.case_id);
    }

    expect(eligible).toBeGreaterThan(0);
    expect(sourceVariances).toEqual(["mlb_case_31"]);
    expect(unexpected).toEqual([]);
  });
});
