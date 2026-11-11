import { describe, expect, it } from "vitest";
import { calculateDaliuren } from "taibu-core/daliuren";
import tanYuanTable from "./fixtures/tanyuan-60-days.json";
import tanYuanFacsimile from "./fixtures/tanyuan-facsimile-missing-rows.json";
import { alternateLiuRenGenerals, buildDaliurenResearch, classifyLiuRenPlate, tanYuanShehai } from "./extensions";

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
  expect(text).toContain("天地盘: 伏吟");
  expect(text).toContain("月将: 酉");
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1]))
    .toEqual(["亥", "辰", "戌"]);
});

it("reports a 返吟 plate independently of the 涉害 transmission method", () => {
  const datetime = "2024-01-22T12:00";
  const { text, json } = buildDaliurenResearch({ original: { ...profile.original, datetime }, normalized: { ...profile.normalized, datetime } });
  expect(text).toContain("乙酉日第十二局 干上戌 / 涉害课");
  expect(text).toContain("天地盘: 返吟");
  expect(text).toContain("月将: 子");
  expect(json.基本信息).toMatchObject({ 天地盘: "返吟" });
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1])).toEqual(["卯", "酉", "卯"]);
});

it("classifies all month-general and hour-branch combinations without treating malformed inputs as 子", () => {
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  for (let i = 0; i < branches.length; i++) for (let j = 0; j < branches.length; j++) {
    const expected = i === j ? "伏吟" : (i + 6) % 12 === j ? "返吟" : undefined;
    expect(classifyLiuRenPlate(branches[i], branches[j]), `${branches[i]}将/${branches[j]}时`).toBe(expected);
  }
  expect(classifyLiuRenPlate("", "子")).toBeUndefined();
  expect(classifyLiuRenPlate("子", "")).toBeUndefined();
  expect(classifyLiuRenPlate("子", undefined)).toBeUndefined();
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

it("names the noble convention and its classical alternative in both exports", () => {
  // 甲午日午时: 存验 uses 丑 as day noble; 探原 explicitly uses 未.
  const datetime = "2024-09-27T12:00";
  const { text, json } = buildDaliurenResearch({
    original: { ...profile.original, datetime },
    normalized: { ...profile.normalized, datetime },
  });
  expect(json.天地盘.find((palace) => palace.天将 === "贵人")?.天盘).toBe("丑");
  expect(text).toContain("贵人口径: 按《六壬存验》昼夜贵人口径");
  expect(text).toContain("《大六壬探原》部分日干的昼夜贵人互换");
  expect(json.基本信息.贵人口径).toContain("《大六壬探原》");
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

it("reproduces the 辛丑 申将 巳时 别责 plate described in 六壬心镜", () => {
  const datetime = "2026-05-27T10:00";
  const { text } = buildDaliurenResearch({ original: { ...profile.original, datetime }, normalized: { ...profile.normalized, datetime } });
  expect(text).toContain("辛丑日第三局 干上丑 / 别责课");
  expect(text).toContain("月将: 申");
  expect([...text.matchAll(/\| [一二三四]课[^|]*\|[^|]*\|\s*(\S+)\s*\|\s*(\S+)\s*\|/g)].map(([, upper, lower]) => upper + lower)).toEqual(["丑辛", "辰丑", "辰丑", "未辰"]);
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map(match => match[1])).toEqual(["巳", "丑", "丑"]);
});

it("enumerates all nine classical 别责 lessons across 60 days and 12 plate rotations", () => {
  // 《六壬大全》列七日九课；柔日取支前三合，刚日取干合寄宫上神。
  // 子将下十二个时辰覆盖十二种天地盘相对位置；不宣称覆盖天将异法。
  const lessons: string[] = [];
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + dayOffset)).toISOString().slice(0, 10);
    for (let hour = 0; hour < 24; hour += 2) {
      const input = { date, hour, timezone: "Asia/Shanghai", monthGeneral: "子" };
      const result = calculateDaliuren(input);
      if (result.keTi.method === "别责") {
        lessons.push(`${result.dateInfo.ganZhi.day} ${result.siKe.yiKe[0][0]} ${result.sanChuan.chu[0]}${result.sanChuan.zhong[0]}${result.sanChuan.mo[0]}`);
      }
    }
  }
  expect(lessons.sort()).toEqual([
    "丁酉 巳 丑巳巳", "辛丑 未 巳未未", "辛丑 丑 巳丑丑",
    "丙辰 午 亥午午", "戊午 午 寅午午", "辛酉 酉 丑酉酉",
    "戊辰 午 寅午午", "辛未 未 亥未未", "辛未 丑 亥丑丑",
  ].sort());
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

it("checks 八专 selection and transmissions through 60 days and 12 relative plate positions", () => {
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  const lodging: Record<string, string> = { 甲寅: "寅", 庚申: "申", 丁未: "未", 己未: "未", 癸丑: "丑" };
  const elements: Record<string, string> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水", 甲: "木", 丁: "火", 己: "土", 庚: "金", 癸: "水" };
  const conquers: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  const clashes = (a: string, b: string) => conquers[elements[a]] === elements[b] || conquers[elements[b]] === elements[a];
  let selected = 0;
  let guiChou = 0;
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + dayOffset)).toISOString().slice(0, 10);
    for (let hour = 0; hour < 24; hour += 2) {
      const input = { date, hour, timezone: "Asia/Shanghai", monthGeneral: "子" };
      const result = calculateDaliuren(input);
      const day = result.dateInfo.ganZhi.day;
      if (day === "癸丑") guiChou++;
      const hourBranch = result.dateInfo.ganZhi.hour[1];
      const rotation = (12 - branches.indexOf(hourBranch)) % 12;
      const ganShang = lodging[day] ? branches[(branches.indexOf(lodging[day]) + rotation) % 12] : "";
      const nextGod = ganShang ? branches[(branches.indexOf(ganShang) + rotation) % 12] : "";
      // 独立按两课的五行关系判断；伏吟与返吟另按天地盘位移优先处理。
      const isBazan = Boolean(ganShang && rotation !== 0 && rotation !== 6 && !clashes(day[0], ganShang) && !clashes(day[1], ganShang) && !clashes(ganShang, nextGod));
      expect(result.keTi.method === "八专", `${day}/${hourBranch}时`).toBe(isBazan);
      if (!isBazan) continue;
      selected++;
      // 阳日从干上顺数三位；阴日从第四课上神逆数三位（均含起位）。
      const isYang = day === "甲寅" || day === "庚申";
      const origin = isYang ? ganShang : nextGod;
      const first = branches[(branches.indexOf(origin) + (isYang ? 2 : 10)) % 12];
      expect([result.sanChuan.chu[0], result.sanChuan.zhong[0], result.sanChuan.mo[0]], `${day}/${hourBranch}时`)
        .toEqual([first, ganShang, ganShang]);
    }
  }
  expect(selected).toBe(16);
  expect(guiChou).toBe(12);
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
  expect(json.基本信息.贵人异说).toContain(expected === "昼占" ? "昼贵在未" : "夜贵在丑");
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

it("compares all twenty noble positions with the explicit 探原 day and night verses", () => {
  const day = Array.from("未申酉亥丑子丑寅卯巳");
  const night = Array.from("丑子亥酉未申未午巳卯");
  for (let offset = 0; offset < 10; offset += 1) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (const [time, expected, label] of [["12:00", day[offset], "昼"], ["18:00", night[offset], "夜"]] as const) {
      const datetime = `${date}T${time}`;
      const { text, json } = buildDaliurenResearch({
        original: { ...profile.original, datetime }, normalized: { ...profile.normalized, datetime },
      });
      const description = `《大六壬探原》${label}贵在${expected}；另列天将对照，主盘不变`;
      expect(text, datetime).toContain(description);
      expect(json.基本信息.贵人异说, datetime).toBe(description);
      expect(json.探原天将对照?.find((palace) => palace.天将 === "贵人")?.天盘, datetime).toBe(expected);
    }
  }
});

