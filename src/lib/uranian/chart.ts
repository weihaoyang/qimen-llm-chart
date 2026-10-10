import { offsetMinutes } from "@/lib/astro/chart";
import type { AstroChart } from "@/lib/astro/types";
import type { NormalizedProfileInput } from "@/lib/profile";
import {
  DEFAULT_DIAL,
  dialPosition,
  findDifferenceStructures,
  findEquationStructures,
  findMidpointStructures,
  findSumStructures,
  formatDial,
  type DialBody,
  type DialSettings,
  type DifferenceStructure,
  type EquationStructure,
  type MidpointStructure,
  type SumStructure,
} from "./dial";
import { uranianPositions } from "./elements";

const SIGNS = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];

const PLANET_SHORT: Record<string, string> = { 太阳: "☉", 月亮: "☽", 水星: "☿", 金星: "♀", 火星: "♂", 木星: "♃", 土星: "♄", 天王: "♅", 海王: "♆", 冥王: "♇", 上升: "AC", 中天: "MC" };
const TNP_SHORT: Record<string, string> = { cupido: "CU", hades: "HA", zeus: "ZE", kronos: "KR", apollon: "AP", admetos: "AD", vulkanus: "VU", poseidon: "PO" };

export const julianDayFromProfile = (datetime: string, timeZone: string) => {
  const [date, time] = datetime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes(datetime, timeZone) * 60000;
  return 2440587.5 + utcMillis / 86400000;
};

export type ZodiacPosition = { sign: string; degree: number; label: string };

export const toZodiac = (longitude: number): ZodiacPosition => {
  const value = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(value / 30);
  const degree = value - signIndex * 30;
  const whole = Math.floor(degree);
  const minute = Math.round((degree - whole) * 60);
  return { sign: SIGNS[signIndex], degree: Number(degree.toFixed(2)), label: `${SIGNS[signIndex]} ${whole}°${String(minute).padStart(2, "0")}′` };
};

export type TnpRow = {
  id: string;
  name: string;
  nameZh: string;
  code: string;
  principles: string[];
  longitude: number;
  /** 未做 aber 更正的地心几何黄经（度）。 */
  geometricLongitude: number;
  /** Astrolog 口径的 aber 更正量（度，≈0.006° 量级）。 */
  aberration: number;
  heliocentric: number;
  distance: number;
  zodiac: ZodiacPosition;
  dial90: number;
  dial45: number;
  dial90Label: string;
  /** 按当前盘面 modulus 投影的位置与标签（90/45/22.5 盘随之变化）。 */
  dial: number;
  dialLabel: string;
};

/** 结构列表在界面/载荷中的展示上限：中点、和点、差点各自最多列这么多条。 */
export const STRUCTURE_DISPLAY_LIMIT = 60;
/** 和点等式（A+B = C+D）的展示上限：组合数增长更快，另设较小上限。 */
export const EQUATION_DISPLAY_LIMIT = 40;

export type UranianChart = {
  format: "qmdj-uranian-v1";
  input: { datetime: string; timeZone: string; julianDay: number; hasPlace: boolean };
  settings: DialSettings;
  bodies: DialBody[];
  tnps: TnpRow[];
  /** 结构检索命中总数（未截断）。 */
  totals: { midpoints: number; sums: number; differences: number; equations: number };
  /** 展示上限：列表只列前 limits 条。 */
  limits: { structures: number; equations: number };
  midpoints: MidpointStructure[];
  sums: SumStructure[];
  differences: DifferenceStructure[];
  equations: EquationStructure[];
  disclaimer: string;
};

const planetBodies = (astro: AstroChart): DialBody[] =>
  astro.points
    .filter((point) => point.longitude !== null)
    .map((point) => ({ id: `planet:${point.name}`, name: point.name, glyph: PLANET_SHORT[point.name] ?? point.name, longitude: point.longitude as number, kind: "planet" as const }));

