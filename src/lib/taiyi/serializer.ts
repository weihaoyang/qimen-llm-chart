import type { TaiyiChart } from "./chart";
import { DEITIES, GENERALS, PALACES, PATTERNS } from "./data";

export const serializeTaiyiToStructuredText = (chart: TaiyiChart) => [
  "太乙神数（三式之首 · 岁计）",
  `年份：${chart.input.year} · 元六纪周期 ${chart.input.cycle} · ${chart.input.dun}${chart.input.derived ? "（入局数为推算）" : "（入局数为手工覆盖）"}`,
  `积年 ${chart.accumulation.jiyear} → 入纪元数 ${chart.accumulation.eraRemainder} → 入局数 ${chart.accumulation.ruJu}`,
  `太乙：第 ${chart.taiyi.palace} 宫（${chart.taiyi.trigram}，${chart.taiyi.element}），本周内第 ${chart.taiyi.block} 个三年`,
  `天目（文昌）：${chart.tianMu.position} ${chart.tianMu.deity.name}${chart.tianMu.palace ? `（第 ${chart.tianMu.palace} 宫）` : "（间神）"}`,
  `计神：${chart.jiShen.position} ${chart.jiShen.deity.name}`,
  `始击（客目）：${chart.shiJi.position} ${chart.shiJi.deity.name}${chart.shiJi.palace ? `（第 ${chart.shiJi.palace} 宫）` : "（间神）"}`,
  "",
  `主算 ${chart.counts.host}（${chart.counts.hostLength}）→ 主大将第 ${chart.counts.hostGeneralPalace} 宫`,
  `客算 ${chart.counts.guest}（${chart.counts.guestLength}）→ 客大将第 ${chart.counts.guestGeneralPalace} 宫`,
  `和否：${chart.counts.harmony}`,
  `格局：${chart.patterns.length ? chart.patterns.join("；") : "未见六格所列格局"}`,
  "",
  "十六神：",
  ...DEITIES.map((deity) => `- ${deity.position} ${deity.name}（${deity.month}）：${deity.meaning}`),
  "",
  "八将：",
  ...GENERALS.map((general) => `- ${general.name}（${general.alias}·${general.element}）：${general.rule}`),
  "",
  "格局条目：",
  ...PATTERNS.map((pattern) => `- ${pattern.name}：${pattern.rule} —— ${pattern.meaning}`),
  "",
  `边界：${chart.disclaimer}`,
].join("\n");

export const serializeTaiyiToCompactJson = (chart: TaiyiChart) =>
  JSON.stringify({
    format: "qmdj-taiyi-v1",
    input: chart.input,
    accumulation: chart.accumulation,
    taiyi: [chart.taiyi.palace, chart.taiyi.trigram, chart.taiyi.position, chart.taiyi.element],
    tianMu: [chart.tianMu.position, chart.tianMu.deity.name, chart.tianMu.palace],
    jiShen: [chart.jiShen.position, chart.jiShen.deity.name],
    shiJi: [chart.shiJi.position, chart.shiJi.deity.name, chart.shiJi.palace],
    counts: chart.counts,
    patterns: chart.patterns,
    deities: DEITIES.map((deity) => [deity.position, deity.name, deity.meaning]),
    palaces: PALACES.map((palace) => [palace.palace, palace.trigram, palace.element, palace.gate]),
    generals: GENERALS.map((general) => [general.name, general.element, general.rule]),
    boundary: "按公共领域古籍《太乙金镜式经》《太乙全书》一系规则；元六纪周期与阳阴遁有异说，界面可覆盖。仅供研究。",
  });