it("reconstructs four 探原 day and night general examples", () => {
  const cases = [
    { date: "2024-02-10", hour: 6, general: "亥", day: "甲辰", noble: "未", earth: "亥", transmissions: ["戌", "午", "寅"], positions: { 未: "贵人", 申: "腾蛇", 戌: "六合", 子: "青龙", 辰: "玄武" } },
    { date: "2024-01-07", hour: 8, general: "申", day: "庚午", noble: "丑", earth: "酉", transmissions: ["辰", "申", "子"], positions: { 丑: "贵人", 子: "腾蛇", 戌: "六合", 申: "青龙", 辰: "玄武" } },
    { date: "2024-01-13", hour: 22, general: "午", day: "丙子", noble: "亥", earth: "辰", transmissions: ["子", "未", "寅"], positions: { 亥: "贵人", 子: "腾蛇", 未: "太常", 寅: "六合" } },
    { date: "2024-02-27", hour: 0, general: "亥", day: "辛酉", noble: "午", earth: "未", transmissions: ["丑", "酉", "酉"], positions: { 午: "贵人", 丑: "青龙", 酉: "玄武" } },
  ];
  for (const entry of cases) {
    // taibu-core's runtime accepts monthGeneral; its published declaration omits it.
    const input = { date: entry.date, hour: entry.hour, timezone: "Asia/Shanghai", monthGeneral: entry.general };
    const chart = calculateDaliuren(input);
    expect(chart.dateInfo.ganZhi.day).toBe(entry.day);
    expect(chart.dateInfo.yueJiang).toBe(entry.general);
    // 甲辰课现有引擎结果与孟上取用相同，与《探原》历数涉害的子申辰不同。
    expect([chart.sanChuan.chu[0], chart.sanChuan.zhong[0], chart.sanChuan.mo[0]]).toEqual(entry.transmissions);
    const alternate = alternateLiuRenGenerals(chart.gongInfos, entry.noble);
    expect(alternate.find((palace) => palace.天将 === "贵人")?.地盘).toBe(entry.earth);
    for (const [branch, general] of Object.entries(entry.positions)) {
      expect(alternate.find((palace) => palace.天盘 === branch)?.天将, `${entry.day} ${branch}`).toBe(general);
    }
  }
});