const angleBodies = (astro: AstroChart): DialBody[] => {
  if (!astro.complete) return [];
  return [astro.angles.ascendant, astro.angles.midheaven]
    .filter((point) => point.longitude !== null)
    .map((point) => ({ id: `angle:${point.name}`, name: point.name, glyph: PLANET_SHORT[point.name] ?? point.name, longitude: point.longitude as number, kind: "angle" as const }));
};

export const buildUranianChart = (profile: NormalizedProfileInput, astro: AstroChart, settings: DialSettings = DEFAULT_DIAL): UranianChart => {
  const datetime = profile.normalized.datetime;
  const timeZone = profile.normalized.timeZone;
  const julianDay = julianDayFromProfile(datetime, timeZone);

  const tnps: TnpRow[] = uranianPositions(julianDay).map((position) => ({
    id: position.id,
    name: position.name,
    nameZh: position.nameZh,
    code: TNP_SHORT[position.id] ?? position.name.slice(0, 2).toUpperCase(),
    principles: position.principles,
    longitude: position.longitude,
    geometricLongitude: position.geometricLongitude,
    aberration: position.aberration,
    heliocentric: position.heliocentric,
    distance: position.distance,
    zodiac: toZodiac(position.longitude),
    dial90: dialPosition(position.longitude, 90),
    dial45: dialPosition(position.longitude, 45),
    dial90Label: formatDial(dialPosition(position.longitude, 90)),
    dial: dialPosition(position.longitude, settings.modulus),
    dialLabel: formatDial(dialPosition(position.longitude, settings.modulus)),
  }));

  const tnpBodies: DialBody[] = tnps.map((row) => ({ id: `tnp:${row.id}`, name: `${row.nameZh}${row.name}`, glyph: row.code, longitude: row.longitude, kind: "tnp" as const }));

  const bodies: DialBody[] = [...planetBodies(astro), ...angleBodies(astro), ...tnpBodies];

  // 结构检索全部按 settings.modulus 重算（dial.ts 的 find* 系列都接受 modulus），
  // 界面只在展示层截断：结果数会随盘面（90/45/22.5）与容许度迅速膨胀，
  // 全量渲染会淹没 UI，故保留 slice，并把总数与上限如实写进载荷。
  const allMidpoints = findMidpointStructures(bodies, settings);
  const allSums = findSumStructures(bodies, settings);
  const allDifferences = findDifferenceStructures(bodies, settings);
  const allEquations = findEquationStructures(bodies, settings, Number.MAX_SAFE_INTEGER);

  return {
    format: "qmdj-uranian-v1",
    input: { datetime, timeZone, julianDay: Number(julianDay.toFixed(6)), hasPlace: astro.complete },
    settings,
    bodies,
    tnps,
    totals: {
      midpoints: allMidpoints.length,
      sums: allSums.length,
      differences: allDifferences.length,
      equations: allEquations.length,
    },
    limits: { structures: STRUCTURE_DISPLAY_LIMIT, equations: EQUATION_DISPLAY_LIMIT },
    midpoints: allMidpoints.slice(0, STRUCTURE_DISPLAY_LIMIT),
    sums: allSums.slice(0, STRUCTURE_DISPLAY_LIMIT),
    differences: allDifferences.slice(0, STRUCTURE_DISPLAY_LIMIT),
    equations: allEquations.slice(0, EQUATION_DISPLAY_LIMIT),
    disclaimer: astro.complete
      ? "汉堡学派研究盘：真实行星与四轴由 Celestine 生成；八虚星（Cupido…Poseidon）按 Neely/Matrix 要素与开普勒解算得到地心黄经（移植自 GPL 的 Astrolog），并按 Astrolog matrix.cpp:640 的同口径 aber 项（光行时 × 地心黄经日变化，本盘约 0.006° 量级）更正。盘面与中点、行星图景的容许度为研究设定，不构成预测或现实裁决。"
      : "汉堡学派研究盘：真实行星由 Celestine 生成；八虚星按 Neely/Matrix 要素解算，并按 Astrolog 同口径的 aber 项更正。当前无出生地，未含上升与中天。盘面与中点、行星图景的容许度为研究设定，不构成预测或现实裁决。",
  };
};
