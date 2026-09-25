import { calculateChart } from "hd-chart-engine";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { HumanDesignChart } from "./types";

const PLANETS = ["sun", "earth", "moon", "north_node", "south_node", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
const CENTERS = ["头", "阿基那", "喉咙", "G中心", "意志力", "脾", "情绪", "骶骨", "根部"];
const toActivation = (value: { g: number; l: number; c: number; t: number; b: number }) => ({ gate: value.g, line: value.l, color: value.c, tone: value.t, base: value.b });
const empty = (profile: NormalizedProfileInput): HumanDesignChart => ({ format: "qmdj-human-design-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude: profile.original.location?.latitude ?? null, longitude: profile.original.location?.longitude ?? null }, type: null, strategy: null, authority: null, profile: null, incarnationCross: null, centers: CENTERS.map((name) => ({ name, defined: false, gate: null })), activations: {}, precision: null, complete: false, disclaimer: "缺少出生地经纬度，无法完成完整人类图计算。请补充城市或经纬度；类型、权威、人生角色和人生主题不做猜测。" });

export const buildHumanDesignChart = (profile: NormalizedProfileInput): HumanDesignChart => {
  const latitude = profile.original.location?.latitude ?? null;
  const longitude = profile.original.location?.longitude ?? null;
  if (latitude === null || longitude === null) return empty(profile);
  const [date, time] = profile.normalized.datetime.split("T");
  const chart = calculateChart({ date, time, lat: latitude, lon: longitude, tz: profile.normalized.timeZone });
  const activations = Object.fromEntries(PLANETS.map((key) => [key, { personality: toActivation(chart.planets[key].p), design: toActivation(chart.planets[key].d) }]));
  const warning = chart.warnings.length ? " 警告：" + chart.warnings.join("；") : "";
  return { format: "qmdj-human-design-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude, longitude }, type: null, strategy: null, authority: null, profile: null, incarnationCross: null, centers: [], activations, precision: chart.precision, complete: true, disclaimer: "研究性人类图：由 hd-chart-engine (" + chart.engine + ") 计算人格/设计两侧 13 个天体的闸门、线、色彩、基调和底色。中心、类型、权威、人生角色与人生主题尚未在本产品中推导，不作伪造。" + warning };
};