it("compares the 24 探原 amended 涉害 entries against the actual plates", () => {
  // 原书六十日表逐项转录；不将此表视为完整的涉害算法。
  const entries = [
    "丁卯巳亥酉未", "丁卯亥亥卯未", "庚午辰子申辰", "庚午午寅子戌",
    "癸酉申亥午丑", "己卯巳亥酉未", "己卯亥亥卯未", "庚辰午寅子戌",
    "癸未酉卯亥未", "甲申戌子申辰", "己丑卯卯亥未", "庚寅辰子申辰",
    "辛卯寅亥卯未", "辛卯申亥酉未", "甲午子寅子戌", "己亥亥亥卯未",
    "癸卯亥亥酉未", "甲辰子寅子戌", "甲辰未子巳戌", "甲辰戌子申辰",
    "己酉卯卯亥未", "乙卯寅亥酉未", "乙卯申亥卯未", "乙卯亥午丑申",
  ];
  const pending = new Set(entries.map((entry) => entry.slice(0, 3)));
  const matching: string[] = [];
  for (let offset = 0; offset < 60; offset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (let hour = 0; hour < 24; hour += 2) {
      const input = { date, hour, timezone: "Asia/Shanghai", monthGeneral: "子" };
      const chart = calculateDaliuren(input);
      const day = chart.dateInfo.ganZhi.day;
      const upper = chart.siKe.yiKe[0][0];
      const key = day + upper;
      const entry = entries.find((item) => item.startsWith(key));
      expect(tanYuanShehai(day, upper)).toBe(entry?.slice(3));
      if (!entry) continue;
      if ([chart.sanChuan.chu[0], chart.sanChuan.zhong[0], chart.sanChuan.mo[0]].join("") === entry.slice(3)) matching.push(key);
      const [first, second, third] = [...entry.slice(3)];
      expect(chart.gongInfos.find((palace) => palace.diZhi === first)?.tianZhi, key).toBe(second);
      expect(chart.gongInfos.find((palace) => palace.diZhi === second)?.tianZhi, key).toBe(third);
      pending.delete(key);
    }
  }
  expect([...pending]).toEqual([]);
  expect(matching.sort()).toEqual(["丁卯巳", "乙卯亥", "己亥亥", "辛卯申"].sort());
});


it("discloses the 探原 transmission discrepancy in both exports without changing the main plate", () => {
  const datetime = "2029-03-15T06:00";
  const { text, json } = buildDaliurenResearch({ original: { ...profile.original, datetime }, normalized: { ...profile.normalized, datetime } });
  expect(text).toContain("甲辰日");
  expect(text).toContain("涉害异说: 《大六壬探原》六十日表的改正涉害三传为子、申、辰");
  expect(json.基本信息.涉害异说).toContain("子、申、辰");
  expect([...text.matchAll(/\| [初中末]传[^|]*\|\s*(\S+)\s*\|/g)].map((match) => match[1])).toEqual(["戌", "午", "寅"]);
});


