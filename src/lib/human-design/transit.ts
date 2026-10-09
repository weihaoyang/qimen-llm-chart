/**
 * 流日（Transit）：用与出生盘相同的通道映射，计算「当下」的 13 天体激活，
 * 再与本人盘的门取并集，得出被流日**新激活**的通道与中心。
 * 行星激活为地心坐标，与出生地无关。
 */
import { calculateChart } from "hd-chart-engine";
import { HD_CHANNELS } from "./chart";
import type { HumanDesignActivation, HumanDesignChannel, HumanDesignChart } from "./types";

const PLANETS = ["sun", "earth", "moon", "north_node", "south_node", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

export type HumanDesignTransit = {
  /** 计算时刻（本地时区 ISO 串）。 */
  at: string;
  /** 流日 13 天体激活（仅当下位置）。 */
  activations: Record<string, HumanDesignActivation>;
  gates: number[];
  channels: HumanDesignChannel[];
  centers: string[];
  /** 与本人盘门取并集后的结果。 */
  overlay: {
    gates: number[];
    channels: HumanDesignChannel[];
    centers: string[];
    newChannels: HumanDesignChannel[];
    newCenters: string[];
  };
};

const channelsFor = (gates: Set<number>) => HD_CHANNELS.filter((channel) => gates.has(channel.gates[0]) && gates.has(channel.gates[1]));
const centersOf = (channels: HumanDesignChannel[]) => [...new Set(channels.flatMap((channel) => channel.centers))];
const natalGates = (chart: HumanDesignChart) =>
  new Set(Object.values(chart.activations).flatMap((value) => [value.personality.gate, value.design.gate]));

export const buildHumanDesignTransit = (chart: HumanDesignChart, at: Date): HumanDesignTransit | null => {
  let raw;
  try {
    raw = calculateChart({ date: at.toISOString().slice(0, 10), time: at.toISOString().slice(11, 16), lat: 0, lon: 0, tz: "UTC" });
  } catch {
    return null;
  }

  const activations = Object.fromEntries(PLANETS.map((key) => [key, { gate: raw.planets[key].p.g, line: raw.planets[key].p.l, color: raw.planets[key].p.c, tone: raw.planets[key].p.t, base: raw.planets[key].p.b }]));
  const transitGates = new Set(Object.values(activations).map((value) => value.gate));
  const channels = channelsFor(transitGates);
  const centers = centersOf(channels);

  const union = new Set([...natalGates(chart), ...transitGates]);
  const unionChannels = channelsFor(union);
  const unionCenters = centersOf(unionChannels);
  const natalChannels = new Set(chart.channels.map((channel) => channel.gates.join("-")));
  const natalCenters = new Set(chart.centers.filter((center) => center.defined).map((center) => center.name));

  return {
    at: `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    activations,
    gates: [...transitGates].sort((a, b) => a - b),
    channels,
    centers,
    overlay: {
      gates: [...union].sort((a, b) => a - b),
      channels: unionChannels,
      centers: unionCenters,
      newChannels: unionChannels.filter((channel) => !natalChannels.has(channel.gates.join("-"))),
      newCenters: unionCenters.filter((name) => !natalCenters.has(name)),
    },
  };
};
