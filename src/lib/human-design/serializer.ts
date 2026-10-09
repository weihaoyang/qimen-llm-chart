import type { HumanDesignChart } from "./types";

export const serializeHumanDesignToStructuredText = (chart: HumanDesignChart) => [
  "人类图（研究性计算）",
  `出生资料：${chart.input.datetime} / ${chart.input.timeZone}`,
  `状态：${chart.complete ? "13 个天体的两侧激活已计算（行星为地心坐标，不依赖出生地）" : "未完成计算"}`,
  `类型：${chart.type ?? "待推导"} · 策略：${chart.strategy ?? "待推导"} · 权威：${chart.authority ?? "待推导"}`,
  `Profile：${chart.profile ?? "待推导"} · 定义：${chart.definition ?? "待推导"} · 人生主题角度：${chart.incarnationCrossType ?? "待推导"}`,
  `人生主题（十字）：${chart.incarnationCross ?? "待推导"}`,
  `中心：${chart.centers.map((center) => `${center.name}${center.defined ? "已定义" : "开放"}${center.gates.length ? `(${center.gates.join("/")})` : ""}`).join("、")}`,
  `已定义中心：${chart.centers.filter((center) => center.defined).map((center) => center.name).join("、") || "无"}`,
  `通道（${chart.channels.length}）：${chart.channels.map((channel) => `${channel.gates.join("-")} ${channel.name}`).join("、") || "无"}`,
  ...Object.entries(chart.activations).map(([name, activation]) => `${name}：人格 ${activation.personality.gate}.${activation.personality.line} / 设计 ${activation.design.gate}.${activation.design.line}`),
  `精度：gate=${chart.precision?.gate ?? "无"} · line=${chart.precision?.line ?? "无"}`,
  `边界：${chart.disclaimer}`,
].join("\n");

export const serializeHumanDesignToCompactJson = (chart: HumanDesignChart) => JSON.stringify(chart);
