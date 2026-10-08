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
const ELEMENT_ORDER: Element[] = ["wood", "fire", "earth", "metal", "water"];

const FOLLOW_STRUCTURE_LABEL: Record<BaziStructureAudit["followStructure"], string> = {
  "not-supported": "不支持从格",
  "follow-strong-candidate": "从强候选",
  "follow-weak-candidate": "从弱候选",
  "follow-wealth-candidate": "从财候选",
  "follow-officer-killing-candidate": "从杀候选",
  "follow-output-candidate": "从儿（食伤）候选",
  "transformation-candidate": "化格候选",
  disputed: "存疑",
};

export const formatElementLabel = (value: string): string =>
  ELEMENT_LABEL[value as Element] ?? value;

export const formatFollowStructure = (value: string): string =>
  FOLLOW_STRUCTURE_LABEL[value as BaziStructureAudit["followStructure"]] ?? value;

const emptyWeights = (): Record<Element, number> => ({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });
const controllerOf = (target: Element): Element => (Object.entries(CONTROLS).find(([, value]) => value === target)?.[0] ?? "wood") as Element;
const at = <T,>(map: Record<string, T>, a: string, b: string): T | undefined => map[`${a}${b}`] ?? map[`${b}${a}`];

/* 合化 tables, duplicated here (kept in sync with relations-analysis) so the
   sandbox can add a 化气 contribution without a cross-module cycle. */
const STEM_COMBINE_ELEMENT: Record<string, Element> = { 甲己: "earth", 乙庚: "metal", 丙辛: "water", 丁壬: "wood", 戊癸: "fire" };
const BRANCH_COMBINE_ELEMENT: Record<string, Element> = { 子丑: "earth", 寅亥: "wood", 卯戌: "fire", 辰酉: "metal", 巳申: "water", 午未: "earth" };
const BRANCH_HALF_ELEMENT: Record<string, Element> = { 申子: "water", 子辰: "water", 亥卯: "wood", 卯未: "wood", 寅午: "fire", 午戌: "fire", 巳酉: "metal", 酉丑: "metal" };
const BRANCH_TRIO: Array<{ branches: string; element: Element }> = [
  { branches: "申子辰", element: "water" },
  { branches: "亥卯未", element: "wood" },
  { branches: "寅午戌", element: "fire" },
  { branches: "巳酉丑", element: "metal" },
];
const BRANCH_MEET: Array<{ branches: string; element: Element }> = [
  { branches: "寅卯辰", element: "wood" },
  { branches: "巳午未", element: "fire" },
  { branches: "申酉戌", element: "metal" },
  { branches: "亥子丑", element: "water" },
];

export type StrengthFactor = "month-command" | "visible-stems" | "roots" | "combinations";
export type StrengthFactorState = Record<StrengthFactor, boolean>;

export const STRENGTH_FACTORS: Array<{ id: StrengthFactor; label: string; hint: string }> = [
  { id: "month-command", label: "月令", hint: "月支主气 + 月支藏干 + 当令加权" },
  { id: "visible-stems", label: "透干", hint: "四柱天干（月干加权）" },
  { id: "roots", label: "通根", hint: "其余地支本气与藏干通根" },
  { id: "combinations", label: "合化", hint: "天干五合 / 地支六合·半合·三合·三会化气" },
];

/** Matches the conservative official audit: 合化 is shown separately, not scored. */
export const DEFAULT_STRENGTH_FACTORS: StrengthFactorState = {
  "month-command": true,
  "visible-stems": true,
  roots: true,
  combinations: false,
};

export type StrengthContribution = {
  factor: StrengthFactor;
  label: string;
  detail: string;
  enabled: boolean;
  elements: Record<Element, number>;
};

export type StrengthBreakdown = {
  elementWeights: Record<Element, number>;
  supportWeight: number;
  drainWeight: number;
  delta: number;
  dayMasterStrength: BaziStructureAudit["dayMasterStrength"];
  rootCount: number;
  visibleSupportCount: number;
  rootLabels: string[];
  combinationDetails: string[];
  contributions: StrengthContribution[];
};

const strengthFromDelta = (delta: number): BaziStructureAudit["dayMasterStrength"] =>
  delta >= 3.2 ? "extreme-strong" : delta >= 1.2 ? "strong" : delta > -1.2 ? "balanced" : delta > -3.2 ? "weak" : "extreme-weak";

