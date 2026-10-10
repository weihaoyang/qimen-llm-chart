/**
 * 七政四余排盘。
 *
 * 框架与表格（十二宫名、二十八宿序、庙旺陷表、命宫公式、七政/四余五行吉凶）移植自
 * MIT 许可项目 `dglijin-oss/chinese-metaphysics-skills` 的 `qizheng-siyu-skill`；
 * 七政黄经改用本仓既有的真实星历（celestine，公转/月球位置远比该脚本的线性近似精确）；
 * 四余按经典定义计算：罗睺/计都取黄白交点（默认「果老旧法」罗睺=降交点），
 * 月孛取月远地点（Meeus 平根）。
 *
 * MIT License — Copyright (c) 2026 天工长老
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions: the above copyright notice and this
 * permission notice shall be included in all copies or substantial portions of the
 * Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */
import { buildAstroChart, offsetMinutes } from "@/lib/astro/chart";
import type { NormalizedProfileInput } from "@/lib/profile";

export const TWELVE_PALACES = ["命宫", "财帛", "兄弟", "田宅", "男女", "奴仆", "夫妻", "疾厄", "迁移", "官禄", "福德", "相貌"] as const;
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const TWENTY_EIGHT_MANSIONS = ["角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁", "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸"] as const;

/** 七政：太阳、太阴与水金火木土五星（对应西方体系的日/月/水/金/火/木/土）。 */
export const SEVEN_LUMINARIES: Array<{ name: string; planet: string }> = [
  { name: "太阳", planet: "太阳" },
  { name: "太阴", planet: "月亮" },
  { name: "水星", planet: "水星" },
  { name: "金星", planet: "金星" },
  { name: "火星", planet: "火星" },
  { name: "木星", planet: "木星" },
  { name: "土星", planet: "土星" },
];

export const FOUR_REMAINDERS = ["罗睺", "计都", "月孛", "紫气"] as const;

/** 星曜庙旺陷（来自 MIT 脚本表格）。 */
const DIGNITY: Record<string, { temple?: string; prosperous?: string; fallen?: string }> = {
  太阳: { temple: "戌", prosperous: "午", fallen: "辰" },
  太阴: { temple: "未", prosperous: "卯", fallen: "酉" },
  木星: { temple: "未", prosperous: "亥", fallen: "酉" },
  火星: { temple: "卯", prosperous: "戌", fallen: "子" },
  土星: { temple: "子", prosperous: "酉", fallen: "卯" },
  金星: { temple: "酉", prosperous: "巳", fallen: "卯" },
  水星: { temple: "巳", prosperous: "申", fallen: "午" },
};

const ELEMENT: Record<string, string> = { 太阳: "火", 太阴: "水", 木星: "木", 火星: "火", 土星: "土", 金星: "金", 水星: "水", 罗睺: "火", 计都: "土", 月孛: "水", 紫气: "木" };
const FORTUNE: Record<string, string> = { 太阳: "大吉", 太阴: "吉", 木星: "吉", 火星: "凶", 土星: "凶", 金星: "吉", 水星: "中", 罗睺: "凶", 计都: "凶", 月孛: "凶", 紫气: "吉" };

export type QizhengStar = {
  name: string;
  kind: "七政" | "四余";
  longitude: number;
  palace: number;
  branch: string;
  palaceName: string;
  mansion: string;
  dignity: string;
  element: string;
  fortune: string;
  note?: string;
};

export type QizhengChart = {
  format: "qmdj-qizheng-chart-v1";
  input: { datetime: string; timeZone: string };
  mingPalace: { index: number; branch: string };
  palaces: Array<{ name: string; index: number; branch: string }>;
  stars: QizhengStar[];
  complete: boolean;
  disclaimer: string;
};

const wrap = (value: number) => ((value % 360) + 360) % 360;

/**
 * 黄经 → 宫位索引（= EARTHLY_BRANCHES 的下标，子=0…亥=11）。
 *
 * 依古典「十二次」配十二宫（果老星宗「太阳过宫」表）：
 * 白羊=戌、金牛=酉、双子=申、巨蟹=未、狮子=午、处女=巳、
 * 天秤=辰、天蝎=卯、射手=寅、摩羯=丑、水瓶=子、双鱼=亥。
 *
 * 历史说明：上游 MIT 脚本用 `floor((lon+60)/30)` 把白羊映射到「寅」，与其自身
 * （按古典键位编制的）庙旺陷表互相矛盾，属该脚本的已知错误；本仓已改为古典口径。
 */
export const longitudeToPalace = (longitude: number) => ((10 - Math.floor(wrap(longitude) / 30)) % 12 + 12) % 12;

/**
 * 黄经 → 二十八宿。
 *
 * ⚠️ 近似：此处与上游脚本一致，采用 **等分 360/28（≈12.857°）** 的粗略口径，并用
 * 角宿起 0°；古典宿度并不等分（觜约 2°、井约 33°），且二十八宿为恒星锚定、随岁差
 * 移动。故宿界附近可能有约 ±10° 的偏差，宿名仅供粗定位，不作为判据。
 */
export const longitudeToMansion = (longitude: number) => TWENTY_EIGHT_MANSIONS[Math.floor(wrap(longitude) / (360 / 28)) % 28];

const dignityOf = (name: string, branch: string) => {
  const table = DIGNITY[name];
  if (!table) return "—";
  if (table.temple === branch) return "庙";
  if (table.prosperous === branch) return "旺";
  if (table.fallen === branch) return "陷";
  return "平";
};

