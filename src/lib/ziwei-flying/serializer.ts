import type { ZiweiFlyingChart } from "./chart";
import { LUO_SHU, MUTAGEN_NAMES, STEM_MUTAGENS, TECHNIQUES, TIAN_YI } from "./data";

export const serializeZiweiFlyingToStructuredText = (chart: ZiweiFlyingChart) => [
  "紫微斗数 · 飞星（飞化）/ 自化 · 河洛化象",
  `生年 ${chart.year.ganZhi} · 来因宫 ${chart.laiYin ? chart.laiYin.palace : "—"} · 天乙贵人宫 ${chart.tianYi.palaces.filter((name) => name !== "—").join("、") || "—"}（贵人支 ${chart.tianYi.branches.join("、")}）`,
  `生年四化：${chart.natives.map((item) => `${item.mutagen} ${item.star}→${item.palace}`).join("；")}`,
  "",
  "飞星矩阵（各行以其宫干起四化，箭头为其飞入之宫）：",
  ...chart.rows.map((row) => {
    const hits = row.hits.map((hit) => `${hit.mutagen} ${hit.star}→${hit.toPalace}${hit.self ? "（自化）" : ""}`).join("；");
    const incoming = row.incoming.length ? `｜向心化入：${row.incoming.map((item) => `${item.fromPalace}飞${item.mutagen}${item.star}`).join("、")}` : "";
    return `- ${row.palace}（${row.stem}${row.branch}）${row.isInner ? "·六内" : ""}${row.isLaiYin ? "·来因" : ""}${row.isTianYi ? "·天乙" : ""}｜${hits}${incoming}`;
  }),
  "",
  "河洛化象（宫支 → 洛书数 · 九星象；河图生成数）：",
  ...chart.rows.map((row) => `- ${row.palace}（${row.branch}）：洛书 ${row.luoShu} · ${row.trigram} · ${row.nineStar}｜河图 ${row.heTu}`),
  "",
  `禄转忌：${chart.chains.luZhuanJi.map((item) => `${item.star}（落 ${item.origin}）→ 以 ${item.via}宫干 飞忌 ${item.star2} → ${item.to}`).join("；") || "—"}`,
  `忌转忌：${chart.chains.jiZhuanJi.map((item) => `${item.star}（落 ${item.origin}）→ 以 ${item.via}宫干 飞忌 ${item.star2} → ${item.to}`).join("；") || "—"}`,
  "",
  "技法：",
  ...TECHNIQUES.map((item) => `- ${item.name}：${item.rule}（${item.note}）`),
  "",
  `边界：${chart.disclaimer}`,
].join("\n");

export const serializeZiweiFlyingToCompactJson = (chart: ZiweiFlyingChart) =>
  JSON.stringify({
    format: "qmdj-ziwei-flying-v1",
    input: chart.input,
    year: chart.year,
    laiYin: chart.laiYin ? [chart.laiYin.palace, chart.laiYin.index] : null,
    tianYi: chart.tianYi,
    natives: chart.natives.map((item) => [item.mutagen, item.star, item.palace]),
    rows: chart.rows.map((row) => [
      row.palace,
      row.stem,
      row.branch,
      row.isInner ? 1 : 0,
      row.isLaiYin ? 1 : 0,
      row.isTianYi ? 1 : 0,
      row.luoShu,
      row.nineStar,
      row.heTu,
      row.hits.map((hit) => [hit.mutagen, hit.star, hit.toPalace, hit.self ? 1 : 0]),
      row.incoming.map((item) => [item.fromPalace, item.mutagen, item.star]),
    ]),
    chains: chart.chains,
    stemMutagens: STEM_MUTAGENS,
    tianYiTable: TIAN_YI,
    luoShu: LUO_SHU,
    mutagenOrder: MUTAGEN_NAMES,
    boundary: "飞化/自化/来因宫/禄转忌·忌转忌为北派通行技法；十干四化依通行口诀；河洛数为对照呈现；「天乙飞星」为「贵人宫+宫干飞化」的组合命名。不作吉凶断语。",
  });