it("flags the internal discrepancy in the 乙卯 干上亥 source table", () => {
  const datetime = "2024-02-21T08:00";
  const { text, json } = buildDaliurenResearch({ original: { ...profile.original, datetime }, normalized: { ...profile.normalized, datetime } });
  expect(text).toContain("乙卯日");
  expect(text).toContain("干上亥");
  expect(text).toContain("馆藏影印本解释段又写取亥为初传，与三传表矛盾");
  expect(json.基本信息.涉害异说).toContain("馆藏影印本解释段又写取亥为初传，与三传表矛盾");
});


it("compares all available 探原 sixty-day transmission rows without filling omissions", () => {
  // 《探原》电子文本的重复行去重；八处缺行保持缺失，不由本站回填。
  const book: Record<string, string[]> = tanYuanTable;
  const missing: string[] = [];
  const mismatches: string[] = [];
  let matched = 0;
  for (let offset = 0; offset < 60; offset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (let hour = 0; hour < 24; hour += 2) {
      const input = { date, hour, timezone: "Asia/Shanghai", monthGeneral: "子" };
      const chart = calculateDaliuren(input);
      const key = chart.dateInfo.ganZhi.day + chart.siKe.yiKe[0][0];
      const reference = book[key];
      if (!reference) { missing.push(key); continue; }
      const actual = [chart.sanChuan.chu[0], chart.sanChuan.zhong[0], chart.sanChuan.mo[0]].join("");
      if (actual !== reference[0]) mismatches.push(`${key}:${actual}/${reference[0]}`);
      else matched++;
    }
  }
  expect(matched).toBe(692);
  expect(missing.sort()).toEqual(["戊申寅", "戊申卯", "丁卯午", "丁卯未", "丁亥寅", "丁亥卯", "甲申申", "甲申酉"].sort());
  expect(mismatches.sort()).toEqual([
    "己卯巳:丑亥酉/亥酉未", "己卯亥:未亥卯/亥卯未", "己丑卯:巳丑酉/卯亥未", "己酉卯:巳丑酉/卯亥未",
    "丁卯亥:未亥卯/亥卯未", "庚午辰:戌午寅/子申辰", "庚午午:午辰寅/寅子戌", "庚辰午:午辰寅/寅子戌",
    "庚寅辰:戌午寅/子申辰", "辛卯寅:未亥卯/亥卯未", "甲申戌:戌午寅/子申辰", "甲午子:戌申午/寅子戌",
    "甲辰子:戌申午/寅子戌", "甲辰未:寅未子/子巳戌", "甲辰戌:戌午寅/子申辰", "乙卯寅:丑亥酉/亥酉未",
    "乙卯申:未亥卯/亥卯未", "癸酉申:卯戌巳/亥午丑", "癸未酉:巳丑酉/卯亥未", "癸卯亥:丑亥酉/亥酉未",
  ].sort());
  for (const discrepancy of mismatches) expect(book[discrepancy.slice(0, 3)][1]).toBe("改正涉害");
});


it("checks eight missing 探原 electronic rows against independent historical cases", () => {
  // 六壬直指：丁卯伏吟课初卯中子末午、退茹丑子亥；
  // 丁亥干上寅初午中丑末申、干上卯为未卯亥；
  // 戊申干上寅以寅发用并据天盘传亥、申，干上卯为丑亥酉；
  // 古今图书集成甲申干上申寅申寅、干上酉初戌中巳末子。
  const expected: Record<string, string> = {
    丁卯未: "卯子午", 丁卯午: "丑子亥", 丁亥寅: "午丑申", 丁亥卯: "未卯亥",
    戊申寅: "寅亥申", 戊申卯: "丑亥酉", 甲申申: "寅申寅", 甲申酉: "戌巳子",
  };
  const found = new Set<string>();
  for (let offset = 0; offset < 60; offset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (let hour = 0; hour < 24; hour += 2) {
      const input = { date, hour, timezone: "Asia/Shanghai", monthGeneral: "子" };
      const chart = calculateDaliuren(input);
      const key = chart.dateInfo.ganZhi.day + chart.siKe.yiKe[0][0];
      if (!expected[key]) continue;
      expect([chart.sanChuan.chu[0], chart.sanChuan.zhong[0], chart.sanChuan.mo[0]].join(""), key).toBe(expected[key]);
      found.add(key);
    }
  }
  expect([...found].sort()).toEqual(Object.keys(expected).sort());
});

