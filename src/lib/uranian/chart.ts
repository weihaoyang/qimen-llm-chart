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
  heliocentric: number;
  distance: number;
  zodiac: ZodiacPosition;
  dial90: number;
  dial45: number;
  dial90Label: string;
};

export type UranianChart = {
  format: "qmdj-uranian-v1";
  input: { datetime: string; timeZone: string; julianDay: number; hasPlace: boolean };
  settings: DialSettings;
  bodies: DialBody[];
  tnps: TnpRow[];
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
    heliocentric: position.heliocentric,
    distance: position.distance,
    zodiac: toZodiac(position.longitude),
    dial90: dialPosition(position.longitude, 90),
    dial45: dialPosition(position.longitude, 45),
    dial90Label: formatDial(dialPosition(position.longitude, 90)),
  }));

  const tnpBodies: DialBody[] = tnps.map((row) => ({ id: `tnp:${row.id}`, name: `${row.nameZh}${row.name}`, glyph: row.code, longitude: row.longitude, kind: "tnp" as const }));

  const bodies: DialBody[] = [...planetBodies(astro), ...angleBodies(astro), ...tnpBodies];

  return {
    format: "qmdj-uranian-v1",
    input: { datetime, timeZone, julianDay: Number(julianDay.toFixed(6)), hasPlace: astro.complete },
    settings,
    bodies,
    tnps,
    midpoints: findMidpointStructures(bodies, settings).slice(0, 60),
    sums: findSumStructures(bodies, settings).slice(0, 60),
    differences: findDifferenceStructures(bodies, settings).slice(0, 60),
    equations: findEquationStructures(bodies, settings),
    disclaimer: astro.complete
      ? "汉堡学派研究盘：真实行星与四轴由 Celestine 生成；八虚星（Cupido…Poseidon）按 Neely/Matrix 要素与开普勒解算得到地心黄经（移植自 GPL 的 Astrolog）。盘面与中点、行星图景的容许度为研究设定，不构成预测或现实裁决。"
      : "汉堡学派研究盘：真实行星由 Celestine 生成；八虚星按 Neely/Matrix 要素解算。当前无出生地，未含上升与中天。盘面与中点、行星图景的容许度为研究设定，不构成预测或现实裁决。",
  };
};
