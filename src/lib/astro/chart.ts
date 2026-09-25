import { calculateChart } from "celestine";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { AstroChart, AstroAspect, AstroPoint, AstroPattern, AstroHouseCusp, ZodiacSign } from "./types";

const SIGNS: ZodiacSign[] = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
const EN_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const PLANET_NAMES: Record<string, string> = { Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星", Uranus: "天王", Neptune: "海王", Pluto: "冥王" };
const parse = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error("出生时间格式无效。");
  return match.slice(1).map(Number) as [number, number, number, number, number];
};
const offsetMinutes = (datetime: string, timeZone: string) => {
  const [date, time] = datetime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(utc));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return Math.round((localAsUtc - utc) / 60000);
};
const emptyPoint = (name: string): AstroPoint => ({ name, longitude: null, sign: "未知", degree: null, house: null });

export const buildAstroChart = (profile: NormalizedProfileInput): AstroChart => {
  const [year, month, day, hour, minute] = parse(profile.normalized.datetime);
  const latitude = profile.original.location?.latitude ?? null;
  const longitude = profile.original.location?.longitude ?? null;
  const input = { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude, longitude };
  if (latitude === null || longitude === null) {
    return { format: "qmdj-astro-chart-v1", input, sun: emptyPoint("太阳"), moon: emptyPoint("月亮"), ascendant: emptyPoint("上升"), points: [], angles: { ascendant: emptyPoint("上升"), midheaven: emptyPoint("中天"), descendant: emptyPoint("下降"), imumCoeli: emptyPoint("天底") }, houses: [], aspects: [], aspectSummary: {}, patterns: [], complete: false, disclaimer: "缺少出生地经纬度，无法完成宫位与上升点计算。请补充城市或经纬度；当前不使用默认坐标。" };
  }
  const chart = calculateChart({ year, month, day, hour, minute, second: 0, timezone: offsetMinutes(profile.normalized.datetime, profile.normalized.timeZone) / 60, latitude, longitude });
  const toPoint = (planet: { name: string; longitude: number; signName: string; house?: number }): AstroPoint => {
    const signIndex = EN_SIGNS.indexOf(planet.signName);
    return { name: PLANET_NAMES[planet.name] ?? planet.name, longitude: Number(planet.longitude.toFixed(6)), sign: SIGNS[signIndex] ?? "未知", degree: Number((planet.longitude % 30).toFixed(2)), house: planet.house ?? null };
  };
  const points = chart.planets.filter((planet) => PLANET_NAMES[planet.name]).map(toPoint);
  const asc = chart.angles.ascendant;
  const ascendant = toPoint({ name: "上升", longitude: asc.longitude, signName: asc.signName });
  const angles = { ascendant, midheaven: toPoint({ name: "中天", longitude: chart.angles.midheaven.longitude, signName: chart.angles.midheaven.signName }), descendant: toPoint({ name: "下降", longitude: chart.angles.descendant.longitude, signName: chart.angles.descendant.signName }), imumCoeli: toPoint({ name: "天底", longitude: chart.angles.imumCoeli.longitude, signName: chart.angles.imumCoeli.signName }) };
  const aspects: AstroAspect[] = chart.aspects.all.map((aspect) => ({ body1: PLANET_NAMES[aspect.body1] ?? aspect.body1, body2: PLANET_NAMES[aspect.body2] ?? aspect.body2, type: aspect.type, symbol: aspect.symbol, separation: Number(aspect.separation.toFixed(2)), deviation: Number(aspect.deviation.toFixed(2)), strength: aspect.strength, isApplying: aspect.isApplying }));
  const patterns: AstroPattern[] = chart.patterns.map((pattern) => ({ type: pattern.type, bodies: pattern.bodies.map((body) => PLANET_NAMES[body] ?? body), description: pattern.description }));
  const houses: AstroHouseCusp[] = chart.houses.cusps.map((cusp) => ({ house: cusp.house, longitude: Number(cusp.longitude.toFixed(6)), sign: SIGNS[cusp.sign] ?? "未知", degree: Number((cusp.longitude % 30).toFixed(2)) }));
  return { format: "qmdj-astro-chart-v1", input, sun: points.find((point) => point.name === "太阳") ?? emptyPoint("太阳"), moon: points.find((point) => point.name === "月亮") ?? emptyPoint("月亮"), ascendant, points, angles, houses, aspects, aspectSummary: chart.aspects.summary, patterns, complete: true, disclaimer: "研究性星盘：行星、宫位、四轴、相位与模式由 Celestine 天文计算引擎生成；结果不替代专业天文历表校核或现实决策。" };
};
