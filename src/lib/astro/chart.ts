import { calculateChart } from "celestine";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { AstroChart, AstroAspect, AstroPoint, AstroPattern, AstroHouseCusp, AstroLot, ZodiacSign } from "./types";

const SIGNS: ZodiacSign[] = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
const EN_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const PLANET_NAMES: Record<string, string> = {
  Sun: "太阳",
  Moon: "月亮",
  Mercury: "水星",
  Venus: "金星",
  Mars: "火星",
  Jupiter: "木星",
  Saturn: "土星",
  Uranus: "天王",
  Neptune: "海王",
  Pluto: "冥王",
  // 小行星与凯龙（celestine 默认一并计算，本仓不再丢弃）
  Chiron: "凯龙星",
  Ceres: "谷神星",
  Pallas: "智神星",
  Juno: "婚神星",
  Vesta: "灶神星",
  // 黄白交点与莉莉丝（celestine 的 nodes / lilith 列表）
  "True North Node": "北交点",
  "True South Node": "南交点",
  "Mean North Node": "北交点（平）",
  "Mean South Node": "南交点（平）",
  "Mean Lilith": "莉莉丝",
  "True Lilith": "莉莉丝（真）",
};
const parse = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error("出生时间格式无效。");
  return match.slice(1).map(Number) as [number, number, number, number, number];
};
export const offsetMinutes = (datetime: string, timeZone: string) => {
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

/**
 * 阿拉伯点中文名。仅映射 celestine 已经算出的 lot，不自行新增定义：
 * celestine 只给出两个阿拉伯点，公式与昼夜（sect）判定在库内完成
 * （dist/index.js:8670-8704）——
 *   福点 Part of Fortune：昼 ASC + Moon − Sun；夜 ASC + Sun − Moon
 *   精神点 Part of Spirit：取福点的反式
 * 「sect / 昼夜」由太阳与上升的相对位置判定（dist/index.js:8533-8541），
 * 与本仓的出生地输入无关地由库给出。
 * 名称取通行中译：福点（别称财富点／幸运点）、精神点（别称灵点）。
 */
const LOT_META: Record<string, { key: string; name: string; latin: string; alias: string }> = {
  "Part of Fortune": { key: "fortune", name: "福点", latin: "Part of Fortune", alias: "财富点／幸运点" },
  "Part of Spirit": { key: "spirit", name: "精神点", latin: "Part of Spirit", alias: "灵点／灵魂点" },
};

export const buildAstroChart = (profile: NormalizedProfileInput): AstroChart => {
  const [year, month, day, hour, minute] = parse(profile.normalized.datetime);
  const latitude = profile.original.location?.latitude ?? null;
  const longitude = profile.original.location?.longitude ?? null;
  const hasPlace = latitude !== null && longitude !== null;
  const input = { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude, longitude };

  // Planets and their aspects are geocentric, so the birth place never changes
  // them; only the ascendant, midheaven and house cusps depend on it. Compute
  // with a neutral origin and leave just the place-dependent fields absent when
  // no location was given.
  const chart = calculateChart({ year, month, day, hour, minute, second: 0, timezone: offsetMinutes(profile.normalized.datetime, profile.normalized.timeZone) / 60, latitude: latitude ?? 0, longitude: longitude ?? 0 });

  const toPoint = (planet: { name: string; longitude: number; signName: string; house?: number }): AstroPoint => {
    const signIndex = EN_SIGNS.indexOf(planet.signName);
    return { name: PLANET_NAMES[planet.name] ?? planet.name, longitude: Number(planet.longitude.toFixed(6)), sign: SIGNS[signIndex] ?? "未知", degree: Number((planet.longitude % 30).toFixed(2)), house: hasPlace ? planet.house ?? null : null };
  };
  // 交点与莉莉丝不在 chart.planets 内，但 celestine 已在同一坐标系下算出，
  // 且与行星之间已有相位；一并纳入 points，避免「相位与图形丢一半」的简化。
  const nodeLike = [
    // 交点：celestine 的 name 只有 "North/South Node"，需拼上 type。
    ...chart.nodes.map((node) => ({ name: `${node.type} ${node.name}`, longitude: node.longitude, signName: node.signName, house: node.house })),
    // 莉莉丝：celestine 的 name 已含 "Mean/True" 前缀（aspect 里也如此），不能再拼 type。
    ...chart.lilith.map((item) => ({ name: item.name, longitude: item.longitude, signName: item.signName, house: item.house })),
  ];
  const points = [...chart.planets, ...nodeLike].filter((planet) => PLANET_NAMES[planet.name]).map(toPoint);
  const ascendant = hasPlace ? toPoint({ name: "上升", longitude: chart.angles.ascendant.longitude, signName: chart.angles.ascendant.signName }) : emptyPoint("上升");
  const angles = hasPlace
    ? {
        ascendant,
        midheaven: toPoint({ name: "中天", longitude: chart.angles.midheaven.longitude, signName: chart.angles.midheaven.signName }),
        descendant: toPoint({ name: "下降", longitude: chart.angles.descendant.longitude, signName: chart.angles.descendant.signName }),
        imumCoeli: toPoint({ name: "天底", longitude: chart.angles.imumCoeli.longitude, signName: chart.angles.imumCoeli.signName }),
      }
    : { ascendant: emptyPoint("上升"), midheaven: emptyPoint("中天"), descendant: emptyPoint("下降"), imumCoeli: emptyPoint("天底") };

  const aspects: AstroAspect[] = chart.aspects.all
    .filter((aspect) => PLANET_NAMES[aspect.body1] && PLANET_NAMES[aspect.body2])
    .map((aspect) => ({ body1: PLANET_NAMES[aspect.body1] ?? aspect.body1, body2: PLANET_NAMES[aspect.body2] ?? aspect.body2, type: aspect.type, symbol: aspect.symbol, separation: Number(aspect.separation.toFixed(2)), deviation: Number(aspect.deviation.toFixed(2)), strength: aspect.strength, isApplying: aspect.isApplying }));
  const patterns: AstroPattern[] = chart.patterns
    .filter((pattern) => pattern.bodies.every((body) => PLANET_NAMES[body]))
    .map((pattern) => ({ type: pattern.type, bodies: pattern.bodies.map((body) => PLANET_NAMES[body] ?? body), description: pattern.description }));
  const houses: AstroHouseCusp[] = hasPlace ? chart.houses.cusps.map((cusp) => ({ house: cusp.house, longitude: Number(cusp.longitude.toFixed(6)), sign: SIGNS[cusp.sign] ?? "未知", degree: Number((cusp.longitude % 30).toFixed(2)) })) : [];
  const extremeLatitude = hasPlace && latitude !== null && Math.abs(latitude) > 66;
  const houseSystem = hasPlace
    ? extremeLatitude
      ? "Placidus（celestine 默认；高纬约 |φ|>66° 时库内会自动回退，本页宫位可能为回退结果）"
      : "Placidus（celestine 默认宫制，本仓未改）"
    : "—（未提供出生地，宫位未计算）";
  const aspectSummary = hasPlace
    ? chart.aspects.summary
    : aspects.reduce<Record<string, number>>((acc, aspect) => ({ ...acc, [aspect.type]: (acc[aspect.type] ?? 0) + 1 }), {});
  // 阿拉伯点由上升点参与计算（ASC ± Sun/Moon），未提供出生地时上升点是占位值，
  // 因而此时不输出 lots（与 angles / houses 同一处理原则）。
  const lots: AstroLot[] = hasPlace
    ? chart.lots
        .filter((lot) => LOT_META[lot.name])
        .map((lot) => {
          const meta = LOT_META[lot.name];
          const signIndex = EN_SIGNS.indexOf(lot.signName);
          return {
            key: meta.key,
            name: meta.name,
            latin: meta.latin,
            alias: meta.alias,
            formula: lot.formula,
            sect: chart.calculated.isDaytime ? ("昼" as const) : ("夜" as const),
            longitude: Number(lot.longitude.toFixed(6)),
            sign: SIGNS[signIndex] ?? "未知",
            degree: Number((lot.longitude % 30).toFixed(2)),
            house: lot.house ?? null,
          };
        })
    : [];

  return {
    format: "qmdj-astro-chart-v1",
    input,
    sun: points.find((point) => point.name === "太阳") ?? emptyPoint("太阳"),
    moon: points.find((point) => point.name === "月亮") ?? emptyPoint("月亮"),
    ascendant,
    points,
    angles,
    houses,
    houseSystem,
    lots,
    aspects,
    aspectSummary,
    patterns,
    complete: hasPlace,
    disclaimer: hasPlace
      ? `研究性星盘：行星、小行星（谷神/智神/婚神/灶神/凯龙）、黄白交点、莉莉丝、宫位、四轴、相位与模式由 Celestine 天文计算引擎生成；宫制：${houseSystem}。阿拉伯点（${lots.map((lot) => lot.name).join("、") || "无"}）为古典／现代占星通行计算点（非天体），按 Celestine 的昼夜（sect）公式取值（福点昼 = ASC + Moon − Sun，夜 = ASC + Sun − Moon；精神点取反），本盘判定为${chart.calculated.isDaytime ? "昼盘" : "夜盘"}。不含恒星。结果不替代专业天文历表校核或现实决策，也不表示任何预测。`
      : "行星、小行星、交点、莉莉丝与相位按地心坐标计算，不依赖出生地；上升、中天、宫位与阿拉伯点（福点、精神点）需要上升点，当前未计算。请补充城市或经纬度后查看四轴、宫位与阿拉伯点。",
  };
};
