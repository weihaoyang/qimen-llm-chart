import { calculateChart } from "hd-chart-engine";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { HumanDesignAuthority, HumanDesignChart, HumanDesignDefinition, HumanDesignType } from "./types";

const PLANETS = ["sun", "earth", "moon", "north_node", "south_node", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
const CENTERS = ["头", "阿基那", "喉咙", "G中心", "意志力", "脾", "情绪", "骶骨", "根部"];
/** 动力中心：其中之一连到「喉咙」即为显化型。 */
const MOTOR_CENTERS = ["骶骨", "情绪", "根部", "意志力"];

export const HD_CHANNELS: Array<{ gates: [number, number]; name: string; centers: [string, string] }> = [
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

/** 门 → 所属中心，由通道表推导（每个门只属一个中心）。 */
export const HD_GATE_CENTERS: Record<number, string> = Object.fromEntries(
  HD_CHANNELS.flatMap((channel) => [[channel.gates[0], channel.centers[0]], [channel.gates[1], channel.centers[1]]]),
);

/** Profile → 人生主题角度。 */
const CROSS_BY_PROFILE: Record<string, "右角度" | "并列" | "左角度"> = {
  "1/3": "右角度", "1/4": "右角度", "2/4": "右角度", "2/5": "右角度", "3/5": "右角度", "3/6": "右角度", "4/6": "右角度",
  "4/1": "并列",
  "5/1": "左角度", "5/2": "左角度", "6/2": "左角度", "6/3": "左角度",
};

const toActivation = (value: { g: number; l: number; c: number; t: number; b: number }) => ({ gate: value.g, line: value.l, color: value.c, tone: value.t, base: value.b });

const buildAdjacency = (channels: Array<{ centers: [string, string] }>) => {
  const adjacency = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    adjacency.get(from)?.add(to);
  };
  for (const channel of channels) {
    link(channel.centers[0], channel.centers[1]);
    link(channel.centers[1], channel.centers[0]);
  }
  return adjacency;
};

const reachableFrom = (start: string, adjacency: Map<string, Set<string>>) => {
  const seen = new Set<string>();
  if (!adjacency.has(start)) return seen;
  const queue = [start];
  seen.add(start);
  while (queue.length) {
    const node = queue.shift() as string;
    for (const next of adjacency.get(node) ?? []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen;
};

const countComponents = (defined: Set<string>, adjacency: Map<string, Set<string>>) => {
  const seen = new Set<string>();
  let count = 0;
  for (const start of defined) {
    if (seen.has(start)) continue;
    count += 1;
    seen.add(start);
    const queue = [start];
    while (queue.length) {
      const node = queue.shift() as string;
      for (const next of adjacency.get(node) ?? []) {
        if (defined.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
  }
  return count;
};

const deriveType = (defined: Set<string>, motorReachesThroat: boolean): HumanDesignType => {
  if (defined.size === 0) return "反映者";
  if (defined.has("骶骨")) return motorReachesThroat ? "显示生产者" : "生成者";
  return motorReachesThroat ? "显化者" : "投射者";
};

const deriveAuthority = (type: HumanDesignType, defined: Set<string>, reachesThroat: (center: string) => boolean): HumanDesignAuthority => {
  if (type === "反映者") return "月亮权威";
  if (defined.has("情绪")) return "情绪权威";
  if (defined.has("骶骨")) return "骶骨权威";
  if (defined.has("脾")) return "脾权威";
  if (reachesThroat("意志力")) return "意志力权威";
  if (reachesThroat("G中心")) return "自我投射权威";
  return "环境权威";
};

const deriveDefinition = (defined: Set<string>, adjacency: Map<string, Set<string>>): HumanDesignDefinition => {
  if (defined.size === 0) return "无定义";
  const components = countComponents(defined, adjacency);
  if (components === 1) return "单一";
  if (components === 2) return "二分";
  if (components === 3) return "三分";
  return "四分";
};

export const HD_STRATEGY_BY_TYPE: Record<HumanDesignType, string> = {
  生成者: "等待回应",
  显示生产者: "等待回应，然后告知",
  投射者: "等待邀请",
  反映者: "等待月亮周期",
  显化者: "先行动，再告知",
};

export const buildHumanDesignChart = (profile: NormalizedProfileInput): HumanDesignChart => {
  const latitude = profile.original.location?.latitude ?? null;
  const longitude = profile.original.location?.longitude ?? null;
  const [date, time] = profile.normalized.datetime.split("T");
  // Gate positions are geocentric, so the birth place does not change them. Use
  // the supplied coordinates when present and a neutral origin otherwise.
  const chart = calculateChart({ date, time, lat: latitude ?? 0, lon: longitude ?? 0, tz: profile.normalized.timeZone });

  const activations = Object.fromEntries(PLANETS.map((key) => [key, { personality: toActivation(chart.planets[key].p), design: toActivation(chart.planets[key].d) }]));
  const gates = new Set(Object.values(activations).flatMap((value) => [value.personality.gate, value.design.gate]));
  const channels = HD_CHANNELS.filter((channel) => gates.has(channel.gates[0]) && gates.has(channel.gates[1]));

  const defined = new Set(channels.flatMap((channel) => channel.centers));
  const adjacency = buildAdjacency(channels);
  const fromThroat = reachableFrom("喉咙", adjacency);
  const motorReachesThroat = MOTOR_CENTERS.some((motor) => defined.has(motor) && fromThroat.has(motor));

  const type = deriveType(defined, motorReachesThroat);
  const authority = deriveAuthority(type, defined, (center) => defined.has(center) && fromThroat.has(center));
  const definition = deriveDefinition(defined, adjacency);

  const centers = CENTERS.map((name) => ({
    name,
    defined: defined.has(name),
    gates: [...gates].filter((gate) => HD_GATE_CENTERS[gate] === name).sort((left, right) => left - right),
  }));

  // Profile = 人格太阳行 / 设计太阳行（人格地球与人格太阳同行，不能用作分母）。
  const profileLabel = `${chart.planets.sun.p.l}/${chart.planets.sun.d.l}`;
  const incarnationCrossType = CROSS_BY_PROFILE[profileLabel] ?? null;
  const incarnationCross = `${incarnationCrossType ?? "角度未知"} · 人格太阳/地球 ${chart.planets.sun.p.g}/${chart.planets.earth.p.g} · 设计太阳/地球 ${chart.planets.sun.d.g}/${chart.planets.earth.d.g}`;

  const warning = chart.warnings.length ? " 警告：" + chart.warnings.join("；") : "";
  return {
    format: "qmdj-human-design-v1",
    input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone, latitude, longitude },
    type,
    strategy: HD_STRATEGY_BY_TYPE[type],
    authority,
    profile: profileLabel,
    definition,
    incarnationCross,
    incarnationCrossType,
    centers,
    channels,
    activations,
    precision: chart.precision,
    complete: true,
    disclaimer:
      "研究性人类图：类型、策略、权威、Profile、定义、中心与通道由公开通道映射从 hd-chart-engine 的激活结果推导；行星激活为地心坐标，不依赖出生地；不代表认证排盘、医学或心理诊断。" + warning,
  };
};
