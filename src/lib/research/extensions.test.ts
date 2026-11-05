import { describe, expect, it } from "vitest";
import { calculateDaliuren } from "taibu-core/daliuren";
import { buildDaliurenResearch } from "./extensions";

const profile = {
  original: { calendarMode: "solar", datetime: "2026-08-07T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" },
  normalized: { datetime: "2026-08-07T12:00", timeZone: "Asia/Shanghai", calendarMode: "solar", timeBasis: "civil" },
} as const;

describe("research extensions", () => {
  it("builds Daliuren four lessons and three transmissions", () => {
    const result = buildDaliurenResearch(profile);
    expect(result.text).toContain("三传");
    expect(result.json).toBeTruthy();
    expect(result.referenceEngine.version).toBe("3.5.0");
  });
});

it("reproduces the Renchen Fuyin example from Liu Ren Da Quan, volume 7", () => {
  const datetime = "2019-04-25T18:00";
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain("壬辰日第一局");
  expect(text).toContain("伏吟课");
  expect(text).toContain("月将: 酉");
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1]))
    .toEqual(["亥", "辰", "戌"]);
});

it.each([
  ["2024-03-20T10:50", "亥", ["未", "丑", "未"]],
  ["2024-03-20T11:20", "戌", null],
])("changes the computed chart at the equinox: %s", (datetime, general, transmissions) => {
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain("月将: " + general);
  if (transmissions) {
    expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1]))
      .toEqual(transmissions);
  }
});

it("takes the sole upper-over-lower lesson as the Yuan Shou first transmission", () => {
  const datetime = "2024-03-29T18:00";
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain("月将: 戌");
  expect(text).toContain("元首");
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1]))
    .toEqual(["丑", "寅", "卯"]);
});

it("takes the actual lower-over-upper lesson when the example header gives a different plate", () => {
  const datetime = "2024-09-28T04:00";
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain("月将: 辰");
  expect(text).toContain("重审课");
  expect(text).toContain("| 地盘 | 天盘 (五行·旺衰) |");
  expect(text).toContain("| 子 | 寅(木·死) |");
  expect([...text.matchAll(/\| [一二三四]课[^|]*\|[^|]*\|\s*(\S+)\s*\|\s*(\S+)\s*\|/g)]
    .map(([, upper, lower]) => upper + lower)).toEqual(["午乙", "申午", "酉未", "亥酉"]);
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1]))
    .toEqual(["申", "戌", "子"]);
});

it("reproduces the Yin Mao Xing plate in Liu Ren Da Quan, volume 7", () => {
  const datetime = "2024-09-28T12:00";
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain("昴星");
  expect([...text.matchAll(/\| [一二三四]课[^|]*\|[^|]*\|\s*(\S+)\s*\|\s*(\S+)\s*\|/g)]
    .map(([, upper, lower]) => upper + lower)).toEqual(["寅乙", "子寅", "巳未", "卯巳"]);
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1]))
    .toEqual(["亥", "寅", "巳"]);
});

it("uses the same month general for equivalent instants in Shanghai and New York", () => {
  for (const [datetime, timeZone] of [
    ["2024-03-20T11:20", "Asia/Shanghai"],
    ["2024-03-19T23:20", "America/New_York"],
  ]) {
    const { text } = buildDaliurenResearch({
      original: { ...profile.original, datetime, timeZone },
      normalized: { ...profile.normalized, datetime, timeZone },
    });
    expect(text).toContain("月将: 戌");
  }
});

it("keeps the month general when the apparent solar clock precedes the equinox", () => {
  const datetime = "2024-03-20T11:20";
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime, timeBasis: "true-solar" },
    normalized: { ...profile.normalized, datetime: "2024-03-20T10:10", timeBasis: "true-solar" },
  });
  expect(text).toContain("月将: 戌");
});

it("reproduces the 辛丑日巳时亥将 井栏射 example", () => {
  const datetime = "2028-03-17T10:00";
  const { text, json } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain("辛丑日第六局 干上辰 / 反吟课");
  expect(text).toContain("课体细分: 井栏射");
  expect(text).toContain("| 地盘 | 天盘 (五行·旺衰) | 天将 | 地盘遁干 |");
  expect(text).toMatch(/\| 子 \| 午\([^)]+\) \| 贵人 \| 庚 \|/);
  expect(json.基本信息).toMatchObject({ 课体细分: "井栏射" });
  expect(text).toContain("| 初传 (发端) | 亥 |");
  expect(text).toContain("| 中传 (移易) | 未 |");
  expect(text).toContain("| 末传 (归计) | 辰 |");
});

it("preserves seconds for month-general selection across the equinox", () => {
  const monthAt = (datetime: string) => buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  }).text;
  expect(monthAt("2024-03-20T11:06:24")).toContain("月将: 亥");
  expect(monthAt("2024-03-20T11:06:26")).toContain("月将: 戌");
});