/**
 * 命宫（果老式）：「以生时加于太阳所躔之宫，顺数至卯，即命宫也。」
 * 即将生时置于太阳宫，按地支顺序前推，卯所落之宫为命宫。
 * 参数均为地支下标（子=0…亥=11）：太阳宫 `sunPalace`、生时 `hourBranch`。
 *
 * 历史说明：上游脚本此处误用了紫微斗数的「寅起正月顺数至生月、再逆数至生时」
 * （且月取公历月），不是七政四余的命宫口径；本仓已改为果老式。
 */
export const mingPalaceIndex = (sunPalace: number, hourBranch: number) => ((sunPalace - hourBranch + 3) % 12 + 12) % 12;

/** 生时（小时）→ 地支下标。23:00–00:59 为子时。 */
export const hourToBranchIndex = (hour: number) => Math.floor(((hour + 1) % 24) / 2);

/** 以出生时刻推算四余黄经：罗计＝黄白平交点（果老旧法 罗睺=降交点），月孛＝平月远地点。 */
const fourRemainders = (utcMillis: number, moonLongitude: number) => {
  const jd = utcMillis / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545) / 36_525;
  // Meeus 47.7 月球平根：平黄白升交点 Ω、平近地点（月球近地点平黄经）
  const ascendingNode = 125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + (t * t * t) / 467_441;
  const perigee = 83.3532465 + 4069.0137287 * t - 0.01032 * t * t - (t * t * t) / 80_053;
  return [
    { name: "罗睺", longitude: wrap(ascendingNode + 180), note: "果老旧法：罗睺=降交点" },
    { name: "计都", longitude: wrap(ascendingNode), note: "果老旧法：计都=升交点" },
    { name: "月孛", longitude: wrap(perigee + 180), note: "月远地点（Meeus 平根）" },
    { name: "紫气", longitude: wrap(moonLongitude - 90), note: "脚本约定虚星（非经典定义）" },
  ];
};

export const buildQizhengChart = (profile: NormalizedProfileInput): QizhengChart => {
  const astro = buildAstroChart(profile);
  const [date, time] = profile.normalized.datetime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes(profile.normalized.datetime, profile.normalized.timeZone) * 60_000;

  const longitudeOf = (planet: string) => astro.points.find((point) => point.name === planet && point.longitude !== null)?.longitude ?? null;
  const stars: QizhengStar[] = [];
  // 果老式命宫：由「太阳所躔之宫」起生时顺数至卯。太阳黄经由真星历给出，必存在；
  // 万一缺失（理论上不会），退回白羊 0°（戌宫）以免整体偏移。
  const sunLongitude = longitudeOf("太阳");
  const sunPalace = sunLongitude === null ? 10 : longitudeToPalace(sunLongitude);
  const mingIndex = mingPalaceIndex(sunPalace, hourToBranchIndex(hour));
  const palaceNameOf = (palace: number) => TWELVE_PALACES[((palace - mingIndex) % 12 + 12) % 12] as string;

  for (const { name, planet } of SEVEN_LUMINARIES) {
    const longitude = longitudeOf(planet);
    if (longitude === null) continue;
    const palace = longitudeToPalace(longitude);
    const branch = EARTHLY_BRANCHES[palace];
    stars.push({
      name,
      kind: "七政",
      longitude: Number(longitude.toFixed(2)),
      palace,
      branch,
      palaceName: palaceNameOf(palace),
      mansion: longitudeToMansion(longitude),
      dignity: dignityOf(name, branch),
      element: ELEMENT[name] ?? "无",
      fortune: FORTUNE[name] ?? "无",
    });
  }

  const moonLongitude = longitudeOf("月亮") ?? 0;
  for (const remnant of fourRemainders(utcMillis, moonLongitude)) {
    const palace = longitudeToPalace(remnant.longitude);
    const branch = EARTHLY_BRANCHES[palace];
    stars.push({
      name: remnant.name,
      kind: "四余",
      longitude: Number(remnant.longitude.toFixed(2)),
      palace,
      branch,
      palaceName: palaceNameOf(palace),
      mansion: longitudeToMansion(remnant.longitude),
      dignity: "—",
      element: ELEMENT[remnant.name] ?? "无",
      fortune: FORTUNE[remnant.name] ?? "无",
      note: remnant.note,
    });
  }

  const palaces = TWELVE_PALACES.map((name, offset) => {
    const index = (mingIndex + offset) % 12;
    return { name, index, branch: EARTHLY_BRANCHES[index] as string };
  });

  return {
    format: "qmdj-qizheng-chart-v1",
    input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone },
    mingPalace: { index: mingIndex, branch: EARTHLY_BRANCHES[mingIndex] as string },
    palaces,
    stars,
    complete: stars.length > 0,
    disclaimer:
      "研究性七政四余：七政黄经用本仓真星历（celestine）。十二宫按古典十二次配宫（白羊=戌、金牛=酉、双子=申…，已修正上游脚本白羊=寅的错位）。命宫用果老式「以生时加太阳所躔之宫，顺数至卯」（非紫微斗数的生月/生时口径）。罗睺/计都取黄白平交点（果老旧法，罗睺=降交点），月孛取平月远地点（Meeus 47.7）。紫气为上游脚本约定的虚星（月黄经−90°），**并非古典长周期虚星**，仅供对照。二十八宿为等分 360/28 近似（古典宿度不等分，宿界附近可有约 ±10° 偏差），宿名不作判据。不作现实预测或吉凶裁决。",
  };
};
