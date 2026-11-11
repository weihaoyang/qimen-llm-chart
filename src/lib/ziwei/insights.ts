import type { ZiweiPalaceSummary, ZiweiPattern } from "./types";

const ALL_STARS = (palace: ZiweiPalaceSummary) => [
  ...palace.majorStars,
  ...palace.minorStars,
  ...palace.adjectiveStars,
];
const STAR_NAMES = (palace: ZiweiPalaceSummary) => ALL_STARS(palace).map((star) => star.name);
const has = (palace: ZiweiPalaceSummary, star: string) => STAR_NAMES(palace).includes(star);
const allPalaceStars = (palaces: ZiweiPalaceSummary[]) => palaces.flatMap(STAR_NAMES);

const pattern = (
  id: string,
  name: string,
  level: ZiweiPattern["level"],
  summary: string,
  evidence: string[],
  source: string,
): ZiweiPattern => ({ id, name, level, summary, evidence, source });

/**
 * Derived facts for AI context. The rules are deliberately conservative:
 * every pattern carries the concrete palace evidence that triggered it.
 * 格局名与判据依传统说法整理，逐条注明所据古籍或口诀（如《紫微斗数全书》
 * 《紫微斗数骨髓赋》、四化与禄存歌诀）；排盘数据仍以本仓 iztro 盘为唯一来源。
 */
