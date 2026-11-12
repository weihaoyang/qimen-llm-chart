import { buildShenSha, getGroupStarBranch, getWenChangBranch, getLuShenBranch } from "./shen-sha";
import { describe, expect, it, vi } from "vitest";
import { Solar } from "lunar-typescript";
import { normalizeProfileInput } from "@/lib/profile/normalize";
import { buildBaziChartFromProfile } from "./chart";
import { computeStrengthBreakdown, DEFAULT_STRENGTH_FACTORS } from "./structure-audit";
import { analyzePillarRelations } from "./relations-analysis";

describe("classical hidden stems and ten gods", () => {
  it("checks all twelve hidden-stem sets and all ten day masters through the product chart", () => {
    // 《渊海子平·又地支藏遁歌》记的是藏干集合，歌诀顺序不代表本气顺序。
    const hidden: Record<string, string> = {
      子: "癸", 丑: "癸辛己", 寅: "甲丙戊", 卯: "乙", 辰: "乙戊癸", 巳: "庚丙戊",
      午: "丁己", 未: "乙己丁", 申: "庚壬戊", 酉: "辛", 戌: "辛丁戊", 亥: "壬甲",
    };
    const stems = "甲乙丙丁戊己庚辛壬癸";
    const elements = "木火土金水";
    const god = (self: string, other: string) => {
      const i = stems.indexOf(self), j = stems.indexOf(other);
      const selfElement = Math.floor(i / 2), otherElement = Math.floor(j / 2);
      const samePolarity = i % 2 === j % 2;
      const distance = (otherElement - selfElement + elements.length) % elements.length;
      return [
        samePolarity ? "比肩" : "劫财", samePolarity ? "食神" : "伤官",
        samePolarity ? "偏财" : "正财", samePolarity ? "七杀" : "正官",
        samePolarity ? "偏印" : "正印",
      ][distance];
    };
    const seen = new Set<string>();
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const date = new Date(Date.UTC(2024, 8, 27 + dayOffset)).toISOString().slice(0, 10);
      for (let hour = 0; hour < 24; hour += 2) {
        const datetime = `${date}T${String(hour).padStart(2, "0")}:00`;
        const raw = buildBaziChartFromProfile(normalizeProfileInput({
          calendarMode: "solar", datetime, timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
        })).raw;
        for (const pillar of raw.pillars) {
          expect([...pillar.hiddenStems].sort(), `${datetime}/${pillar.key}`).toEqual([...hidden[pillar.earthlyBranch]].sort());
          expect(pillar.shiShenZhi, `${datetime}/${pillar.key}`).toEqual(pillar.hiddenStems.map(stem => god(raw.dayMaster, stem)));
          if (pillar.key !== "day") expect(pillar.shiShenGan).toBe(god(raw.dayMaster, pillar.heavenlyStem));
          seen.add(`${raw.dayMaster}${pillar.earthlyBranch}`);
        }
      }
    }
    expect(seen.size).toBe(120);
  });

  it("changes the year-branch hidden stems along with the chosen lunar new year boundary", () => {
    const yearPillar = (yearBoundary: "li-chun" | "lunar-new-year") => buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime: "2024-02-05T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
      baziSettings: { yearBoundary, dayBoundary: "midnight" },
    })).raw.pillars.find(pillar => pillar.key === "year")!;
    expect(yearPillar("li-chun")).toMatchObject({ pillar: "甲辰", hiddenStems: ["戊", "乙", "癸"] });
    expect(yearPillar("lunar-new-year")).toMatchObject({ pillar: "癸卯", hiddenStems: ["乙"] });
  });
});

it("recognizes a complete 申子辰 in an actual four-pillar sandbox", () => {
  const raw = buildBaziChartFromProfile(normalizeProfileInput({
    calendarMode: "solar", datetime: "2024-09-29T00:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
  })).raw;
  expect(raw.baZi).toEqual(["甲辰", "癸酉", "丙申", "戊子"]);
  const sandbox = computeStrengthBreakdown(raw.pillars, raw.dayMaster, { ...DEFAULT_STRENGTH_FACTORS, combinations: true });
  expect(sandbox.combinationDetails).toContain("地支三合 申子辰 → 水权重试算");
  expect(computeStrengthBreakdown(raw.pillars, raw.dayMaster).combinationDetails).toEqual([]);
});

