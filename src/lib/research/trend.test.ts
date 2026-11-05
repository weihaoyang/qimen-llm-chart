import { describe, expect, it } from "vitest";
import { buildBaziCalculationContext, buildBaziChartFromProfile } from "@/lib/bazi/chart";
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

it("does not copy natal-day patterns to every luck period and annual branch", () => {
  for (const [date, day] of [["1990-01-15", "庚辰"], ["1990-01-11", "丙子"], ["1990-02-08", "甲辰"]]) {
    const input = profileFor(`${date}T12:00`, "Asia/Shanghai", "li-chun", "midnight");
    expect(buildBaziCalculationContext(input).eightChar.getDay()).toBe(day);
    const periods = buildLifeTrendDayun(input).list;
    expect(periods.length).toBeGreaterThan(0);
    for (const names of periods.flatMap(period => [period.shenSha, ...period.liunianList.map(year => year.shenSha)])) {
      expect(names.some(name => ["魁罡", "阴差阳错", "十恶大败"].includes(name))).toBe(false);
    }
  }
});

it("retains target-branch horse matches after separating natal-day patterns", () => {
  // 己巳年庚辰日：巳酉丑马在亥，申子辰马在寅，按年/日两支分别取马。
  const periods = buildLifeTrendDayun(profileFor("1990-01-15T12:00", "Asia/Shanghai", "li-chun", "midnight")).list;
  const years = periods.flatMap(period => period.liunianList);
  expect(new Set(years.map(year => year.zhi)).size).toBe(12);
  for (const year of years) expect(year.shenSha.includes("驿马")).toBe(["寅", "亥"].includes(year.zhi));
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


it("does not mistake every repeated natal year branch for self-punishment", () => {
  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  for (const [index, branch] of branches.entries()) {
    const periods = buildLifeTrendDayun(profileFor(`${1984 + index}-07-01T12:00`, "Asia/Shanghai", "li-chun", "midnight"));
    const repeated = periods.list.flatMap(period => period.liunianList).filter(year => year.zhi === branch);
    expect(repeated.length).toBeGreaterThan(0);
    for (const year of repeated) {
      expect(year.taiSui).toContain("值太岁");
      expect(year.taiSui.includes("刑太岁"), `${branch}${branch} ${year.year}`).toBe(["辰", "午", "酉", "亥"].includes(branch));
    }
  }
});

it("retains the two distinct branches of the Zi Mao punishment", () => {
  for (const [birthYear, other] of [[1984, "卯"], [1987, "子"]] as const) {
    const periods = buildLifeTrendDayun(profileFor(`${birthYear}-07-01T12:00`, "Asia/Shanghai", "li-chun", "midnight"));
    const years = periods.list.flatMap(period => period.liunianList).filter(year => year.zhi === other);
    expect(years.length).toBeGreaterThan(0);
    expect(years.every(year => year.taiSui.includes("刑太岁"))).toBe(true);
  }
});

it("uses the natal chart's five-Yang-stem blade convention throughout luck periods", () => {
  // 三命通会〈论羊刃〉所载子平法；阴干禄前一辰属同篇另一种口径。
  const yangBlades: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };
  const seen = new Set<string>();
  for (let date = 15; date <= 24; date++) {
    const input = profileFor(`1990-01-${date}T12:00`, "Asia/Shanghai", "li-chun", "midnight");
    const stem = buildBaziCalculationContext(input).eightChar.getDayGan();
    seen.add(stem);
    const periods = buildLifeTrendDayun(input).list;
    const years = periods.flatMap(period => period.liunianList);
    expect(new Set(years.map(year => year.zhi)).size).toBe(12);
    for (const year of years) {
      expect(year.shenSha.includes("羊刃"), `${stem}日 ${year.ganZhi}流年`).toBe(year.zhi === yangBlades[stem]);
    }
    for (const period of periods) {
      expect(period.shenSha.includes("羊刃"), `${stem}日 ${period.ganZhi}大运`).toBe(period.branch === yangBlades[stem]);
    }
    for (const pillar of buildBaziChartFromProfile(input).raw.pillars) {
      expect(pillar.shenSha.includes("羊刃")).toBe(pillar.earthlyBranch === yangBlades[stem]);
    }
  }
  expect(seen.size).toBe(10);
});

it("derives luck learning stars from the natal-year Na Yin element across all five elements", () => {
  // 三命通会〈论学堂词馆〉：长生为学堂、临官为词馆；水土同宫。
  const cases = [
    [1984, "金", "巳", "申"], [1986, "火", "寅", "巳"], [1988, "木", "亥", "寅"],
    [1990, "土", "申", "亥"], [1982, "水", "申", "亥"],
  ] as const;
  for (const [year, element, school, academy] of cases) {
    const input = profileFor(`${year}-07-15T12:00`, "Asia/Shanghai", "li-chun", "midnight");
    expect(buildBaziCalculationContext(input).eightChar.getYearNaYin().endsWith(element)).toBe(true);
    const periods = buildLifeTrendDayun(input).list;
    const years = periods.flatMap(period => period.liunianList);
    expect(new Set(years.map(entry => entry.zhi)).size).toBe(12);
    for (const [branch, names] of [
      ...periods.map(entry => [entry.branch, entry.shenSha] as const),
      ...years.map(entry => [entry.zhi, entry.shenSha] as const),
    ]) {
      expect(names.includes("学堂"), `${element}命见${branch}`).toBe(branch === school);
      expect(names.includes("词馆"), `${element}命见${branch}`).toBe(branch === academy);
    }
  }
});

it("uses the selected natal-year boundary for Na Yin learning stars", () => {
  for (const yearBoundary of ["li-chun", "lunar-new-year"] as const) {
    // 2024-02-08：立春口径甲辰覆灯火，春节口径癸卯金箔金。
    const input = profileFor("2024-02-08T12:00", "Asia/Shanghai", yearBoundary, "midnight");
    const years = buildLifeTrendDayun(input).list.flatMap(period => period.liunianList);
    const [school, academy] = yearBoundary === "li-chun" ? ["寅", "巳"] : ["巳", "申"];
    for (const entry of years) {
      expect(entry.shenSha.includes("学堂")).toBe(entry.zhi === school);
      expect(entry.shenSha.includes("词馆")).toBe(entry.zhi === academy);
    }
  }
});

it("uses the sourced annual-stem Fu Xing verse, including its two-branch entries", () => {
  const targets: Record<string, readonly string[]> = {
    甲: ["寅", "子"], 乙: ["丑"], 丙: ["寅", "子"], 丁: ["亥"], 戊: ["申"],
    己: ["未"], 庚: ["午"], 辛: ["巳"], 壬: ["辰"], 癸: ["丑"],
  };
  const seen = new Set<string>();
  for (let birthYear = 1984; birthYear < 1994; birthYear++) {
    const input = profileFor(`${birthYear}-07-15T12:00`, "Asia/Shanghai", "li-chun", "midnight");
    const stem = buildBaziCalculationContext(input).eightChar.getYearGan();
    seen.add(stem);
    const periods = buildLifeTrendDayun(input).list;
    const years = periods.flatMap(period => period.liunianList);
    expect(new Set(years.map(year => year.zhi)).size).toBe(12);
    for (const [branch, names] of [
      ...periods.map(period => [period.branch, period.shenSha] as const),
      ...years.map(year => [year.zhi, year.shenSha] as const),
    ]) {
      expect(names.includes("福星贵人（年）"), `${stem}年见${branch}`).toBe(targets[stem].includes(branch));
      expect(names).not.toContain("福星贵人");
    }
  }
  expect(seen.size).toBe(10);
});

it("keeps Fu Xing tied to the selected year boundary rather than the day stem", () => {
  for (const yearBoundary of ["li-chun", "lunar-new-year"] as const) {
    const input = profileFor("2024-02-08T12:00", "Asia/Shanghai", yearBoundary, "midnight");
    const years = buildLifeTrendDayun(input).list.flatMap(period => period.liunianList);
    const expected = yearBoundary === "li-chun" ? ["寅", "子"] : ["丑"];
    for (const year of years) expect(year.shenSha.includes("福星贵人（年）")).toBe(expected.includes(year.zhi));
  }
});

it("retains the annual Fu Xing attribution in visible trend signals", () => {
  const input = profileFor("1984-07-15T12:00", "Asia/Shanghai", "li-chun", "midnight");
  const points = buildLifeTrendData(input).points;
  const signals = points.flatMap(point => point.signals);
  expect(signals.some(signal => signal.text === "流年神煞：福星贵人（年）" && signal.kind === "support")).toBe(true);
});
