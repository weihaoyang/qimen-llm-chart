import type { HumanDesignChart } from "./types";
export const serializeHumanDesignToStructuredText = (chart: HumanDesignChart) => [
  "人类图（研究性计算）", `出生资料：${chart.input.datetime} / ${chart.input.timeZone}`,
  `状态：${chart.complete ? "13 个天体的两侧激活已计算" : "缺少出生地经纬度，未完成计算"}`,
  `类型：${chart.type ?? "待推导"} · 策略：${chart.strategy ?? "待推导"} · 权威：${chart.authority ?? "待推导"} · Profile：${chart.profile ?? "待推导"}`,
  `中心：${chart.centers.filter((center) => center.defined).map((center) => center.name).join("、") || "暂无"}`,
  `通道：${chart.channels.map((channel) => channel.gates.join("-") + " " + channel.name).join("、") || "暂无"}`,
  ...Object.entries(chart.activations).map(([name, activation]) => `${name}：人格 ${activation.personality.gate}.${activation.personality.line} / 设计 ${activation.design.gate}.${activation.design.line}`),
  `边界：${chart.disclaimer}`,
].join("\n");
export const serializeHumanDesignToCompactJson = (chart: HumanDesignChart) => JSON.stringify(chart);
