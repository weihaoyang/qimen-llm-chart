import type { AstroChart } from "./types";
export const serializeAstroToStructuredText = (chart: AstroChart) => [
  "星盘（研究性计算）", `出生资料：${chart.input.datetime} / ${chart.input.timeZone}`,
  ...(chart.complete ? [] : ["状态：缺少出生地经纬度，星盘未完成；以下落点不可解读。"]),
  `太阳：${chart.sun.sign} ${chart.sun.degree}° · 第${chart.sun.house}宫`,
  `月亮：${chart.moon.sign} ${chart.moon.degree}° · 第${chart.moon.house}宫`,
  `上升：${chart.ascendant.sign} ${chart.ascendant.degree}°`,
  ...chart.points.slice(2).map((point) => `${point.name}：${point.sign} ${point.degree}° · 第${point.house}宫`),
  `相位：${chart.aspects.slice(0, 8).map((aspect) => `${aspect.symbol}${aspect.body1}/${aspect.body2} ${aspect.strength}%`).join("、") || "暂无"}`,
  `模式：${chart.patterns.map((pattern) => pattern.type).join("、") || "暂无"}`,
  `边界：${chart.disclaimer}`,
].join("\n");
export const serializeAstroToCompactJson = (chart: AstroChart) => JSON.stringify(chart);
