import type { VedicChart } from "./chart";
import { VARGA_DEFINITIONS } from "./data";
import { formatRashiDegree } from "./format";

const fmt = (value: number, digits = 3) => Number(value.toFixed(digits));
export const serializeVedicToStructuredText = (chart: VedicChart) => {
  const lagnaLine = chart.lagna
    ? `上升（Lagna）：${chart.lagna.rashi.zh}${chart.lagna.rashi.iast} ${formatRashiDegree(chart.lagna.degreeInRashi)} · 宿 ${chart.lagna.nakshatra.name} 第 ${chart.lagna.nakshatra.pada} 足（宿主 ${chart.lagna.nakshatra.lordZh}）`
    : chart.input.locationIssue === "pole" ? "上升（Lagna）：未计算（地理极点）" : "上升（Lagna）：未计算（缺少出生地）";
  return [
    "吠陀占星 · 分盘（Vedic / Shodashavarga）",
    `时刻：${chart.input.datetime}（${chart.input.timeZone}）· 儒略日 ${chart.input.julianDay} · Lahiri 岁差 ${fmt(chart.ayanamsa, 4)}°`,
    `罗睺 / 计都口径：${chart.nodes[chart.nodeMode].label}`,
    lagnaLine,
    "",
    "九曜（恒星黄经 / 宫 / 宿）：",
    ...chart.grahas.map((graha) => `- ${graha.zh}${graha.iast}${graha.abbr}：${graha.longitude}°（${graha.rashi.zh}${formatRashiDegree(graha.degreeInRashi)}）· 宿 ${graha.nakshatra.index} ${graha.nakshatra.name} 第 ${graha.nakshatra.pada} 足（宿主 ${graha.nakshatra.lordZh}）${graha.retrograde ? " · 逆行" : ""}`),
    "",
    "十六分盘（各曜落宫）：",
    ...VARGA_DEFINITIONS.map((definition) => {
      const row = chart.vargas.find((varga) => varga.code === definition.code);
      const lagna = row?.lagnaRashi ? `命宫 ${row.lagnaRashi} · ` : "";
      return `- ${definition.code} ${definition.iast}（${definition.zh}）：${lagna}${chart.grahas.map((graha) => `${graha.abbr}=${row?.positions[graha.id] ?? "—"}`).join(" ")}`;
    }),
    "",
    `Vargottama（D1 与 D9 同宫）：${chart.vargottama.length ? chart.vargottama.join("、") : "无"}`,
    "",
    `边界：${chart.disclaimer}`,
  ].join("\n");
};

export const serializeVedicToCompactJson = (chart: VedicChart) =>
  JSON.stringify({
    format: "qmdj-vedic-v1",
    input: chart.input,
    ayanamsa: chart.ayanamsa,
    nodeMode: chart.nodeMode,
    nodeLongitudes: { mean: chart.nodes.mean.rahu.longitude, true: chart.nodes.true.rahu.longitude },
    lagna: chart.lagna ? [chart.lagna.longitude, chart.lagna.rasi, chart.lagna.nakshatra.index, chart.lagna.nakshatra.pada] : null,
    grahas: chart.grahas.map((graha) => [graha.id, graha.longitude, graha.rasi, graha.degreeInRashi, graha.nakshatra.index, graha.nakshatra.pada, graha.nakshatra.lord, graha.retrograde ? 1 : 0]),
    vargas: chart.vargas.map((varga) => [varga.code, varga.lagnaRashi, chart.grahas.map((graha) => varga.positions[graha.id])]),
    vargottama: chart.vargottama,
    boundary: `Lahiri 岁差；罗睺/计都取${chart.nodes[chart.nodeMode].label}。分盘按 Parashara 十六分盘。仅研究用，不作预测。`,
  });