it.each([
  ["2024-10-19T06:00", "丙辰", "亥", "午"],
  ["2026-02-26T04:00", "辛未", "亥", "未"],
])("checks the yang and yin 别责 rules at %s", (datetime, day, initial, repeated) => {
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain(`课式: ${day}日`);
  expect(text).toContain("/ 别责课");
  expect(text).toContain(`| 初传 (发端) | ${initial} |`);
  expect(text).toContain(`| 中传 (移易) | ${repeated} |`);
  expect(text).toContain(`| 末传 (归计) | ${repeated} |`);
});

it.each([
  ["2031-01-14T08:00", "甲寅", "丑", "亥"],
  ["2024-10-10T02:00", "丁未", "亥", "戌"],
])("reproduces the classical 八专 examples at %s", (datetime, day, initial, repeated) => {
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain(`课式: ${day}日`);
  expect(text).toContain("/ 八专课");
  expect(text).toContain(`| 初传 (发端) | ${initial} |`);
  expect(text).toContain(`| 中传 (移易) | ${repeated} |`);
  expect(text).toContain(`| 末传 (归计) | ${repeated} |`);
});

it.each([
  ["2024-05-28T10:00", "蒿矢", "戌", "丑", "辰"],
  ["2024-03-09T16:00", "弹射", "巳", "申", "亥"],
])("reproduces the classical 遥克 examples at %s", (datetime, subtype, first, middle, last) => {
  const { text, json } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain("/ 遥克课");
  expect(text).toContain(`课体细分: ${subtype}`);
  expect(json.基本信息).toMatchObject({ 课体细分: subtype });
  expect(text).toContain(`| 初传 (发端) | ${first} |`);
  expect(text).toContain(`| 中传 (移易) | ${middle} |`);
  expect(text).toContain(`| 末传 (归计) | ${last} |`);
});

it.each([
  ["2024-09-25T10:00", "比用", "戌", "酉", "申"],
  ["2024-03-04T02:00", "涉害", "亥", "酉", "未"],
])("reproduces the classical %s tie-break example", (datetime, method, first, middle, last) => {
  const { text } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain(`/ ${method}课`);
  expect(text).toContain(`| 初传 (发端) | ${first} |`);
  expect(text).toContain(`| 中传 (移易) | ${middle} |`);
  expect(text).toContain(`| 末传 (归计) | ${last} |`);
});

it("assigns each branch's 旬遁 stem and both void branches over a full cycle", () => {
  const stems = Array.from("甲乙丙丁戊己庚辛壬癸");
  const branches = Array.from("子丑寅卯辰巳午未申酉戌亥");
  for (let offset = 0; offset < 60; offset += 1) {
    // 2024-09-27 is 甲午, one day before the 乙未 fixture above.
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    const chart = calculateDaliuren({ date, hour: 12, timezone: "Asia/Shanghai" });
    const dayStem = offset % 10;
    const dayBranch = (6 + offset) % 12;
    const head = (dayBranch - dayStem + 12) % 12;
    expect(chart.dateInfo.ganZhi.day, date).toBe(stems[dayStem] + branches[dayBranch]);
    expect(chart.dateInfo.kongWang, date).toEqual([branches[(head + 10) % 12], branches[(head + 11) % 12]]);
    for (let index = 0; index < 12; index += 1) {
      expect(chart.dunGan[branches[(head + index) % 12]], date).toBe(stems[index] ?? "");
    }
  }
});

it.each([
  ["04:59", "夜占"], ["05:00", "昼占"], ["16:59", "昼占"], ["17:00", "夜占"], ["18:59", "夜占"],
])("uses the same day/night boundary as the heavenly generals at %s", (time, expected) => {
  const datetime = `2024-09-27T${time}`;
  const { text, json } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(text).toContain(`(${expected})`);
  expect(json.天地盘.find((palace) => palace.天将 === "贵人")?.天盘).toBe(expected === "昼占" ? "丑" : "未");
});

it("places the twenty day/night nobles and orders the generals from their earth seats", () => {
  const dayNobles = Array.from("丑子亥亥丑子丑午巳巳");
  const nightNobles = Array.from("未申酉酉未申未寅卯卯");
  const generals = ["贵人", "腾蛇", "朱雀", "六合", "勾陈", "青龙", "天空", "白虎", "太常", "玄武", "太阴", "天后"];
  for (let offset = 0; offset < 10; offset += 1) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (const hour of [12, 18]) {
      const chart = calculateDaliuren({ date, hour, timezone: "Asia/Shanghai" });
      const noble = (hour === 12 ? dayNobles : nightNobles)[offset];
      const index = chart.gongInfos.findIndex((palace) => palace.tianZhi === noble);
      expect(index, date).toBeGreaterThanOrEqual(0);
      const earth = chart.gongInfos[index].diZhi;
      const direction = "亥子丑寅卯辰".includes(earth) ? 1 : -1;
      const actual = generals.map((_, step) => chart.gongInfos[(index + 12 + direction * step) % 12].tianJiang);
      expect(actual, `${date} ${hour}`).toEqual(generals);
    }
  }
});
