import type { AstroChart } from "./types";
export const serializeAstroToStructuredText = (chart: AstroChart) => [
  "星盘（研究性近似）", `出生资料：${chart.input.datetime} / ${chart.input.timeZone}`,
  `太阳：${chart.sun.sign} ${chart.sun.degree}° · 第${chart.sun.house}宫`,
  `月亮：${chart.moon.sign} ${chart.moon.degree}° · 第${chart.moon.house}宫`,
  `上升：${chart.ascendant.sign} ${chart.ascendant.degree}°`,
  ...chart.points.slice(2).map((point) => `${point.name}：${point.sign} ${point.degree}° · 第${point.house}宫`),
  `边界：${chart.disclaimer}`,
].join("\n");
export const serializeAstroToCompactJson = (chart: AstroChart) => JSON.stringify(chart);
