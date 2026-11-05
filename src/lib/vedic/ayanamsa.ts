/**
 * Lahiri（Chitrapaksha）岁差与 UT→TT 修正。
 *
 * 移植自 MIT 许可的 `vedic-panchanga`（(c) ravipathak3001）：
 *   https://github.com/ravipathak3001/vedic-panchang
 *   `src/ayanamsa.ts`（J2000 起算的岁差多项式 + 各体系 J2000 基准值）
 *   `src/astro/julian.ts`（deltaT / jdToJDE）
 * 本仓只采用 lahiri 体系；其余体系（raman / kp / fagan_bradley）保留基准值以便扩展。
 */

import { ephemeris } from "celestine";

const J2000 = 2451545;
const ARCSEC = 1 / 3600;

export const julianCenturies = (jd: number) => (jd - J2000) / 36525;
export const decimalYear = (jd: number) => 2000 + (jd - J2000) / 365.25;

/** ΔT（秒），Espenak–Meeus 分段式。https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html */
export const deltaSeconds = (jd: number) => {
  const y = decimalYear(jd);
  if (y >= 2005 && y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (y >= 1986 && y < 2005) {
    const t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  if (y >= 1961 && y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718;
  }
  if (y >= 1941 && y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547;
  }
  if (y >= 1920 && y < 1941) {
    const t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t * t * t;
  }
  if (y >= 1900 && y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t ** 4;
  }
  if (y >= 2050 && y < 2150) {
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  }
  if (y >= 1860 && y < 1900) {
    const t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  }
  if (y >= 1800 && y < 1860) {
    const t = y - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
      + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  }
  if (y >= 1700 && y < 1800) {
    const t = y - 1700;
    return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  }
  if (y >= 1600 && y < 1700) {
    const t = y - 1600;
    return 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129;
  }
  if (y >= 500 && y < 1600) {
    const u = (y - 1000) / 100;
    return 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3
      - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  }
  if (y >= -500 && y < 500) {
    const u = y / 100;
    return 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3
      - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
};

export const jdToJDE = (jdUT: number) => jdUT + deltaSeconds(jdUT) / 86400;

/** J2000.0 时的岁差基准（度）。 */
export const AYANAMSA_AT_J2000: Record<string, number> = {
  // IAE Lahiri at J2000 TT, without nutation (Swiss Ephemeris SIDM_LAHIRI).
  lahiri: 23.8570923254552,
  raman: 22.478545,
  kp: 23.716038,
  fagan_bradley: 24.736133,
};

const accumulatedPrecession = (jde: number) => {
  const t = julianCenturies(jde);
  const arcsec = 5028.796195 * t + 1.1054348 * t * t + 0.00007964 * t ** 3 - 0.000023857 * t ** 4 - 0.000000383 * t ** 5;
  return arcsec * ARCSEC;
};

/** 岁差（ayanamsa）角度，默认 Lahiri。 */
export const ayanamsa = (jdUT: number, system: keyof typeof AYANAMSA_AT_J2000 = "lahiri") =>
  AYANAMSA_AT_J2000[system] + accumulatedPrecession(jdToJDE(jdUT));

/**
 * 平交点（mean node）的黄经（当日黄道、回归口径）。
 * 与 `vedic-kundali` 的 `meanNodeLongitude` 一致，用于罗睺 / 计都。
 */
export const meanNodeLongitude = (jde: number) => {
  const t = julianCenturies(jde);
  const value = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + t * t * t / 450000;
  return ((value % 360) + 360) % 360;
};

/**
 * 真交点（true node）的黄经（当日黄道、回归口径）。
 *
 * 星盘共用经修订的 celestine 实现，以月球位置及速度求瞬时轨道面与黄道的升交点。
 * 该函数以 TT（JDE）为自变量，故与 `meanNodeLongitude` 一样传入 `jdToJDE(jd)`。
 */
export const trueNodeLongitude = (jde: number) => {
  const value = ephemeris.getTrueNodeLongitude(jde) % 360;
  return value < 0 ? value + 360 : value;
};

/** 罗睺 / 计都的口径：平交点或真交点。 */
export type NodeMode = "mean" | "true";

export const NODE_MODE_LABELS: Record<NodeMode, string> = { mean: "平交点（Mean Node）", true: "真交点（True Node）" };

/** 按口径取北交点黄经；计都为其中点 180°。 */
export const nodeLongitude = (jde: number, mode: NodeMode = "mean") =>
  mode === "true" ? trueNodeLongitude(jde) : meanNodeLongitude(jde);