it("compares the eight electronic omissions with the actual 探原 facsimile", () => {
  // PDF pages 48, 53, 54 and 59; do not silently attribute these to the electronic transcription.
  const scanned: Record<string, { transmission: string; pdfPage: number }> = tanYuanFacsimile.rows;
  const electronic: Record<string, string[]> = tanYuanTable;
  const found = new Set<string>();
  for (let offset = 0; offset < 60; offset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (let hour = 0; hour < 24; hour += 2) {
      const chart = calculateDaliuren({ date, hour, timezone: "Asia/Shanghai", monthGeneral: "子" });
      const key = chart.dateInfo.ganZhi.day + chart.siKe.yiKe[0][0];
      const reference = scanned[key];
      if (!reference) continue;
      expect(electronic[key], key).toBeUndefined();
      expect([chart.sanChuan.chu[0], chart.sanChuan.zhong[0], chart.sanChuan.mo[0]].join(""), key).toBe(reference.transmission);
      found.add(key);
    }
  }
  expect([...found].sort()).toEqual(Object.keys(scanned).sort());
  expect(Object.keys(scanned)).toHaveLength(8);
});

it("compares legible 甲申 transmissions with 太白兵备统宗宝鉴 twelve-case table", () => {
  // https://www.shidianguji.com/book/SDZJ0646/chapter/1kg32r7axqwij
  // 第三局的首字电子文本作“干”，不将它猜改为午。
  const expected: Record<string, string> = {
    寅: "寅巳卯", 丑: "子亥戌", 亥: "巳寅亥", 戌: "戌午寅",
    酉: "戌巳子", 申: "寅申寅", 未: "子巳戌", 午: "辰申子",
    巳: "申亥寅", 辰: "辰午申", 卯: "辰巳午",
  };
  const found = new Set<string>();
  const differences: string[] = [];
  for (let offset = 0; offset < 60; offset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (let hour = 0; hour < 24; hour += 2) {
      const input = { date, hour, timezone: "Asia/Shanghai", monthGeneral: "子" };
      const chart = calculateDaliuren(input);
      if (chart.dateInfo.ganZhi.day !== "甲申") continue;
      const upper = chart.siKe.yiKe[0][0];
      if (!(upper in expected)) continue;
      const actual = [chart.sanChuan.chu[0], chart.sanChuan.zhong[0], chart.sanChuan.mo[0]].join("");
      if (actual !== expected[upper]) differences.push(`${upper}:${actual}/${expected[upper]}`);
      found.add(upper);
    }
  }
  expect([...found].sort()).toEqual(Object.keys(expected).sort());
  expect(differences).toEqual(["寅:寅巳申/寅巳卯"]);
});

it("checks all six 甲-day 伏吟 transmissions against 六壬大全 and the other 太白 entries", () => {
  // 六壬大全卷七：甲日伏吟寅发用，刑巳、巳刑申。
  // 太白卷四十二甲子、甲戌、甲午、甲辰日均写寅巳申；甲申条电子文本末字有异。
  const days = new Set<string>();
  let count = 0;
  for (let offset = 0; offset < 60; offset++) {
    const date = new Date(Date.UTC(2024, 8, 27 + offset)).toISOString().slice(0, 10);
    for (const monthGeneral of "子丑寅卯辰巳午未申酉戌亥") {
      for (let hour = 0; hour < 24; hour += 2) {
        // Runtime supports monthGeneral although the upstream declaration omits it.
        const input = { date, hour, timezone: "Asia/Shanghai", monthGeneral };
        const chart = calculateDaliuren(input);
        const day = chart.dateInfo.ganZhi.day;
        if (!day.startsWith("甲") || chart.siKe.yiKe[0][0] !== "寅") continue;
        const actual = [chart.sanChuan.chu[0], chart.sanChuan.zhong[0], chart.sanChuan.mo[0]].join("");
        expect(actual, `${day} ${monthGeneral}将 ${hour}时`).toBe("寅巳申");
        days.add(day);
        count++;
      }
    }
  }
  expect([...days].sort()).toEqual(["甲子", "甲戌", "甲申", "甲午", "甲辰", "甲寅"].sort());
  expect(count).toBe(72);
});