it("does not mistake repeated 辰 and 子 for a full 申子辰 in a real chart", () => {
  const raw = buildBaziChartFromProfile(normalizeProfileInput({
    calendarMode: "solar", datetime: "2024-10-07T00:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
  })).raw;
  expect(raw.baZi).toEqual(["甲辰", "癸酉", "甲辰", "甲子"]);
  const relations = analyzePillarRelations(raw.pillars, { dayMaster: raw.dayMaster }).relations;
  expect(relations.some(item => item.kind === "地支三合" || item.kind === "地支三会")).toBe(false);
});

it("retains both actual pillar combinations when a complete trine has a repeated branch", () => {
  const raw = buildBaziChartFromProfile(normalizeProfileInput({
    calendarMode: "solar", datetime: "2016-08-10T08:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
  })).raw;
  expect(raw.baZi).toEqual(["丙申", "丙申", "甲子", "戊辰"]);
  const trines = analyzePillarRelations(raw.pillars, { dayMaster: raw.dayMaster }).relations.filter(item => item.kind === "地支三合");
  expect(trines.map(item => item.pillars)).toEqual([["year", "day", "time"], ["month", "day", "time"]]);
});

it("preserves both 六合 and the explicitly sourced 六破 reading for 寅亥 in a real chart", () => {
  const raw = buildBaziChartFromProfile(normalizeProfileInput({
    calendarMode: "solar", datetime: "2022-07-01T21:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
  })).raw;
  expect(raw.baZi).toEqual(["壬寅", "丙午", "乙卯", "丁亥"]);
  const relations = analyzePillarRelations(raw.pillars, { dayMaster: raw.dayMaster }).relations;
  const yearTime = relations.filter(item => item.pillars.join(",") === "year,time" && item.symbols === "寅亥");
  expect(yearTime.some(item => item.kind === "地支六合")).toBe(true);
  expect(yearTime.find(item => item.kind === "地支六破")?.detail).toContain("《三命通会》破煞条对四生支不取");
});

describe("classical day-pillar Xun Kong", () => {
  it("matches all sixty pillars against the six ten-day void pairs", () => {
    const stems = Array.from("甲乙丙丁戊己庚辛壬癸");
    const branches = Array.from("子丑寅卯辰巳午未申酉戌亥");
    const xunHeads = ["甲子", "甲戌", "甲申", "甲午", "甲辰", "甲寅"];
    const voidPairs = ["戌亥", "申酉", "午未", "辰巳", "寅卯", "子丑"];
    // Fixed civil-date anchor; test旬 lookup separately from any prediction or year-void method.
    for (let index = 0; index < 60; index++) {
      const date = new Date(Date.UTC(1990, 1, 28 + index)).toISOString().slice(0, 10);
      const raw = buildBaziChartFromProfile(normalizeProfileInput({
        calendarMode: "solar", datetime: `${date}T12:00`, timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
      })).raw;
      const day = raw.pillars.find(pillar => pillar.key === "day");
      expect(day?.pillar).toBe(stems[index % 10] + branches[index % 12]);
      expect(day?.xun).toBe(xunHeads[Math.floor(index / 10)]);
      expect(day?.xunKong).toBe(voidPairs[Math.floor(index / 10)]);
      // Within each ten-day run the two void branches never occur as the day's own branch.
      expect(day?.xunKong.includes(day.earthlyBranch)).toBe(false);
    }
  });

  it("changes the day void pair at a Xun boundary using the selected late-Zi convention", () => {
    for (const dayBoundary of ["midnight", "zi-start"] as const) {
      const raw = buildBaziChartFromProfile(normalizeProfileInput({
        calendarMode: "solar", datetime: "1990-03-09T23:30", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
        baziSettings: { dayBoundary, yearBoundary: "li-chun" },
      })).raw;
      expect(raw.pillars.find(pillar => pillar.key === "day")).toMatchObject(dayBoundary === "midnight"
        ? { pillar: "癸酉", xun: "甲子", xunKong: "戌亥" }
        : { pillar: "甲戌", xun: "甲戌", xunKong: "申酉" });
    }
  });
});

