import { FRACTALS, MASS_PRESETS } from "./data";
import { hologramDemo, holographicReport, type HologramDemo, type HolographicReport } from "./holography";

export type AkashaSettings = { massKg: number; sourceCount: number; fragment: number };

export type AkashaChart = {
  format: "qmdj-akasha-v1";
  input: AkashaSettings;
  holographic: HolographicReport;
  demo: HologramDemo;
  table: Array<{ label: string; massKg: number; schwarzschildRadiusM: number; bits: number; entropyJK: number; areaVsVolume: number }>;
  fractals: Array<{ zh: string; dimension: number; copies: number; ratio: number }>;
  disclaimer: string;
};

/** 点源位置：在 [-0.45, 0.45] 上等距分布（确定性）。 */
export const sourcePositions = (count: number) => {
  const n = Math.max(1, Math.min(9, Math.round(count)));
  if (n === 1) return [0];
  return Array.from({ length: n }, (_, index) => Number((-0.45 + (0.9 * index) / (n - 1)).toFixed(4)));
};

export const buildAkashaChart = (settings: AkashaSettings): AkashaChart => {
  const massKg = settings.massKg > 0 && Number.isFinite(settings.massKg) ? settings.massKg : 1;
  const fragment = Math.max(0.05, Math.min(1, settings.fragment));
  const holographic = holographicReport(massKg, 1);
  const demo = hologramDemo(sourcePositions(settings.sourceCount), fragment);
  return {
    format: "qmdj-akasha-v1",
    input: { massKg, sourceCount: settings.sourceCount, fragment },
    holographic,
    demo,
    table: MASS_PRESETS.map((preset) => {
      const report = holographicReport(preset.massKg);
      return { label: preset.label, massKg: preset.massKg, schwarzschildRadiusM: report.schwarzschildRadiusM, bits: report.bits, entropyJK: report.entropyJK, areaVsVolume: report.areaVsVolume };
    }),
    fractals: FRACTALS.map((fractal) => ({ zh: fractal.zh, dimension: Number(fractal.dimension.toFixed(6)), copies: fractal.copies, ratio: fractal.ratio })),
    disclaimer:
      "本页分两部分，性质不同：① 全息部分是**可计算的物理**（面积律信息量 S=k_B·A/(4l_P²)、贝肯斯坦界、全息图碎片重建的傅里叶演示、自相似分形维数），按教科书标准式计算，可复核。② 阿卡西记录**不是可计算体系**，本仓不提供任何「读取」，只整理该概念的来源、分期、被记载的实践做法与伦理边界。两者在流行文献中常被类比，本仓明确标注「类比 ≠ 物理结论」。全息演示使用归一化坐标与理想点源，仅用于说明「碎片可重建全体、分辨率随碎片下降」，不对应真实光学系统。",
  };
};

export { MASS_PRESETS };
