/**
 * 分盘（varga）换算规则。
 *
 * 移植自 MIT 许可的 `vedic-kundali`（(c) ravipathak3001）`src/astro/varga.ts`：
 *   https://github.com/ravipathak3001/vedic-panchang
 * 规则本身出自古典占星文献（Parashara 体系的十六分盘），属公共领域内容；
 * 此处只做 TypeScript 改写与命名整理。
 *
 * 约定：所有入参使用 0 基索引（0 = 白羊 / Mesha）。
 * 「阳/阴宫」以 1 基序数为准：白羊（0 基 0）为阳宫。
 */

import { VARGA_CODES } from "./data";

const isOddSign = (rashi0: number) => rashi0 % 2 === 0;

const MOVABLE = new Set([0, 3, 6, 9]);
const FIXED = new Set([1, 4, 7, 10]);
const FIRE = new Set([0, 4, 8]);
const EARTH = new Set([1, 5, 9]);
const AIR = new Set([2, 6, 10]);

const modalityStart = (rashi0: number, movableStart: number, fixedStart: number, dualStart: number) => {
  if (MOVABLE.has(rashi0)) return movableStart;
  if (FIXED.has(rashi0)) return fixedStart;
  return dualStart;
};

const elementStart = (rashi0: number, fireStart: number, earthStart: number, airStart: number, waterStart: number) => {
  if (FIRE.has(rashi0)) return fireStart;
  if (EARTH.has(rashi0)) return earthStart;
  if (AIR.has(rashi0)) return airStart;
  return waterStart;
};

const step = (start: number, part: number) => (start + part) % 12;

const partIndex = (degreeInRashi: number, divisions: number) => {
  const index = Math.floor(degreeInRashi / (30 / divisions));
  return index >= divisions ? divisions - 1 : index;
};

/** D30 Trimsamsa 的阳/阴宫分段表（上界，目标宫 0 基）。 */
const TRIMSAMSA_ODD: Array<[number, number]> = [
  [5, 0],
  [10, 10],
  [18, 8],
  [25, 2],
  [30, 6],
];
const TRIMSAMSA_EVEN: Array<[number, number]> = [
  [5, 1],
  [12, 5],
  [20, 11],
  [25, 9],
  [30, 7],
];

const trimsamsaSign = (rashi0: number, degreeInRashi: number) => {
  const table = isOddSign(rashi0) ? TRIMSAMSA_ODD : TRIMSAMSA_EVEN;
  for (const [upTo, sign] of table) {
    if (degreeInRashi < upTo) return sign;
  }
  return table[table.length - 1][1];
};

/** 分盘宫位：返回 1 基宫序（1 = 白羊 / Mesha）。 */
export const vargaSign = (rashi1: number, degreeInRashi: number, code: string): number => {
  if (!VARGA_CODES.includes(code)) return rashi1;
  const r0 = rashi1 - 1;
  const d = degreeInRashi;
  switch (code) {
    case "D1":
      return r0 + 1;
    case "D2": {
      // 阳宫：前半（太阳时）→ 狮子，后半（月亮时）→ 巨蟹；阴宫相反。
      const firstHalf = d < 15;
      const sunHora = isOddSign(r0) === firstHalf;
      return (sunHora ? 4 : 3) + 1;
    }
    case "D3":
      return step(r0, partIndex(d, 3) * 4) + 1;
    case "D4":
      return step(r0, partIndex(d, 4) * 3) + 1;
    case "D7":
      return step(isOddSign(r0) ? r0 : step(r0, 6), partIndex(d, 7)) + 1;
    case "D9":
      return ((r0 * 9 + partIndex(d, 9)) % 12) + 1;
    case "D10":
      return step(isOddSign(r0) ? r0 : step(r0, 8), partIndex(d, 10)) + 1;
    case "D12":
      return step(r0, partIndex(d, 12)) + 1;
    case "D16":
      return step(modalityStart(r0, 0, 4, 8), partIndex(d, 16)) + 1;
    case "D20":
      return step(modalityStart(r0, 0, 8, 4), partIndex(d, 20)) + 1;
    case "D24":
      return step(isOddSign(r0) ? 4 : 3, partIndex(d, 24)) + 1;
    case "D27":
      return step(elementStart(r0, 0, 3, 6, 9), partIndex(d, 27)) + 1;
    case "D30":
      return trimsamsaSign(r0, d) + 1;
    case "D40":
      return step(isOddSign(r0) ? 0 : 6, partIndex(d, 40)) + 1;
    case "D45":
      return step(modalityStart(r0, 0, 4, 8), partIndex(d, 45)) + 1;
    case "D60":
      return step(isOddSign(r0) ? r0 : step(r0, 6), partIndex(d, 60)) + 1;
    default:
      return r0 + 1;
  }
};
