import type { HumanDesignChart } from "./types";
export const serializeHumanDesignToStructuredText = (chart: HumanDesignChart) => [
  "人类图（研究性 MVP）", `出生资料：${chart.input.datetime} / ${chart.input.timeZone}`, `类型：${chart.type}`, `策略：${chart.strategy}`, `内在权威：${chart.authority}`, `人生角色：${chart.profile}`, `人生主题：${chart.incarnationCross}`, `中心：${chart.centers.map((center) => `${center.name}${center.defined ? "定义" : "开放"}（${center.gate}）`).join("、")}`, `边界：${chart.disclaimer}`,
].join("\n");
export const serializeHumanDesignToCompactJson = (chart: HumanDesignChart) => JSON.stringify(chart);