describe("buildBaziChartFromProfile", () => {
  it("keeps solar term pillars and luck offsets aligned for the same instant", () => {
    const calculate = (datetime: string, timeZone: string) => buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime, timeZone, gender: "male", timeBasis: "civil",
    })).raw;
    const shanghai = calculate("2024-02-04T16:28", "Asia/Shanghai");
    const newYork = calculate("2024-02-04T03:28", "America/New_York");
    expect(shanghai.baZi.slice(0, 2)).toEqual(["甲辰", "丙寅"]);
    expect(newYork.baZi.slice(0, 2)).toEqual(shanghai.baZi.slice(0, 2));
    expect(newYork.baZi[3]).toBe("甲寅");
    expect(newYork.taiYuan).toEqual(shanghai.taiYuan);
    expect(newYork.yun.direction).toBe(shanghai.yun.direction);
    expect(newYork.yun.startOffset).toEqual(shanghai.yun.startOffset);
    expect(newYork.boundaryAudit.before.slice(0, 2)).toEqual(["癸卯", "乙丑"]);
  });
  it("keeps an early civil year in the boundary audit", () => {
    const chart = buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar",
      datetime: "0099-07-07T12:00",
      timeZone: "UTC",
      gender: "male",
      timeBasis: "civil",
    }));
    expect(chart.raw.boundaryAudit).toMatchObject({ sensitive: false, before: chart.raw.baZi, after: chart.raw.baZi });
  });

  it("preserves the day boundary when a historical audit window crosses midnight", () => {
    const input = {
      calendarMode: "solar", timeZone: "UTC", gender: "male", timeBasis: "civil",
    } as const;
    const calculate = (datetime: string) => buildBaziChartFromProfile(normalizeProfileInput({ ...input, datetime }));
    const chart = calculate("0099-07-07T00:15");
    expect(chart.raw.boundaryAudit.before).toEqual(calculate("0099-07-06T23:45").raw.baZi);
    expect(chart.raw.boundaryAudit.after).toEqual(calculate("0099-07-07T00:45").raw.baZi);
  });
  it("builds a bazi chart from normalized profile input", () => {
    const chart = buildBaziChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "male",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    expect(chart.raw.baZi).toHaveLength(4);
    expect(chart.raw.solar).toContain("2026");
  });

  const chartFor = (
    datetime: string,
    gender: "male" | "female" = "male",
    baziSettings?: { yearBoundary: "li-chun" | "lunar-new-year"; dayBoundary: "midnight" | "zi-start" },
  ) =>
    buildBaziChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime,
        timeZone: "Asia/Shanghai",
        gender,
        timeBasis: "civil",
        baziSettings,
      },
      normalized: {
        datetime,
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

  it("uses the same corrected time for lunar and solar input", () => {
    const solar = chartFor("2024-02-10T00:15").input.original;
    const time = { timeBasis: "true-solar" as const, location: { longitude: 105, latitude: 30 } };
    const lunar = normalizeProfileInput({
      ...solar,
      ...time,
      calendarMode: "lunar",
      lunar: { year: 2024, month: 1, day: 1, hour: 0, minute: 15, isLeapMonth: false },
    });
    const lunarChart = buildBaziChartFromProfile(lunar);
    expect(lunarChart.raw.solar).toMatch(/^2024-02-09 23:/);
    expect(lunarChart.raw).toEqual(buildBaziChartFromProfile(normalizeProfileInput({ ...solar, ...time })).raw);
  });

  it("derives year summaries from the selected lunar New Year pillar", () => {
    const { raw } = chartFor("2024-02-05T12:00", "male", {
      yearBoundary: "lunar-new-year",
      dayBoundary: "midnight",
    });
    expect(raw.baZi[0]).toBe("癸卯");
    expect(raw.naYin[0]).toBe("金箔金");
    expect(raw.wuXing[0]).toBe("水木");
    expect(raw.shiShenGan[0]).toBe(raw.pillars[0].shiShenGan);
    expect(raw.shiShenZhi[0]).toBe(raw.pillars[0].shiShenZhi[0]);
    expect(raw.yun.direction).toBe("backward");
    expect(raw.yun.daYun[0]?.ganZhi).toBe("乙丑");
    expect(chartFor("2024-02-05T12:00", "male").raw.yun.direction).toBe("forward");
  });

  it("follows the classical Jia-Zi third-month Xu-hour palace example", () => {
    const { raw } = chartFor("1984-04-15T20:00");
    expect(raw.baZi[0]).toBe("甲子");
    expect(raw.baZi[1]).toBe("戊辰");
    expect(raw.mingGong).toEqual({ pillar: "丁卯", naYin: "炉中火" });
  });

  it("uses the selected year stem to derive the auxiliary palace stems", () => {
    const date = "2024-02-05T12:00";
    const term = chartFor(date).raw;
    const lunar = chartFor(date, "male", { yearBoundary: "lunar-new-year", dayBoundary: "midnight" }).raw;
    expect(term.mingGong).toEqual({ pillar: "癸酉", naYin: "剑锋金" });
    expect(term.shenGong).toEqual(term.mingGong);
    expect(lunar.mingGong).toEqual({ pillar: "辛酉", naYin: "石榴木" });
    expect(lunar.shenGong).toEqual(lunar.mingGong);
  });

  it("compares the two classical Xiao Yun methods for a Jia-Zi birth hour", () => {
    const date = "1984-06-09T00:00";
    const male = chartFor(date, "male").raw;
    const female = chartFor(date, "female").raw;
    expect(male.baZi[0]).toBe("甲子");
    expect(male.baZi[3]).toBe("甲子");
    expect(male.xiaoYun?.slice(0, 2)).toEqual([
      { age: 1, birthHourMethod: "乙丑", fixedStartMethod: "丙寅" },
      { age: 2, birthHourMethod: "丙寅", fixedStartMethod: "丁卯" },
    ]);
    expect(female.xiaoYun?.slice(0, 2)).toEqual([
      { age: 1, birthHourMethod: "癸亥", fixedStartMethod: "壬申" },
      { age: 2, birthHourMethod: "壬戌", fixedStartMethod: "辛未" },
    ]);
  });

  it("keeps the current lunar-typescript solar-term boundary stable", () => {
    expect(chartFor("2024-02-04T16:20").raw.baZi).toEqual(["癸卯", "乙丑", "戊戌", "庚申"]);
    expect(chartFor("2024-02-04T17:20").raw.baZi).toEqual(["甲辰", "丙寅", "戊戌", "辛酉"]);
  });

  it.each(["2024-01-17T12:00", "2024-05-16T12:00", "2024-09-13T12:00"])(
    "finds Geng's month virtue in the three metal months (%s)", (datetime) => {
      const day = chartFor(datetime).raw.pillars.find(({ key }) => key === "day");
      expect(day?.heavenlyStem).toBe("庚");
      expect(day?.shenSha).toContain("月德贵人");
    },
  );

  it("matches all twelve 天德 targets in 渊海子平", () => {
    const sample = chartFor("2026-02-09T06:00").raw.pillars;
    const cases = [
      ["寅", "丁", "子"], ["卯", "甲", "申"], ["辰", "壬", "子"], ["巳", "辛", "子"],
      ["午", "甲", "亥"], ["未", "甲", "子"], ["申", "癸", "子"], ["酉", "甲", "寅"],
      ["戌", "丙", "子"], ["亥", "乙", "子"], ["子", "甲", "巳"], ["丑", "庚", "子"],
    ] as const;
    for (const [monthBranch, heavenlyStem, earthlyBranch] of cases) {
      const pillars = sample.map((pillar) => pillar.key === "month" ? { ...pillar, earthlyBranch: monthBranch }
        : pillar.key === "time" ? { ...pillar, heavenlyStem, earthlyBranch } : pillar);
      const position = pillars.findIndex((pillar) => pillar.key === "time");
      expect(buildShenSha(pillars, "甲")[position], monthBranch).toContain("天德贵人");
    }
  });

  it("matches the four 三合 groups for 将星, 华盖, 驿马 and 咸池", () => {
    const groups = ["寅午戌", "巳酉丑", "申子辰", "亥卯未"];
    const branches = Array.from("子丑寅卯辰巳午未申酉戌亥");
    for (const group of groups) {
      const [birth, center, store] = group;
      const index = branches.indexOf(birth);
      for (const branch of group) {
        expect(getGroupStarBranch("将星", branch)).toBe(center);
        expect(getGroupStarBranch("华盖", branch)).toBe(store);
        expect(getGroupStarBranch("驿马", branch)).toBe(branches[(index + 6) % 12]);
        expect(getGroupStarBranch("桃花", branch)).toBe(branches[(index + 1) % 12]);
      }
    }
  });

  it("查日支神煞只比较其他柱，并保留年支来源", () => {
    const sample = chartFor("2026-02-09T06:00").raw.pillars;
    for (const [base, target, star] of [["午", "午", "将星"], ["戌", "戌", "华盖"]] as const) {
      const pillars = sample.map(pillar => pillar.key === "day" || pillar.key === "time"
        ? { ...pillar, earthlyBranch: target }
        : pillar.key === "year" ? { ...pillar, earthlyBranch: base } : pillar);
      const results = buildShenSha(pillars, "甲");
      const at = (key: string) => results[pillars.findIndex(pillar => pillar.key === key)];
      expect(at("day")).not.toContain(`${star}（日）`);
      expect(at("day")).toContain(`${star}（年）`);
      expect(at("time")).toContain(`${star}（日）`);
    }
  });

  it("takes Geng's Tian Yi from the ox-and-goat table", () => {
    const ox = chartFor("2026-02-15T02:00").raw;
    const snake = chartFor("2026-02-15T10:00").raw;
    expect(ox.dayMaster).toBe("庚");
    expect(ox.pillars.find(({ key }) => key === "time")?.shenSha).toContain("天乙贵人");
    expect(snake.pillars.find(({ key }) => key === "time")?.shenSha).not.toContain("天乙贵人");
  });

  it("matches the selected 文昌 table, including the earth 食神长生 cases", () => {
    expect(Array.from("甲乙丙丁戊己庚辛壬癸", getWenChangBranch)).toEqual(Array.from("巳午申酉申酉亥子寅卯"));
    const noon = chartFor("2026-02-10T12:00").raw;
    const night = chartFor("2026-02-10T22:00").raw;
    expect(noon.pillars.find(({ key }) => key === "time")?.shenSha).toContain("文昌贵人");
    expect(night.pillars.find(({ key }) => key === "time")?.shenSha).not.toContain("文昌贵人");
  });

  it("uses the Zi Ping five-yang-stem rule for 羊刃", () => {
    const yin = chartFor("2026-02-10T12:00").raw;
    expect(yin.dayMaster).toBe("乙");
    expect(yin.pillars.find(({ key }) => key === "month")?.earthlyBranch).toBe("寅");
    expect(yin.pillars.flatMap(({ shenSha }) => shenSha)).not.toContain("羊刃");
    const yang = chartFor("2026-02-09T06:00").raw;
    expect(yang.dayMaster).toBe("甲");
    expect(yang.pillars.find(({ key }) => key === "time")?.shenSha).toContain("羊刃");
  });

  it("keeps the current engine day and 子时 behavior stable", () => {
    expect(chartFor("2024-02-10T23:30").raw.baZi).toEqual(["甲辰", "丙寅", "甲辰", "丙子"]);
    expect(chartFor("2024-02-11T00:30").raw.baZi).toEqual(["甲辰", "丙寅", "乙巳", "丙子"]);
  });

  it("marks a birth time close to an hour-pillar boundary for replay", () => {
    const chart = chartFor("2024-02-10T22:50");
    expect(chart.raw.boundaryAudit.sensitive).toBe(true);
    expect(chart.raw.boundaryAudit.changedPillars).toContain("time");
    expect(chart.raw.boundaryAudit.before).not.toEqual(chart.raw.boundaryAudit.after);
  });

  it("keeps gender-dependent 大运 direction and historical input coverage stable", () => {
    const male = chartFor("1990-01-01T12:00", "male");
    const female = chartFor("1990-01-01T12:00", "female");
    const historical = chartFor("1900-01-31T12:00");
    expect(male.raw.yun.direction).toBe("backward");
    expect(female.raw.yun.direction).toBe("forward");
    expect(male.raw.yun.startSolar).toBe("1998-05-01 12:00:00");
    expect(female.raw.yun.startSolar).toBe("1991-06-21 12:00:00");
    expect(historical.raw.baZi).toEqual(["己亥", "丁丑", "甲辰", "庚午"]);
  });

  it("replays all public MingLi-Bench source charts with their declared calendar conventions", () => {
    // Source: DestinyLinker/MingLi-Bench (MIT), data/fortune_api_results.json.
    // This verifies deterministic four-pillar construction only. It does not
    // treat the benchmark's historical-event answers as scientific evidence.
    const cases: Array<[
      datetime: string,
      expected: string,
      yearBoundary?: "li-chun" | "lunar-new-year",
      dayBoundary?: "midnight" | "zi-start",
    ]> = [
      ["1974-04-28T16:40", "甲寅戊辰己亥壬申"], ["1981-05-26T02:17", "辛酉癸巳甲辰乙丑"],
      ["1990-05-23T17:30", "庚午辛巳戊子辛酉"], ["1977-10-26T11:10", "丁巳庚戌丙辰甲午"],
      ["1985-06-29T18:32", "乙丑壬午己亥癸酉"], ["1983-11-01T21:00", "癸亥壬戌癸巳癸亥"],
      ["1984-12-09T17:00", "甲子丙子丁丑己酉"], ["1981-06-17T19:00", "辛酉甲午丙寅戊戌"],
      ["1966-10-18T23:15", "丙午戊戌辛亥戊子", "li-chun", "zi-start"], ["1962-08-06T09:00", "壬寅丁未丙子癸巳"],
      ["1986-04-24T21:30", "丙寅壬辰戊戌癸亥"], ["1956-03-11T09:00", "丙申辛卯丁丑乙巳"],
      ["1978-04-05T18:00", "戊午丙辰丁酉己酉"], ["1958-10-27T07:00", "戊戌壬戌丁丑甲辰"],
      ["2002-06-01T08:30", "壬午乙巳庚子庚辰"], ["1980-07-11T09:00", "庚申癸未乙酉辛巳"],
      ["1980-08-24T16:30", "庚申甲申己巳壬申"], ["1972-01-08T12:00", "辛亥辛丑戊戌戊午"],
      ["1961-12-30T02:00", "辛丑庚子丁酉辛丑"], ["1983-10-28T01:00", "癸亥壬戌己丑乙丑"],
      ["1971-04-12T15:00", "辛亥壬辰丁卯戊申"], ["1983-03-26T13:00", "癸亥乙卯癸丑己未"],
      ["1980-09-21T11:25", "庚申乙酉丁酉丙午"], ["2007-01-31T09:00", "丙戌辛丑乙丑辛巳"],
      ["1951-11-14T09:00", "辛卯己亥戊午丁巳"], ["1987-07-05T12:00", "丁卯丙午乙卯壬午"],
      ["1983-04-21T06:00", "癸亥丙辰己卯丁卯"], ["1993-04-08T23:34", "癸酉丙辰庚申丙子", "li-chun", "zi-start"],
      ["1988-01-10T08:12", "丁卯癸丑甲子戊辰"], ["1973-08-24T00:35", "癸丑庚申壬辰庚子"],
      ["1988-02-15T16:50", "丁卯甲寅庚子甲申", "lunar-new-year"], ["1970-07-22T15:00", "庚戌癸未癸卯庚申"],
    ];

    for (const [datetime, expected, yearBoundary = "li-chun", dayBoundary = "midnight"] of cases) {
      expect(chartFor(datetime, "male", { yearBoundary, dayBoundary }).raw.baZi.join("")).toBe(expected);
    }
  });
});

