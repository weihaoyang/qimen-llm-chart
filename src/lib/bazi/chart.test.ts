import { describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "./chart";

describe("buildBaziChartFromProfile", () => {
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

  it("keeps the current lunar-typescript solar-term boundary stable", () => {
    expect(chartFor("2024-02-04T16:20").raw.baZi).toEqual(["癸卯", "乙丑", "戊戌", "庚申"]);
    expect(chartFor("2024-02-04T17:20").raw.baZi).toEqual(["甲辰", "丙寅", "戊戌", "辛酉"]);
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
