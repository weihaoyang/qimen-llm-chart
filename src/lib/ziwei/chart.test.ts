import { describe, expect, it } from "vitest";
import { astro } from "iztro";
import { Lunar } from "lunar-typescript";
import startTables from "../../../docs/research/sources/ziwei-quanshu-start-tables.json";
import type { NormalizedProfileInput } from "@/lib/profile";
import { normalizeProfileInput } from "@/lib/profile/normalize";
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
    expect(chart.raw.palaces.every((palace) => palace.branchIndex >= 0)).toBe(true);
    expect(chart.raw.palaces.every((palace) => palace.sanFangSiZheng.length === 4)).toBe(true);
    expect(new Set(chart.raw.palaces.map((palace) => palace.sanFangSiZheng.join("/"))).size).toBeGreaterThan(1);
    expect(chart.raw.palaces.some((palace) => palace.minorStars.some((star) => star.name === "禄存"))).toBe(true);
    expect(chart.raw.patterns).toEqual(expect.any(Array));
  });

  it("matches the classical Jia-year first-day Zi-hour example", () => {
    // 《紫微斗数全书》卷二〈安身命例〉给出正月初一子时的命身与紫微落宫。
    const { raw } = buildZiweiChartFromProfile(profileAt("midnight", "2024-02-10T00:00"));
    expect(raw.earthlyBranchOfSoulPalace).toBe("寅");
    expect(raw.earthlyBranchOfBodyPalace).toBe("寅");
    expect(raw.fiveElementsClass).toBe("火六局");
    expect(raw.palaces.find((palace) => palace.majorStars.some((star) => star.name === "紫微"))?.earthlyBranch).toBe("酉");
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

  it("uses the previous lunar month when true solar correction crosses midnight", () => {
    const profile = normalizeProfileInput({
      ...profileAt("midnight").original,
      calendarMode: "lunar",
      lunar: { year: 2024, month: 1, day: 1, hour: 0, minute: 15, isLeapMonth: false },
      timeBasis: "true-solar",
      location: { longitude: 105, latitude: 30 },
    });
    expect(profile.normalized.datetime).toMatch(/^2024-02-09T23:/);

    const chart = buildZiweiChartFromProfile(profile);
    // 《紫微斗数全书》安身命例：寅起正月；子时的命、身同落生月宫。
    expect(chart.raw.earthlyBranchOfSoulPalace).toBe("丑");
    expect(chart.raw.earthlyBranchOfBodyPalace).toBe("丑");
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


// Independent tables transcribed from 紫微斗数全书卷二, not imported from iztro.
it("matches classical auxiliary-star placement rules across ten year stems, twelve months and hours", () => {
  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const lu = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  const mod = (n: number) => (n % 12 + 12) % 12;
  const seenStems = new Set<string>();
  const ziweiPositions = new Set<number>();
  for (let year = 1990; year < 2000; year += 1) {
    for (let h = 0; h < 12; h += 1) {
      const month = h + 1;
      const day = h * 2 + 1;
      const solarDate = Lunar.fromYmd(year, month, day).getSolar().toYmd();
      const { raw } = buildZiweiChartFromProfile(profileAt("midnight", `${solarDate}T${String(h * 2).padStart(2, "0")}:00`));
      const yearStem = raw.rawDates.chineseDate.yearly[0];
      seenStems.add(yearStem);
      const yearBranch = branches.indexOf(raw.rawDates.chineseDate.yearly[1]);
      expect(yearBranch).toBeGreaterThanOrEqual(0);
      const luBranch = lu[stems.indexOf(yearStem)];
      expect(luBranch).not.toBeUndefined();
      const expected: Record<string, number> = {
        文昌: mod(10 - h), 文曲: mod(4 + h), 左辅: mod(4 + month - 1), 右弼: mod(10 - month + 1),
        禄存: luBranch, 擎羊: mod(luBranch + 1), 陀罗: mod(luBranch - 1),
        地劫: mod(11 + h), 地空: mod(11 - h),
        天马: [2, 11, 8, 5][yearBranch % 4],
        天刑: mod(9 + month - 1), 天姚: mod(1 + month - 1),
        天哭: mod(6 - yearBranch), 天虚: mod(6 + yearBranch),
        龙池: mod(4 + yearBranch), 凤阁: mod(10 - yearBranch),
        三台: mod(4 + month - 1 + day - 1), 八座: mod(10 - month + 1 - day + 1),
      };
      const ziwei = branches.indexOf(raw.palaces.find(p => p.majorStars.some(star => star.name === "紫微"))!.earthlyBranch);
      const tianfu = branches.indexOf(raw.palaces.find(p => p.majorStars.some(star => star.name === "天府"))!.earthlyBranch);
      ziweiPositions.add(ziwei);
      // 《全书》安天府图：寅申同宫，余宫斜作对，紫丑则府卯。
      expect(tianfu).toBe(mod(4 - ziwei));
      for (const [star, branch] of Object.entries(expected)) {
        const found = raw.palaces.filter(p => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some(s => s.name === star));
        expect(found.map(p => p.earthlyBranch), `${year}/${month} hour ${h} ${star}`).toEqual([branches[branch]]);
      }
    }
  }
  expect(seenStems.size).toBe(10);
  expect(ziweiPositions.size).toBe(12);
});

it("matches the two classical major-star sequences at all twelve birth hours", () => {
  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const mod = (n: number) => (n % 12 + 12) % 12;
  for (let h = 0; h < 12; h += 1) {
    const { raw } = buildZiweiChartFromProfile(profileAt("midnight", `1990-05-20T${String(h * 2).padStart(2, "0")}:00`));
    const position = (star: string) => {
      const found = raw.palaces.filter(p => p.majorStars.some(s => s.name === star));
      expect(found, star).toHaveLength(1);
      return branches.indexOf(found[0].earthlyBranch);
    };
    const ziwei = position("紫微");
    const tianfu = position("天府");
    for (const [star, offset] of Object.entries({ 天机: -1, 太阳: -3, 武曲: -4, 天同: -5, 廉贞: -8 })) {
      expect(position(star), `hour ${h} ${star}`).toBe(mod(ziwei + offset));
    }
    for (const [star, offset] of Object.entries({ 太阴: 1, 贪狼: 2, 巨门: 3, 天相: 4, 天梁: 5, 七杀: 6, 破军: 10 })) {
      expect(position(star), `hour ${h} ${star}`).toBe(mod(tianfu + offset));
    }
  }
});


it("records the selected Kui Yue variants separately from the Wikisource wording", () => {
  const cases = [
    // 丙丁猪鸡 vs 卷二电子本猪狗; 辛午寅 vs its 虎马 ordering.
    ["1996-07-01T00:00", "丙", "亥", "酉"],
    ["1997-07-01T00:00", "丁", "亥", "酉"],
    ["1991-07-01T00:00", "辛", "午", "寅"],
  ];
  for (const [datetime, yearStem, kui, yue] of cases) {
    const { raw } = buildZiweiChartFromProfile(profileAt("midnight", datetime));
    expect(raw.rawDates.chineseDate.yearly[0]).toBe(yearStem);
    for (const [name, expected] of [["天魁", kui], ["天钺", yue]]) {
      expect(raw.palaces.filter(p => p.minorStars.some(s => s.name === name)).map(p => p.earthlyBranch)).toEqual([expected]);
    }
    if (yearStem !== "辛") expect(yue).not.toBe("戌");
  }
});


it("matches all thirty Water Two start days and the other four classical opening pairs", () => {
  const water = "丑寅寅卯卯辰辰巳巳午午未未申申酉酉戌戌亥亥子子丑丑寅寅卯卯辰";
  const cases = [
    ["水二局", 6, water],
    ["木三局", 8, "辰丑"],
    ["金四局", 10, "亥辰"],
    ["土五局", 0, "午亥"],
    ["火六局", 2, "酉午"],
  ] as const;
  // 庚午年农历二月为大月，五个固定生时分别得到五局，排盘入口仍自行定局。
  for (const [fiveElementsClass, hourIndex, positions] of cases) {
    for (let index = 0; index < positions.length; index += 1) {
      const date = Lunar.fromYmd(1990, 2, index + 1).getSolar().toYmd();
      const { raw } = buildZiweiChartFromProfile(profileAt("midnight", `${date}T${String(hourIndex * 2).padStart(2, "0")}:00`));
      expect(raw.fiveElementsClass).toBe(fiveElementsClass);
      expect(raw.palaces.filter(p => p.majorStars.some(star => star.name === "紫微")).map(p => p.earthlyBranch), `${fiveElementsClass} day ${index + 1}`).toEqual([positions[index]]);
    }
  }
});


it("matches the readable wood, metal, earth and fire start-table cells while preserving source defects", () => {
  let checked = 0;
  for (const table of startTables.tables) {
    const byDay = new Map<number, string[]>();
    for (const [branch, days] of Object.entries(table.palaces)) {
      for (const day of days ?? []) {
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(30);
        byDay.set(day, [...(byDay.get(day) ?? []), branch]);
      }
    }
    expect(Array.from({ length: 30 }, (_, i) => i + 1).filter(day => !byDay.has(day))).toEqual(table.missing);
    expect(Object.fromEntries([...byDay].filter(([, branches]) => branches.length > 1))).toEqual(table.conflicts);
    for (const [day, branches] of byDay) {
      if (branches.length !== 1) continue; // A contradictory original cell is not a passing oracle.
      const date = Lunar.fromYmd(1990, 2, day).getSolar().toYmd();
      const { raw } = buildZiweiChartFromProfile(profileAt("midnight", `${date}T${String(table.hourIndex * 2).padStart(2, "0")}:00`));
      expect(raw.fiveElementsClass).toBe(table.name);
      expect(raw.palaces.filter(p => p.majorStars.some(star => star.name === "紫微")).map(p => p.earthlyBranch), `${table.name} day ${day}`).toEqual(branches);
      checked += 1;
    }
  }
  expect(checked).toBe(117);
});