it("keeps a single zi hour together when coarse luck offsets cross midnight", () => {
  const calculate = (datetime: string, gender: "male" | "female") =>
    buildBaziChartFromProfile(normalizeProfileInput({
      calendarMode: "solar", datetime, timeZone: "Asia/Shanghai", gender, timeBasis: "civil",
    })).raw.yun.startOffset;
  for (const gender of ["male", "female"] as const) {
    expect(calculate("2024-02-03T23:15", gender)).toEqual(calculate("2024-02-04T00:15", gender));
    expect(calculate("2024-02-03T22:15", gender)).not.toEqual(calculate("2024-02-03T23:15", gender));
  }
});

it("matches the ten stem lu positions in San Ming Tong Hui juan three", () => {
  expect([... "甲乙丙丁戊己庚辛壬癸"].map(getLuShenBranch)).toEqual([
    "寅", "卯", "巳", "午", "巳", "午", "申", "酉", "亥", "子",
  ]);
});

it("reproduces the San Ming five-day three-shichen example with controlled term endpoints", () => {
  // 复现古书的时间间隔，2000年的日期只承载两个钟面，非该年实际立春节气。
  const lunar = Solar.fromYmdHms(2000, 1, 24, 10, 0, 0).getLunar();
  const nextTerm = Solar.fromYmdHms(2000, 1, 29, 16, 0, 0);
  vi.spyOn(lunar, "getYearGanIndexExact").mockReturnValue(0);
  vi.spyOn(lunar, "getNextJie").mockReturnValue({
    getSolar: () => nextTerm,
  } as ReturnType<typeof lunar.getNextJie>);
  const yun = lunar.getEightChar().getYun(1, 1);
  expect([yun.getStartYear(), yun.getStartMonth(), yun.getStartDay()]).toEqual([1, 9, 0]);
});
