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

/** 黄经 → 宫位索引（MIT 脚本口径：寅宫为 0 索引起点）。 */
export const longitudeToPalace = (longitude: number) => Math.floor(wrap(longitude + 60) / 30) % 12;
/** 黄经 → 二十八宿（按等分 360/28，MIT 脚本口径）。 */
export const longitudeToMansion = (longitude: number) => TWENTY_EIGHT_MANSIONS[Math.floor(wrap(longitude) / (360 / 28)) % 28];

const dignityOf = (name: string, branch: string) => {
  const table = DIGNITY[name];
  if (!table) return "—";
  if (table.temple === branch) return "庙";
  if (table.prosperous === branch) return "旺";
  if (table.fallen === branch) return "陷";
  return "平";
};

/** 命宫（MIT 脚本口径：寅起正月顺数至生月，再逆数至生时）。 */
export const mingPalaceIndex = (month: number, hour: number) => {
  const base = (2 + month - 1) % 12;
  const hourIndex = Math.floor(((hour + 1) % 24) / 2);
  return ((base - hourIndex) % 12 + 12) % 12;
};

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
  const mingIndex = mingPalaceIndex(month, hour);
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
    disclaimer: "研究性七政四余：七政黄经用本仓真星历（celestine）；罗睺/计都取黄白平交点（默认为果老旧法，罗睺=降交点），月孛取平月远地点（Meeus 47.7），紫气为脚本约定的虚星（非经典定义）；十二宫与二十八宿按等分口径（移植自 MIT 项目 dglijin-oss/chinese-metaphysics-skills）。不作现实预测或吉凶裁决。",
  };
};
