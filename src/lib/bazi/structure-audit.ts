import type { BaziPillarDetail, BaziStructureAudit } from "./types";

type Element = "wood" | "fire" | "earth" | "metal" | "water";

const STEM_ELEMENT: Record<string, Element> = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth",
  庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};
const BRANCH_ELEMENT: Record<string, Element> = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
};
const GENERATED_BY: Record<Element, Element> = { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" };
const GENERATES: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CONTROLS: Record<Element, Element> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
const ELEMENT_LABEL: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const POSITION_LABEL: Record<BaziPillarDetail["key"], string> = { year: "年柱", month: "月柱", day: "日柱", time: "时柱" };

const emptyWeights = (): Record<Element, number> => ({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });
const controllerOf = (target: Element): Element => (Object.entries(CONTROLS).find(([, value]) => value === target)?.[0] ?? "wood") as Element;

/**
 * Conservative pre-audit: fixes the inputs and flags disputes. It does not
 * promote a weak chart to 从格 merely because an LLM writes a convincing story.
 */
export const buildBaziStructureAudit = (
  pillars: BaziPillarDetail[],
  dayMaster: string,
  naYin: string[],
  mingGong: string,
  shenGong: string,
): BaziStructureAudit => {
  const master = STEM_ELEMENT[dayMaster];
  const month = pillars.find((pillar) => pillar.key === "month");
  if (!master || !month) throw new Error("无法建立子平结构审计：日主或月令缺失。");
  const weights = emptyWeights();
  const roots: string[] = [];
  let visibleSupportCount = 0;
  for (const pillar of pillars) {
    const stemElement = STEM_ELEMENT[pillar.heavenlyStem];
    const branchElement = BRANCH_ELEMENT[pillar.earthlyBranch];
    if (stemElement) weights[stemElement] += pillar.key === "month" ? 1.25 : 1;
    if (branchElement) weights[branchElement] += pillar.key === "month" ? 1.5 : 1.2;
    for (const hidden of pillar.hiddenStems) {
      const element = STEM_ELEMENT[hidden];
      if (element) weights[element] += pillar.key === "month" ? 0.75 : 0.55;
      if (element === master) roots.push(POSITION_LABEL[pillar.key] + "藏" + hidden + "（同五行根）");
    }
    // The day stem is the subject being evaluated, not an external exposed
    // rescue. Counting it would make the "no visible support" gate impossible.
    if (pillar.key !== "day" && (stemElement === master || stemElement === GENERATED_BY[master])) visibleSupportCount += 1;
  }
  const monthElement = BRANCH_ELEMENT[month.earthlyBranch];
  const supportWeight = weights[master] + weights[GENERATED_BY[master]] + (monthElement === master ? 1.2 : 0);
  const drainWeight = weights[GENERATES[master]] + weights[CONTROLS[master]] + weights[controllerOf(master)] + (monthElement !== master && monthElement !== GENERATED_BY[master] ? 0.4 : 0);
  const delta = supportWeight - drainWeight;
  const rootCount = roots.length;
  const dayMasterStrength = delta >= 3.2 ? "extreme-strong" : delta >= 1.2 ? "strong" : delta > -1.2 ? "balanced" : delta > -3.2 ? "weak" : "extreme-weak";
  const supportingEvidence = [
    "月令为" + month.earthlyBranch + "，主气五行按" + ELEMENT_LABEL[monthElement] + "计入。",
    "日主" + dayMaster + "属" + ELEMENT_LABEL[master] + "；同我与生我权重 " + supportWeight.toFixed(2) + "，泄耗克权重 " + drainWeight.toFixed(2) + "。",
    rootCount ? "日主根气：" + roots.join("、") + "。" : "四支藏干未发现与日主同干的直接根气。",
    "透干生扶计数：" + visibleSupportCount + "。",
  ];
  const contradictingEvidence = [
    "固定权重只锁定可复算候选与反证；调候、合化和流派取格必须另行展示。",
    "从格须同时满足无根、无透干救应与一方成势；不会因日主偏弱自动判从。",
  ];
  const canFollowWeak = dayMasterStrength === "extreme-weak" && rootCount === 0 && visibleSupportCount === 0;
  const canFollowStrong = dayMasterStrength === "extreme-strong" && rootCount >= 2 && visibleSupportCount >= 2 && drainWeight <= 2.2;
  const weakForces = [
    { structure: "follow-output-candidate" as const, label: "食伤", weight: weights[GENERATES[master]] },
    { structure: "follow-wealth-candidate" as const, label: "财星", weight: weights[CONTROLS[master]] },
    { structure: "follow-officer-killing-candidate" as const, label: "官杀", weight: weights[controllerOf(master)] },
  ].sort((left, right) => right.weight - left.weight);
  const dominantWeakForce = weakForces[0];
  const secondWeakForce = weakForces[1];
  const hasSingleDominantWeakForce = Boolean(
    dominantWeakForce
    && secondWeakForce
    && dominantWeakForce.weight >= drainWeight * 0.48
    && dominantWeakForce.weight - secondWeakForce.weight >= 1.2,
  );
  const followStructure = canFollowStrong
    ? "follow-strong-candidate"
    : canFollowWeak && hasSingleDominantWeakForce
      ? dominantWeakForce!.structure
      : canFollowWeak
        ? "follow-weak-candidate"
        : "not-supported";
  if (canFollowStrong) supportingEvidence.push("满足极旺、多处根气、多处透干生扶且逆势力量有限的从强候选门槛，仍需检查破势与合化。");
  if (canFollowWeak) supportingEvidence.push("满足极弱、无同五行根气、无透干生扶三个从弱候选门槛，仍需多流派复核。");
  if (canFollowWeak && hasSingleDominantWeakForce) supportingEvidence.push("克泄耗中以" + dominantWeakForce!.label + "最集中，细分为" + dominantWeakForce!.structure + "。");
  else if (rootCount || visibleSupportCount) contradictingEvidence.push("存在根气或透干生扶，程序规则不支持判为纯从弱。");
  const featurePositions = (needle: string) => pillars.filter((pillar) => pillar.shenSha.some((item) => item.startsWith(needle))).map((pillar) => POSITION_LABEL[pillar.key]);
  const luMingFeatures = ["禄神", "驿马", "华盖", "文昌贵人", "桃花", "将星", "天乙贵人"]
    .map((name) => {
      const positions = featurePositions(name);
      return positions.length ? { name, positions, evidence: name + "见于" + positions.join("、") + "；仅作为禄命取象材料，不直接等同人格字母。" } : null;
    })
    .filter((value): value is { name: string; positions: string[]; evidence: string } => Boolean(value));
  luMingFeatures.push({ name: "纳音", positions: ["四柱"], evidence: "四柱纳音：" + naYin.join("、") + "。" });
  luMingFeatures.push({ name: "命宫身宫", positions: ["命宫", "身宫"], evidence: "命宫" + mingGong + "；身宫" + shenGong + "。" });
  return {
    engineVersion: "ziping-luming-rules-v1", dayMasterElement: ELEMENT_LABEL[master], monthCommandElement: ELEMENT_LABEL[monthElement],
    elementWeights: weights, supportWeight: Number(supportWeight.toFixed(2)), drainWeight: Number(drainWeight.toFixed(2)),
    rootCount, visibleSupportCount, dayMasterStrength, followStructure,
    confidence: canFollowWeak || canFollowStrong ? 45 : 72, supportingEvidence, contradictingEvidence, luMingFeatures,
  };
};
