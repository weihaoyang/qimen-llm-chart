import type { HarmonicChart } from "./chart";

export const serializeHarmonicToStructuredText = (chart: HarmonicChart) =>
  [
    `谐波占星（第 ${chart.harmonic} 谐波）`,
    `约定：h = (黄经 × ${chart.harmonic}) mod 360；合相容许度 ${chart.orb}°`,
    ...chart.points.map((point) => `${point.name}：母盘 ${point.natalLongitude.toFixed(2)}° → 谐波 ${point.sign} ${point.degree}°`),
    ...chart.angles.map((point) => `${point.name}：母盘 ${point.natalLongitude.toFixed(2)}° → 谐波 ${point.sign} ${point.degree}°`),
    `谐波合相（≤${chart.orb}°）：${chart.conjunctions.map((item) => `${item.a}/${item.b} ${item.harmonicOrb}°（母盘 ${item.natalAngle}° ±${item.natalOrb}°）`).join("、") || "无"}`,
    `边界：${chart.disclaimer}`,
  ].join("\n");

export const serializeHarmonicToCompactJson = (chart: HarmonicChart) => JSON.stringify(chart);
