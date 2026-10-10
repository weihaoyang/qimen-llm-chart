import type { TaiyiChart } from "./chart";
import { DEITIES, GENERALS, PALACES, PATTERNS } from "./data";

export const serializeTaiyiToStructuredText = (chart: TaiyiChart) => [
  "太乙神数（三式之首 · 岁计）",
  `年份：${chart.input.year} · 元六纪周期 ${chart.input.cycle} · ${chart.input.dun}${chart.input.dunDefaulted ? "（遁未选定，暂按阳遁）" : "（遁为人工选定）"}${chart.input.derived ? " · 入局数为推算" : " · 入局数为手工覆盖"}`,
  `积年 ${chart.accumulation.jiyear} → 入纪元数 ${chart.accumulation.eraRemainder} → 入局数 ${chart.accumulation.ruJu}`,
  `太乙：第 ${chart.taiyi.palace} 宫（${chart.taiyi.trigram}，${chart.taiyi.element}），本周内第 ${chart.taiyi.block} 个三年`,
  `天目（文昌·下目·主）：${chart.tianMu.position} ${chart.tianMu.deity.name}${chart.tianMu.palace ? `（第 ${chart.tianMu.palace} 宫·正宫）` : "（间神）"}`,
  `计神：${chart.jiShen.position} ${chart.jiShen.deity.name}`,
  `始击（客目·上目·客）：${chart.shiJi.position} ${chart.shiJi.deity.name}${chart.shiJi.palace ? `（第 ${chart.shiJi.palace} 宫·正宫）` : "（间神）"}`,
  "",
  `主算 ${chart.counts.host}（${chart.counts.hostParity}）→ 主大将第 ${chart.counts.hostGeneralPalace} 宫 · 主参将第 ${chart.counts.hostSuPalace} 宫`,
  `客算 ${chart.counts.guest}（${chart.counts.guestParity}）→ 客大将第 ${chart.counts.guestGeneralPalace} 宫 · 客参将第 ${chart.counts.guestSuPalace} 宫`,
  `和数：主算${chart.counts.hostHarmonyLevel} · 客算${chart.counts.guestHarmonyLevel}（另一系清单，**出处待考**：主算${chart.counts.hostHarmonyLevelVariant} · 客算${chart.counts.guestHarmonyLevelVariant}）`,
  `和否：本仓不输出和／不和与长／短判词（卷二判据含太乙宫、二目所立、算奇偶等多维，且两书局注矛盾）`,
  `格局：${chart.patterns.length ? chart.patterns.join("；") : "未见所列格局"}`,
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
    boundary: "按公共领域古籍《太乙金镜式经》（唐·王希明，四库全书本）与《太乙秘書》局注排盘；遁须人工选定（古籍阳局/阴局七十二局并列，不由局数推出）；和数只列事实与卷二原文，不下和/不和判词。仅供研究。",
  });
