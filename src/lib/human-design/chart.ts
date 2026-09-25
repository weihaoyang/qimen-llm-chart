import { calculateChart } from "hd-chart-engine";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { HumanDesignChart } from "./types";

const PLANETS = ["sun", "earth", "moon", "north_node", "south_node", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
const CENTERS = ["头", "阿基那", "喉咙", "G中心", "意志力", "脾", "情绪", "骶骨", "根部"];
const CHANNELS: Array<{ gates: [number, number]; name: string; centers: [string, string] }> = [
  { gates: [1, 8], name: "创意贡献", centers: ["G中心", "喉咙"] }, { gates: [2, 14], name: "脉动", centers: ["G中心", "骶骨"] },
  { gates: [3, 60], name: "突变", centers: ["骶骨", "根部"] }, { gates: [4, 63], name: "逻辑理解", centers: ["阿基那", "头"] },
  { gates: [5, 15], name: "节奏", centers: ["骶骨", "G中心"] }, { gates: [6, 59], name: "亲密", centers: ["情绪", "骶骨"] },
  { gates: [7, 31], name: "领导", centers: ["G中心", "喉咙"] }, { gates: [9, 52], name: "专注", centers: ["骶骨", "根部"] },
  { gates: [10, 20], name: "觉知", centers: ["G中心", "喉咙"] }, { gates: [10, 34], name: "探索", centers: ["G中心", "骶骨"] },
  { gates: [10, 57], name: "完美形式", centers: ["G中心", "脾"] }, { gates: [11, 56], name: "好奇", centers: ["阿基那", "喉咙"] },
  { gates: [12, 22], name: "开放", centers: ["喉咙", "情绪"] }, { gates: [13, 33], name: "浪潮", centers: ["G中心", "喉咙"] },
  { gates: [16, 48], name: "波长", centers: ["喉咙", "脾"] }, { gates: [17, 62], name: "接受", centers: ["阿基那", "喉咙"] },
  { gates: [18, 58], name: "判断", centers: ["脾", "根部"] }, { gates: [19, 49], name: "综合", centers: ["根部", "情绪"] },
  { gates: [20, 34], name: "魅力", centers: ["喉咙", "骶骨"] }, { gates: [20, 57], name: "脑波", centers: ["喉咙", "脾"] },
  { gates: [21, 45], name: "金钱", centers: ["意志力", "喉咙"] }, { gates: [23, 43], name: "结构化", centers: ["喉咙", "阿基那"] },
  { gates: [24, 61], name: "觉察", centers: ["阿基那", "头"] }, { gates: [25, 51], name: "启动", centers: ["G中心", "意志力"] },
  { gates: [26, 44], name: "投降", centers: ["意志力", "脾"] }, { gates: [27, 50], name: "保存", centers: ["骶骨", "脾"] },
  { gates: [28, 38], name: "挣扎", centers: ["脾", "根部"] }, { gates: [29, 46], name: "发现", centers: ["骶骨", "G中心"] },
  { gates: [30, 41], name: "识别", centers: ["情绪", "根部"] }, { gates: [32, 54], name: "转化", centers: ["脾", "根部"] },
  { gates: [34, 57], name: "力量", centers: ["骶骨", "脾"] }, { gates: [35, 36], name: "变动", centers: ["喉咙", "情绪"] },
  { gates: [37, 40], name: "社群", centers: ["情绪", "意志力"] }, { gates: [39, 55], name: "情绪", centers: ["根部", "情绪"] },
  { gates: [42, 53], name: "成熟", centers: ["骶骨", "根部"] }, { gates: [47, 64], name: "抽象", centers: ["阿基那", "头"] },
];
const toActivation = (value: { g: number; l: number; c: number; t: number; b: number }) => ({ gate: value.g, line: value.l, color: value.c, tone: value.t, base: value.b });
const empty = (profile: NormalizedProfileInput): HumanDesignChart => ({ format: "qmdj-human-design-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude: profile.original.location?.latitude ?? null, longitude: profile.original.location?.longitude ?? null }, type: null, strategy: null, authority: null, profile: null, incarnationCross: null, centers: CENTERS.map((name) => ({ name, defined: false, gate: null })), channels: [], activations: {}, precision: null, complete: false, disclaimer: "缺少出生地经纬度，无法完成完整人类图计算。请补充城市或经纬度；类型、权威、人生角色和人生主题不做猜测。" });

export const buildHumanDesignChart = (profile: NormalizedProfileInput): HumanDesignChart => {
  const latitude = profile.original.location?.latitude ?? null;
  const longitude = profile.original.location?.longitude ?? null;
  if (latitude === null || longitude === null) return empty(profile);
  const [date, time] = profile.normalized.datetime.split("T");
  const chart = calculateChart({ date, time, lat: latitude, lon: longitude, tz: profile.normalized.timeZone });
  const activations = Object.fromEntries(PLANETS.map((key) => [key, { personality: toActivation(chart.planets[key].p), design: toActivation(chart.planets[key].d) }]));
  const gates = new Set(Object.values(activations).flatMap((value) => [value.personality.gate, value.design.gate]));
  const channels = CHANNELS.filter((channel) => gates.has(channel.gates[0]) && gates.has(channel.gates[1]));
  const connectedCenters = new Set(channels.flatMap((channel) => channel.centers));
  const centers = CENTERS.map((name) => ({ name, defined: connectedCenters.has(name), gate: null }));
  const type = !connectedCenters.size ? "反映者" : centers.find((center) => center.name === "骶骨")?.defined ? (connectedCenters.has("喉咙") && channels.some((channel) => channel.centers.includes("骶骨") && channel.centers.includes("喉咙")) ? "显示生产者" : "生成者") : connectedCenters.has("喉咙") ? "显化者" : "投射者";
  const authority = type === "反映者" ? "月亮权威" : connectedCenters.has("情绪") ? "情绪权威" : connectedCenters.has("骶骨") ? "骶骨权威" : connectedCenters.has("脾") ? "脾权威" : connectedCenters.has("意志力") ? "意志力权威" : connectedCenters.has("G中心") ? "自我投射" : "环境权威";
  const profileLabel = chart.planets.sun.p.l + "/" + chart.planets.earth.p.l;
  const incarnationCross = "人格太阳/地球 " + chart.planets.sun.p.g + "/" + chart.planets.earth.p.g + " · 设计太阳/地球 " + chart.planets.sun.d.g + "/" + chart.planets.earth.d.g;
  const warning = chart.warnings.length ? " 警告：" + chart.warnings.join("；") : "";
  const strategy = type === "生成者" || type === "显示生产者" ? "等待回应" : type === "投射者" ? "等待邀请" : type === "反映者" ? "等待月亮周期" : "等待告知";
  return { format: "qmdj-human-design-v1", input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude, longitude }, type, strategy, authority, profile: profileLabel, incarnationCross, centers, channels, activations, precision: chart.precision, complete: true, disclaimer: "研究性人类图：类型、策略、权威、Profile、Cross、中心与通道由公开通道映射从 hd-chart-engine 激活结果推导；不代表认证排盘、医学或心理诊断。" + warning };
};
