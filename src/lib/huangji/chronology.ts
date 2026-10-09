/**
 * 皇极经世 · 元会运世纪年（邵雍体系）。
 *
 * 本文件是 MIT 许可项目 `Ryanlyly-ai/huangji-jingshi` 算法核心的忠实移植与改写，
 * 保留其纪元（公元前 67017 年 = 甲子）、无公元 0 年、层级坐标与干支标签约定。
 *
 * MIT License — Copyright (c) 2026 Huangji Jingshi contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions: the above copyright notice and this
 * permission notice shall be included in all copies or substantial portions of the
 * Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

export const YEARS_PER_SHI = 30;
export const SHI_PER_YUN = 12;
export const YUN_PER_HUI = 30;
export const HUI_PER_YUAN = 12;
export const YEARS_PER_YUN = YEARS_PER_SHI * SHI_PER_YUN;
export const YEARS_PER_HUI = YEARS_PER_YUN * YUN_PER_HUI;
export const YEARS_PER_YUAN = YEARS_PER_HUI * HUI_PER_YUAN;

/** 第一元第一年：公元前 67017 年（由传世本历史锚点反推）。 */
export const EPOCH_BCE_YEAR = 67_017;
/** 天文纪年（公元前 1 年为 0）。 */
export const EPOCH_ASTRONOMICAL_YEAR = 1 - EPOCH_BCE_YEAR;

export const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export type Era = "BCE" | "CE";
export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];
export type HistoricalYear = { era: Era; year: number };

export type HuangjiChronology = {
  format: "qmdj-huangji-chronology-v1";
  input: HistoricalYear;
  displayYear: string;
  astronomicalYear: number;
  ordinalFromEpoch: number;
  yuan: { number: number; stem: HeavenlyStem; year: number };
  hui: { number: number; branch: EarthlyBranch; year: number };
  yun: { number: number; numberWithinHui: number; stem: HeavenlyStem; year: number };
  shi: { number: number; numberWithinHui: number; numberWithinYun: number; branch: EarthlyBranch; year: number };
  sexagenaryYear: { index: number; stem: HeavenlyStem; branch: EarthlyBranch; name: string };
  disclaimer: string;
};

const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;
const itemAt = <T,>(items: readonly T[], index: number) => items[mod(index, items.length)] as T;

