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
 * Pattern names and source labels follow the open-source candidate project's
 * patterns.ts, while the product chart remains the single calculation source.
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
    patterns.push(pattern("zi-fu-tong-gong", "紫府同宫", "excellent", "紫微与天府同守命宫，属于命宫主星组合格局。", [`命宫=${ming.name}`, "命宫主星=紫微、天府"], "《紫微斗数全书·紫府同宫格》"));
  }

  const samePalace = (left: string, right: string) => palaces.find((palace) =>
    palace.majorStars.some((star) => star.name === left) &&
    ALL_STARS(palace).some((star) => star.name === right),
  );
  const jiLiang = samePalace("天机", "天梁");
  if (jiLiang) {
    patterns.push(pattern("ji-liang-tong-gong", "机梁同宫", "good", "天机与天梁同宫，盘面同时具备谋略与护持主题。", [`${jiLiang.name}=天机、天梁`], "《紫微斗数全书·机梁同宫》"));
  }

  if (["七杀", "破军", "贪狼"].every((star) => sanFangStars.has(star))) {
    patterns.push(pattern("sha-po-lang", "杀破狼", "neutral", "命宫三方四正同时会见七杀、破军、贪狼，属于高变动结构，需结合四化和运限判断。", [`命宫三方四正=${sanFangNames.join("、")}`, "会见=七杀、破军、贪狼"], "《紫微斗数全书·杀破狼》"));
  }

  const riYue = samePalace("太阳", "太阴");
  if (riYue) {
    patterns.push(pattern("ri-yue-tong-gong", "日月同宫", "good", "太阳与太阴同宫，需结合昼夜、亮度和所在宫位判断表现。", [`${riYue.name}=太阳、太阴`], "《紫微斗数全书·日月同宫》"));
  }

  for (const [star, label] of [["火星", "火贪格"], ["铃星", "铃贪格"]] as const) {
    const tanLangPalace = sanFang.find((palace) => palace.majorStars.some((item) => item.name === "贪狼"));
    const shaPalace = sanFang.find((palace) => has(palace, star));
    if (tanLangPalace && shaPalace) {
      const id = star === "火星" ? "tan-huo" : "tan-ling";
      patterns.push(pattern(id, label, "caution", `命宫三方四正会见贪狼与${star}，需结合实际宫位、亮度、其他煞曜和运限复核。`, [`贪狼=${tanLangPalace.name}`, `${star}=${shaPalace.name}`, `命宫三方四正=${sanFangNames.join("、")}`], "《紫微斗数骨髓赋》"));
    }
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