export const buildZiweiInsights = ({
  palaces,
  mingGongBranch,
  shenGongBranch,
}: {
  palaces: ZiweiPalaceSummary[];
  mingGongBranch: number;
  shenGongBranch: number;
}) => {
  const byBranch = new Map(palaces.map((palace) => [palace.branchIndex, palace]));
  const ming = byBranch.get(mingGongBranch) ?? palaces.find((palace) => palace.isOriginalPalace);
  const shen = byBranch.get(shenGongBranch);
  const sanFangBranches = [mingGongBranch, (mingGongBranch + 4) % 12, (mingGongBranch + 8) % 12, (mingGongBranch + 6) % 12];
  const sanFang = sanFangBranches.map((branch) => byBranch.get(branch)).filter((palace): palace is ZiweiPalaceSummary => Boolean(palace));
  const sanFangNames = sanFang.map((palace) => palace.name);
  // 三方四正的格局会同时依赖主星、辅星和煞曜。只看主星会漏掉
  // 火星、铃星、禄存、擎羊等直接改变格局成立条件的证据。
  const sanFangStars = new Set(sanFang.flatMap(STAR_NAMES));
  const patterns: ZiweiPattern[] = [];

  if (ming && has(ming, "紫微") && has(ming, "天府")) {
    patterns.push(pattern("zi-fu-tong-gong", "紫府同宫", "neutral", "紫微与天府同守命宫的结构事实，须结合亮度及其他星曜综合判断。", [`命宫=${ming.name}（${ming.earthlyBranch}）`, "命宫主星=紫微、天府"], "《紫微斗数全书》卷二·安天府图：寅申紫府同宫"));
  }

  const samePalace = (left: string, right: string) => palaces.find((palace) =>
    palace.majorStars.some((star) => star.name === left) &&
    ALL_STARS(palace).some((star) => star.name === right),
  );
  const jiLiang = samePalace("天机", "天梁");
  if (jiLiang) {
    patterns.push(pattern("ji-liang-tong-gong", "机梁同宫", "neutral", "天机与天梁同宫的结构事实；《全书》将守命加吉与加刑忌分论，不能仅由同宫确定吉格。",
      [`${jiLiang.name}（${jiLiang.earthlyBranch}）=天机、天梁`, `所在宫是否命宫=${jiLiang.branchIndex === mingGongBranch ? "是" : "否"}`,
        ...jiLiang.majorStars.filter(star => star.name === "天机" || star.name === "天梁").map(star => `${star.name}亮度=${star.brightness ?? "未提供"}`)],
      "《紫微斗数全书》卷三·天机：机梁守命加吉曜，与加刑忌分论"));
  }

  if (["七杀", "破军", "贪狼"].every((star) => sanFangStars.has(star))) {
    patterns.push(pattern("sha-po-lang", "杀破狼", "neutral", "命宫三方四正同时会见七杀、破军、贪狼，属于高变动结构，需结合四化和运限判断。", [`命宫三方四正=${sanFangNames.join("、")}`, "会见=七杀、破军、贪狼"], "《紫微斗数全书·杀破狼》"));
  }

  const riYue = samePalace("太阳", "太阴");
  if (riYue) {
    patterns.push(pattern("ri-yue-tong-gong", "日月同宫", "neutral", "太阳与太阴同宫的结构事实；《全书》按生时、守照及吉凶曜分论，同宫本身不等于并明或吉格。",
      [`${riYue.name}（${riYue.earthlyBranch}）=太阳、太阴`, `所在宫是否命宫=${riYue.branchIndex === mingGongBranch ? "是" : "否"}`,
        ...riYue.majorStars.filter(star => star.name === "太阳" || star.name === "太阴").map(star => `${star.name}亮度=${star.brightness ?? "未提供"}`)],
      "《紫微斗数全书》卷三·太阳太阴拱照：守命吉多主吉、凶多主凶，同宫看生时"));
  }

  for (const [star, label] of [["火星", "贪狼会火星"], ["铃星", "贪狼会铃星"]] as const) {
    const tanLangPalace = sanFang.find((palace) => palace.majorStars.some((item) => item.name === "贪狼"));
    const shaPalace = sanFang.find((palace) => has(palace, star));
    if (tanLangPalace && shaPalace) {
      const id = star === "火星" ? "tan-huo-meeting" : "tan-ling-meeting";
      patterns.push(pattern(id, label, "caution", `命宫三方四正会见贪狼与${star}，需结合实际宫位、亮度、其他煞曜和运限复核。`, [`贪狼=${tanLangPalace.name}`, `${star}=${shaPalace.name}`, `命宫三方四正=${sanFangNames.join("、")}`], "命宫三方四正结构；不等同于古籍成格条件"));
    }
  }

  // 《全书·定贵局》：二星守命同居庙旺。会照事实不替代此条件。
  const mingTanLang = ming?.majorStars.find(star => star.name === "贪狼");
  const mingHuoXing = ming && ALL_STARS(ming).find(star => star.name === "火星");
  const inTempleOrProsperity = (brightness: string | undefined) => brightness === "庙" || brightness === "旺";
  if (ming && mingTanLang && mingHuoXing
    && inTempleOrProsperity(mingTanLang.brightness) && inTempleOrProsperity(mingHuoXing.brightness)) {
    patterns.push(pattern("tan-huo", "贪火相逢", "good", "按现用亮度表套用《定贵局》的二星守命、同居庙旺条件成立；不同版本的庙旺可能导致结果不同。",
      [`命宫=${ming.name}（${ming.earthlyBranch}）`, `贪狼=${mingTanLang.brightness}`, `火星=${mingHuoXing.brightness}`],
      "《紫微斗数全书》卷一·定贵局：贪火相逢；亮度取当前 iztro 表"));
  }

  if (ming && ALL_STARS(ming).some((star) => star.name === "禄存" || star.mutagen === "禄")) {
    patterns.push(pattern("lu-ru-ming", "禄入命宫", "good", "命宫直接出现禄存或化禄证据，财禄主题较集中。", [`命宫=${ming.name}`, "命宫证据=禄存或化禄"], "传统四化与禄存歌诀"));
  }

  if (ming && ALL_STARS(ming).some((star) => star.mutagen === "忌")) {
    patterns.push(pattern("ji-ru-ming", "忌入命宫", "caution", "命宫出现生年化忌，需要连同具体星曜、三方四正和运限解释。", [`命宫=${ming.name}`, "命宫主星带=化忌"], "传统四化表"));
  }

  if (shen && ming && shen.name !== ming.name) {
    patterns.push(pattern("ming-shen-separated", "命身异宫", "neutral", "命宫与身宫分属不同宫位，解读时应分别列出先天结构与后天着力点。", [`命宫=${ming.name}`, `身宫=${shen.name}`], "命身宫结构"));
  }

  const emptyPalaces = palaces
    .filter((palace) => palace.isEmpty && palace.oppositePalace)
    .map((palace) => ({ palace: palace.name, oppositePalace: palace.oppositePalace as string, borrowedStars: palace.borrowedStars }));

  return {
    patterns,
    sanFangSiZheng: sanFangNames,
    emptyPalaces,
    allStars: allPalaceStars(palaces),
  };
};