const combinationWeights = (pillars: BaziPillarDetail[]): { weights: Record<Element, number>; details: string[] } => {
  const weights = emptyWeights();
  const details: string[] = [];
  const add = (element: Element, amount: number, detail: string) => {
    weights[element] += amount;
    details.push(detail);
  };
  for (let i = 0; i < pillars.length; i += 1) {
    for (let j = i + 1; j < pillars.length; j += 1) {
      const a = pillars[i];
      const b = pillars[j];
      const stem = at(STEM_COMBINE_ELEMENT, a.heavenlyStem, b.heavenlyStem);
      if (stem) add(stem, 1, `天干五合 ${a.heavenlyStem}${b.heavenlyStem} → 化${ELEMENT_LABEL[stem]}`);
      const he = at(BRANCH_COMBINE_ELEMENT, a.earthlyBranch, b.earthlyBranch);
      if (he) add(he, 1, `地支六合 ${a.earthlyBranch}${b.earthlyBranch} → 化${ELEMENT_LABEL[he]}`);
      const half = at(BRANCH_HALF_ELEMENT, a.earthlyBranch, b.earthlyBranch);
      if (half) add(half, 0.75, `地支半合 ${a.earthlyBranch}${b.earthlyBranch} → 化${ELEMENT_LABEL[half]}`);
    }
  }
  const branchSet = pillars.map((pillar) => pillar.earthlyBranch);
  const isGroup = (group: string) => group.length === branchSet.length && group.split("").every((branch) => branchSet.includes(branch));
  for (const trio of BRANCH_TRIO) {
    if (isGroup(trio.branches)) add(trio.element, 1.5, `地支三合 ${trio.branches} → 化${ELEMENT_LABEL[trio.element]}`);
  }
  for (const meet of BRANCH_MEET) {
    if (isGroup(meet.branches)) add(meet.element, 1.5, `地支三会 ${meet.branches} → 化${ELEMENT_LABEL[meet.element]}`);
  }
  return { weights, details };
};

/**
 * Recomputable strength breakdown. With `DEFAULT_STRENGTH_FACTORS` it reproduces
 * the official audit exactly (合化 excluded). The panel uses it as a sandbox so
 * each group can be toggled in or out and the conclusion updated live.
 */
export const computeStrengthBreakdown = (
  pillars: BaziPillarDetail[],
  dayMaster: string,
  factors: StrengthFactorState = DEFAULT_STRENGTH_FACTORS,
): StrengthBreakdown => {
  const master = STEM_ELEMENT[dayMaster];
  const month = pillars.find((pillar) => pillar.key === "month");
  if (!master || !month) throw new Error("无法建立子平结构审计：日主或月令缺失。");
  const monthElement = BRANCH_ELEMENT[month.earthlyBranch];

  const monthWeights = emptyWeights();
  if (factors["month-command"]) {
    if (monthElement) monthWeights[monthElement] += 1.5;
    for (const hidden of month.hiddenStems) {
      const element = STEM_ELEMENT[hidden];
      if (element) monthWeights[element] += 0.75;
    }
  }

  const visibleWeights = emptyWeights();
  if (factors["visible-stems"]) {
    for (const pillar of pillars) {
      const element = STEM_ELEMENT[pillar.heavenlyStem];
      if (element) visibleWeights[element] += pillar.key === "month" ? 1.25 : 1;
    }
  }

  const rootWeights = emptyWeights();
  const rootLabels: string[] = [];
  if (factors["month-command"]) {
    month.hiddenStems.filter((hidden) => STEM_ELEMENT[hidden] === master).forEach((hidden) => {
      rootLabels.push(POSITION_LABEL.month + "藏" + hidden + "（同五行根）");
    });
  }
  if (factors.roots) {
    for (const pillar of pillars) {
      if (pillar.key === "month") continue;
      const branchElement = BRANCH_ELEMENT[pillar.earthlyBranch];
      if (branchElement) rootWeights[branchElement] += 1.2;
      for (const hidden of pillar.hiddenStems) {
        const element = STEM_ELEMENT[hidden];
        if (element) rootWeights[element] += 0.55;
        if (element === master) rootLabels.push(POSITION_LABEL[pillar.key] + "藏" + hidden + "（同五行根）");
      }
    }
  }

  const combo = factors.combinations ? combinationWeights(pillars) : { weights: emptyWeights(), details: [] as string[] };

  const totals = emptyWeights();
  for (const element of ELEMENT_ORDER) {
    totals[element] = monthWeights[element] + visibleWeights[element] + rootWeights[element] + combo.weights[element];
  }

  const monthBonus = factors["month-command"] && monthElement === master ? 1.2 : 0;
  const monthPenalty = factors["month-command"] && monthElement !== master && monthElement !== GENERATED_BY[master] ? 0.4 : 0;
  const supportWeight = totals[master] + totals[GENERATED_BY[master]] + monthBonus;
  const drainWeight = totals[GENERATES[master]] + totals[CONTROLS[master]] + totals[controllerOf(master)] + monthPenalty;
  const delta = supportWeight - drainWeight;

  const visibleSupportCount = factors["visible-stems"]
    ? pillars.filter((pillar) => {
        const element = STEM_ELEMENT[pillar.heavenlyStem];
        return pillar.key !== "day" && (element === master || element === GENERATED_BY[master]);
      }).length
    : 0;

  const contributions: StrengthContribution[] = STRENGTH_FACTORS.map((factor) => {
    const elements =
      factor.id === "month-command" ? monthWeights
      : factor.id === "visible-stems" ? visibleWeights
      : factor.id === "roots" ? rootWeights
      : combo.weights;
    return {
      factor: factor.id,
      label: factor.label,
      detail: factor.id === "combinations" && combo.details.length ? combo.details.join("；") : factor.hint,
      enabled: factors[factor.id],
      elements,
    };
  });

  return {
    elementWeights: totals,
    supportWeight: Number(supportWeight.toFixed(2)),
    drainWeight: Number(drainWeight.toFixed(2)),
    delta: Number(delta.toFixed(2)),
    dayMasterStrength: strengthFromDelta(delta),
    rootCount: rootLabels.length,
    visibleSupportCount,
    rootLabels,
    combinationDetails: combo.details,
    contributions,
  };
};

