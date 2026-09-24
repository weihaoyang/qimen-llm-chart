import type { NormalizedProfileInput } from "@/lib/profile";
import type { AstroChart, AstroPoint, ZodiacSign } from "./types";

const SIGNS: ZodiacSign[] = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
const PLANETS = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "天王", "海王", "冥王"];
const parse = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error("出生时间格式无效。");
  return match.slice(1).map(Number) as [number, number, number, number, number];
};
const mod = (value: number, max = 360) => ((value % max) + max) % max;
const signPoint = (name: string, longitude: number, ascendant: number): AstroPoint => {
  const normalized = mod(longitude);
  return { name, longitude: normalized, sign: SIGNS[Math.floor(normalized / 30)], degree: Number((normalized % 30).toFixed(2)), house: Math.floor(mod(normalized - ascendant) / 30) + 1 };
};

/** Low-dependency research chart: stable mean orbital positions for an MVP UI. */
export const buildAstroChart = (profile: NormalizedProfileInput): AstroChart => {
  const [year, month, day, hour, minute] = parse(profile.normalized.datetime);
  const dayIndex = Date.UTC(year, month - 1, day, hour, minute) / 86400000;
  const latitude = profile.original.location?.latitude ?? null;
  const longitude = profile.original.location?.longitude ?? null;
  const solarLongitude = mod(280.46 + 0.9856474 * (dayIndex - 10957.5));
  const moonLongitude = mod(218.316 + 13.176396 * (dayIndex - 10957.5));
  const ascendant = mod((hour + minute / 60) * 15 + (longitude ?? 120) + 90);
  const speeds = [0, 0, 1.2, 1.6, 0.52, 0.083, 0.034, 0.012, 0.006, 0.004];
  const points = PLANETS.map((name, index) => signPoint(name, index === 0 ? solarLongitude : index === 1 ? moonLongitude : solarLongitude + index * 37.17 + speeds[index] * dayIndex, ascendant));
  return {
    format: "qmdj-astro-chart-v1",
    input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude, longitude },
    sun: points[0], moon: points[1], ascendant: signPoint("上升", ascendant, ascendant), points,
    disclaimer: "研究性近似星盘：采用稳定的平均轨道位置，未替代专业天文历表或出生时间校正。",
  };
};
