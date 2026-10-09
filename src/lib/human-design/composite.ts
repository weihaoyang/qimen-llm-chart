/**
 * 合图（Composite）：把两人的 13 天体激活取并集，再走与本人盘相同的通道/中心推导，
 * 用来观察关系里「共同激活」的结构；`newChannels/newCenters` 相对本人盘。
 * 行星激活为地心坐标，与出生地无关。
 */
import { deriveHumanDesignDesign } from "./chart";
import type { HumanDesignAuthority, HumanDesignChannel, HumanDesignChart, HumanDesignDefinition, HumanDesignType } from "./types";

export type HumanDesignComposite = {
  gates: number[];
  channels: HumanDesignChannel[];
  centers: string[];
  type: HumanDesignType;
  authority: HumanDesignAuthority;
  definition: HumanDesignDefinition;
  /** 相对本人盘新增（由对方带来）的通道与中心。 */
  newChannels: HumanDesignChannel[];
  newCenters: string[];
};

export const humanDesignGates = (chart: HumanDesignChart) =>
  new Set(Object.values(chart.activations).flatMap((value) => [value.personality.gate, value.design.gate]));

export const buildHumanDesignComposite = (self: HumanDesignChart, partner: HumanDesignChart): HumanDesignComposite => {
  const union = new Set([...humanDesignGates(self), ...humanDesignGates(partner)]);
  const design = deriveHumanDesignDesign(union);
  const centers = [...design.defined];
  const selfChannels = new Set(self.channels.map((channel) => channel.gates.join("-")));
  const selfCenters = new Set(self.centers.filter((center) => center.defined).map((center) => center.name));

  return {
    gates: [...union].sort((left, right) => left - right),
    channels: design.channels,
    centers,
    type: design.type,
    authority: design.authority,
    definition: design.definition,
    newChannels: design.channels.filter((channel) => !selfChannels.has(channel.gates.join("-"))),
    newCenters: centers.filter((name) => !selfCenters.has(name)),
  };
};