export type TiaohouAssessment = {
  warmScore: number;
  coolScore: number;
  dryScore: number;
  wetScore: number;
  tone: "偏暖燥" | "偏寒湿" | "寒暖适中" | "燥湿平衡";
  direction: string;
  detail: string;
};

/** 寒暖燥湿 heuristic (调候参考). Not the exhaustive 穷通宝鉴 per-month table. */
export const buildTiaohouAssessment = (
  weights: Record<Element, number>,
  pillars: BaziPillarDetail[],
): TiaohouAssessment => {
  const dryEarth = pillars.filter((pillar) => pillar.earthlyBranch === "戌" || pillar.earthlyBranch === "未").length;
  const wetEarth = pillars.filter((pillar) => pillar.earthlyBranch === "辰" || pillar.earthlyBranch === "丑").length;
  const warmScore = Number((weights.fire + weights.wood * 0.4 + dryEarth * 0.8).toFixed(2));
  const coolScore = Number((weights.water + weights.metal * 0.4 + wetEarth * 0.8).toFixed(2));
  const dryScore = Number((weights.fire + dryEarth * 1.2 - weights.water).toFixed(2));
  const wetScore = Number((weights.water + wetEarth * 1.2 - weights.fire).toFixed(2));
  const temperature = warmScore - coolScore;
  const humidity = dryScore - wetScore;
  const tone: TiaohouAssessment["tone"] =
    temperature >= 1.2 ? "偏暖燥" : temperature <= -1.2 ? "偏寒湿" : Math.abs(humidity) >= 1.2 ? (humidity > 0 ? "偏暖燥" : "偏寒湿") : "寒暖适中";
  const direction =
    temperature >= 1.2 ? "宜水、湿土（滋润降温）"
    : temperature <= -1.2 ? "宜火、燥土（温暖去湿）"
    : "寒暖较均衡，按格局与用神取用";
  return {
    warmScore,
    coolScore,
    dryScore,
    wetScore,
    tone,
    direction,
    detail: `暖度 ${warmScore} / 寒度 ${coolScore}；燥度 ${dryScore} / 湿度 ${wetScore}；燥土（戌未）${dryEarth} 个，湿土（辰丑）${wetEarth} 个。`,
  };
};

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
  const breakdown = computeStrengthBreakdown(pillars, dayMaster, DEFAULT_STRENGTH_FACTORS);
  const weights = breakdown.elementWeights;
  const monthElement = BRANCH_ELEMENT[month.earthlyBranch];
  const { supportWeight, drainWeight, rootCount, visibleSupportCount, rootLabels } = breakdown;
  const dayMasterStrength = breakdown.dayMasterStrength;
  const supportingEvidence = [
    "月令为" + month.earthlyBranch + "，主气五行按" + ELEMENT_LABEL[monthElement] + "计入。",
    "日主" + dayMaster + "属" + ELEMENT_LABEL[master] + "；同我与生我权重 " + supportWeight.toFixed(2) + "，泄耗克权重 " + drainWeight.toFixed(2) + "。",
    rootCount ? "日主根气：" + rootLabels.join("、") + "。" : "四支藏干未发现与日主同干的直接根气。",
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
    elementWeights: weights, supportWeight,
    drainWeight,
    rootCount, visibleSupportCount, dayMasterStrength, followStructure,
    confidence: canFollowWeak || canFollowStrong ? 45 : 72, supportingEvidence, contradictingEvidence, luMingFeatures,
  };
};
