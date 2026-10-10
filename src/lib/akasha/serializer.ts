import type { AkashaChart } from "./chart";
import { AKASHA_CONCEPTS, AKASHA_ETHICS, AKASHA_PROTOCOL, AKASHA_TIMELINE, ANALOGY_NOTES, HOLOGRAM_CONCEPTS } from "./data";

const fix = (value: number, digits = 6) => Number(value.toFixed(digits));

export const serializeAkashaToStructuredText = (chart: AkashaChart) => {
  const h = chart.holographic;
  const d = chart.demo;
  return [
    "阿卡西记录（知识/边界）与全息宇宙模型（可算物理）",
    `输入：质量 ${h.massKg} kg · 点源 ${chart.input.sourceCount} · 碎片比例 ${chart.input.fragment}`,
    "",
    "【全息物理（可算）】",
    `史瓦西半径 ${fix(h.schwarzschildRadiusM)} m · 视界面积 ${fix(h.horizonAreaM2)} m²`,
    `面积律信息量 ${h.bits.toExponential(6)} 比特（= 每 4 个普朗克面积 1 比特）· 熵 ${h.entropyJK.toExponential(6)} J/K`,
    `体积律对照（1 比特/普朗克体积）${h.volumeBits.toExponential(6)} 比特 → 面积律比体积律小 ${h.areaVsVolume.toExponential(3)} 倍`,
    h.bekensteinBits
      ? `贝肯斯坦界（R=1 m，E=mc²）${h.bekensteinBits.toExponential(6)} 比特 = ${(h.bekensteinBits / Math.LN2).toExponential(6)} nat（S/k_B）`
      : "",
    "",
    `碎片重建演示：碎片占比 ${d.usableFraction}（分辨率 ≈ ×${d.resolution}）· 与整幅重建的相关系数 ${d.correlation}`,
    `整幅重建峰：${d.peaksFull.map((peak) => `x=${peak.x}(${peak.value})`).join("、")}`,
    `碎片重建峰：${d.peaksFragment.map((peak) => `x=${peak.x}(${peak.value})`).join("、")}`,
    "结论：碎片仍重建出全部点源位置，但峰变宽、幅值下降——即「部分含整体」在全息记录上的确切含义。",
    "",
    "典型质量对照：",
    ...chart.table.map((row) => `- ${row.label}：r_s ${row.schwarzschildRadiusM.toExponential(3)} m · ${row.bits.toExponential(3)} 比特 · ${row.entropyJK.toExponential(3)} J/K`),
    "",
    "自相似分形维数（D = log(份数)/log(比例)）：",
    ...chart.fractals.map((row) => `- ${row.zh}：${row.copies} 份 × 1/${row.ratio} → D = ${row.dimension}`),
    "",
    "【阿卡西记录（知识条目 · 本仓不提供读取）】",
    ...AKASHA_CONCEPTS.map((entry) => `- ${entry.zh}（${entry.term}）｜${entry.tradition}｜${entry.period}：${entry.note}`),
    "",
    `被记载的实践步骤（描述性）：${AKASHA_PROTOCOL.map((step) => step.step).join(" → ")}`,
    `伦理边界：${AKASHA_ETHICS.join("；")}`,
    `时间线：${AKASHA_TIMELINE.map(([year, note]) => `${year} ${note}`).join("；")}`,
    "",
    "【全息宇宙概念与可算性】",
    ...HOLOGRAM_CONCEPTS.map((entry) => `- ${entry.zh}（${entry.term}）｜${entry.period}｜${entry.computed}：${entry.note}`),
    `类比提示：${ANALOGY_NOTES.join(" ")}`,
    "",
    `边界：${chart.disclaimer}`,
  ].filter(Boolean).join("\n");
};

export const serializeAkashaToCompactJson = (chart: AkashaChart) =>
  JSON.stringify({
    format: "qmdj-akasha-v1",
    input: chart.input,
    holographic: [
      chart.holographic.massKg,
      fix(chart.holographic.schwarzschildRadiusM),
      fix(chart.holographic.horizonAreaM2),
      chart.holographic.bits,
      chart.holographic.entropyJK,
      chart.holographic.volumeBits,
      chart.holographic.areaVsVolume,
    ],
    demo: {
      sources: chart.demo.sources,
      fragmentRatio: chart.demo.usableFraction,
      resolution: chart.demo.resolution,
      correlation: chart.demo.correlation,
      peaksFull: chart.demo.peaksFull,
      peaksFragment: chart.demo.peaksFragment,
      full: chart.demo.full,
      fragment: chart.demo.fragment,
    },
    table: chart.table.map((row) => [row.label, row.massKg, fix(row.schwarzschildRadiusM), row.bits]),
    fractals: chart.fractals.map((row) => [row.zh, row.dimension]),
    akasha: {
      concepts: AKASHA_CONCEPTS.map((entry) => [entry.term, entry.zh, entry.period]),
      protocol: AKASHA_PROTOCOL.map((step) => step.step),
      ethics: AKASHA_ETHICS,
    },
    boundary: "全息部分为可算物理；阿卡西部分为知识条目，本仓不提供读取；二者的类比不等于物理结论。",
  });