const assertPositiveInteger = (value: number, name: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name}必须是正的安全整数`);
};

export const toAstronomicalYear = (input: HistoricalYear) => {
  if (input.era !== "BCE" && input.era !== "CE") throw new TypeError("era 必须是 BCE 或 CE");
  assertPositiveInteger(input.year, "year");
  return input.era === "BCE" ? 1 - input.year : input.year;
};

export const fromAstronomicalYear = (astronomicalYear: number): HistoricalYear => {
  if (!Number.isSafeInteger(astronomicalYear)) throw new RangeError("天文纪年必须是安全整数");
  const result: HistoricalYear = astronomicalYear <= 0 ? { era: "BCE", year: 1 - astronomicalYear } : { era: "CE", year: astronomicalYear };
  assertPositiveInteger(result.year, "转换后的历史年份");
  return result;
};

export const formatHistoricalYear = (input: HistoricalYear) => {
  toAstronomicalYear(input);
  return input.era === "BCE" ? `公元前${input.year}年` : `公元${input.year}年`;
};

/** 解析 `2026`、`公元2026年`、`-87`、`公元前87年` 等写法。 */
export const parseHistoricalYear = (raw: string): HistoricalYear => {
  const text = raw.trim().replace(/\s+/g, " ");
  const signed = /^([+-]?\d+)$/.exec(text);
  if (signed) {
    const value = Number(signed[1]);
    if (value === 0) throw new RangeError("历史纪年不存在公元 0 年");
    assertPositiveInteger(Math.abs(value), "year");
    return value < 0 ? { era: "BCE", year: -value } : { era: "CE", year: value };
  }
  const bce = /^(?:公元前|前|BCE|BC)\s*(\d+)\s*年?$/i.exec(text);
  if (bce) {
    const year = Number(bce[1]);
    assertPositiveInteger(year, "year");
    return { era: "BCE", year };
  }
  const ce = /^(?:公元|CE|AD)\s*(\d+)\s*年?$/i.exec(text);
  if (ce) {
    const year = Number(ce[1]);
    assertPositiveInteger(year, "year");
    return { era: "CE", year };
  }
  throw new TypeError(`无法识别年份：${raw}`);
};

export const calculateHuangjiChronology = (input: HistoricalYear): HuangjiChronology => {
  const astronomicalYear = toAstronomicalYear(input);
  const offset = astronomicalYear - EPOCH_ASTRONOMICAL_YEAR;
  const ordinalFromEpoch = offset + 1;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(ordinalFromEpoch)) {
    throw new RangeError("该年份与纪元起点的距离超出安全整数范围");
  }

  const yuanZeroBased = Math.floor(offset / YEARS_PER_YUAN);
  const yearZeroBasedInYuan = mod(offset, YEARS_PER_YUAN);
  const yuanNumber = yuanZeroBased + 1;

  const huiZeroBased = Math.floor(yearZeroBasedInYuan / YEARS_PER_HUI);
  const yearZeroBasedInHui = yearZeroBasedInYuan % YEARS_PER_HUI;

  const yunZeroBased = Math.floor(yearZeroBasedInYuan / YEARS_PER_YUN);
  const yunZeroBasedInHui = Math.floor(yearZeroBasedInHui / YEARS_PER_YUN);
  const yearZeroBasedInYun = yearZeroBasedInYuan % YEARS_PER_YUN;

  const shiZeroBased = Math.floor(yearZeroBasedInYuan / YEARS_PER_SHI);
  const shiZeroBasedInHui = Math.floor(yearZeroBasedInHui / YEARS_PER_SHI);
  const shiZeroBasedInYun = Math.floor(yearZeroBasedInYun / YEARS_PER_SHI);
  const yearZeroBasedInShi = yearZeroBasedInYuan % YEARS_PER_SHI;

  const sexagenaryIndex = mod(offset, 60);
  const sexagenaryStem = itemAt(HEAVENLY_STEMS, sexagenaryIndex);
  const sexagenaryBranch = itemAt(EARTHLY_BRANCHES, sexagenaryIndex);

  return {
    format: "qmdj-huangji-chronology-v1",
    input: { ...input },
    displayYear: formatHistoricalYear(input),
    astronomicalYear,
    ordinalFromEpoch,
    yuan: { number: yuanNumber, stem: itemAt(HEAVENLY_STEMS, yuanNumber - 1), year: yearZeroBasedInYuan + 1 },
    hui: { number: huiZeroBased + 1, branch: itemAt(EARTHLY_BRANCHES, huiZeroBased), year: yearZeroBasedInHui + 1 },
    yun: { number: yunZeroBased + 1, numberWithinHui: yunZeroBasedInHui + 1, stem: itemAt(HEAVENLY_STEMS, yunZeroBased), year: yearZeroBasedInYun + 1 },
    shi: { number: shiZeroBased + 1, numberWithinHui: shiZeroBasedInHui + 1, numberWithinYun: shiZeroBasedInYun + 1, branch: itemAt(EARTHLY_BRANCHES, shiZeroBased), year: yearZeroBasedInShi + 1 },
    sexagenaryYear: { index: sexagenaryIndex + 1, stem: sexagenaryStem, branch: sexagenaryBranch, name: `${sexagenaryStem}${sexagenaryBranch}` },
    disclaimer: "研究性纪年换算：一元 = 12 会 = 360 运 = 4320 世 = 129600 年，纪元取公元前 67017 年为甲子（由传世本历史锚点反推），无公元 0 年。只做层级坐标与干支标签换算，不推演治乱、朝代或现实事件。",
  };
};
