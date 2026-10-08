import type { FiveElement } from "./relations";
import { getBranchTrait, getStemTrait } from "./relations";
import type { BaziPillarDetail, BaziPillarKey, NormalizedBaziChart } from "./types";

/**
 * Intra-chart 干支 relations (合/冲/刑/害/破/会/伏吟/空亡).
 *
 * This is intentionally school-agnostic: it reports the structural relations
 * that almost every 八字 reading starts from, without claiming a verdict. The
 * panel, the compatibility view and the Agent serializer all consume this same
 * list, so the human view and the structured payload never disagree.
 */

export type BaziRelationKind =
  | "天干五合"
  | "天干相冲"
  | "天干相克"
  | "地支六合"
  | "地支三合"
  | "地支半合"
  | "地支三会"
  | "地支六冲"
  | "地支相刑"
  | "地支自刑"
  | "地支六害"
  | "地支六破"
  | "天克地冲"
  | "伏吟";

export type BaziRelationTone = "positive" | "negative" | "neutral";

export type BaziRelation = {
  kind: BaziRelationKind;
  tone: BaziRelationTone;
  /** The pillars involved, in chart order. */
  pillars: BaziPillarKey[];
  /** Human pair label, e.g. "年柱 × 日柱". */
  pairLabel: string;
  /** The glyphs that form the relation, e.g. "甲己" or "子午". */
  symbols: string;
  detail: string;
};

/** A relation between two glyphs, before it is anchored to pillars. */
export type LightRelation = {
  kind: BaziRelationKind;
  tone: BaziRelationTone;
  detail: string;
};

/** Coarse buckets used by the UI filters and the grouped panels. */
export type BaziRelationGroup = "合会" | "冲" | "刑害破" | "其他";

export const BAZI_RELATION_GROUPS: BaziRelationGroup[] = ["合会", "冲", "刑害破", "其他"];

const RELATION_GROUP: Record<BaziRelationKind, BaziRelationGroup> = {
  天干五合: "合会",
  地支六合: "合会",
  地支三合: "合会",
  地支半合: "合会",
  地支三会: "合会",
  天干相冲: "冲",
  地支六冲: "冲",
  天克地冲: "冲",
  地支相刑: "刑害破",
  地支自刑: "刑害破",
  地支六害: "刑害破",
  地支六破: "刑害破",
  天干相克: "其他",
  伏吟: "其他",
};

export const getBaziRelationGroup = (kind: BaziRelationKind): BaziRelationGroup => RELATION_GROUP[kind];

export type BaziRelationBucket = {
  group: BaziRelationGroup;
  relations: BaziRelation[];
};

/**
 * Buckets an already-computed relation list. `clashOnly` keeps 合会 + 冲, the
 * "只看冲合" view.
 */
export const groupBaziRelations = (
  relations: BaziRelation[],
  options: { clashOnly?: boolean } = {},
): BaziRelationBucket[] => {
  const groups = options.clashOnly ? (["合会", "冲"] as BaziRelationGroup[]) : BAZI_RELATION_GROUPS;
  return groups
    .map((group) => ({
      group,
      relations: relations.filter((relation) => getBaziRelationGroup(relation.kind) === group),
    }))
    .filter((bucket) => bucket.relations.length > 0);
};

export type BaziRelationAnalysis = {
  relations: BaziRelation[];
  notes: string[];
  missingElements: FiveElement[];
  counts: Array<{ kind: BaziRelationKind; count: number }>;
};

const PILLAR_LABELS: Record<BaziPillarKey, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

const STEM_COMBINE: Record<string, FiveElement> = {
  甲己: "土",
  乙庚: "金",
  丙辛: "水",
  丁壬: "木",
  戊癸: "火",
};

const STEM_CLASH: Record<string, true> = {
  甲庚: true,
  乙辛: true,
  丙壬: true,
  丁癸: true,
};

const BRANCH_COMBINE: Record<string, FiveElement> = {
  子丑: "土",
  寅亥: "木",
  卯戌: "火",
  辰酉: "金",
  巳申: "水",
  午未: "土",
};

const BRANCH_CLASH: Record<string, true> = {
  子午: true,
  丑未: true,
  寅申: true,
  卯酉: true,
  辰戌: true,
  巳亥: true,
};

const BRANCH_HARM: Record<string, true> = {
  子未: true,
  丑午: true,
  寅巳: true,
  卯辰: true,
  申亥: true,
  酉戌: true,
};

const BRANCH_BREAK: Record<string, true> = {
  子酉: true,
  寅亥: true,
  卯午: true,
  辰丑: true,
  巳申: true,
  未戌: true,
};

const BRANCH_PUNISH: Record<string, string> = {
  子卯: "无礼之刑",
  寅巳: "无恩之刑",
  巳申: "无恩之刑",
  寅申: "无恩之刑",
  丑戌: "恃势之刑",
  戌未: "恃势之刑",
  丑未: "恃势之刑",
};

const BRANCH_SELF_PUNISH: Record<string, true> = {
  辰辰: true,
  午午: true,
  酉酉: true,
  亥亥: true,
};

const BRANCH_HALF_COMBINE: Record<string, FiveElement> = {
  申子: "水",
  子辰: "水",
  亥卯: "木",
  卯未: "木",
  寅午: "火",
  午戌: "火",
  巳酉: "金",
  酉丑: "金",
};

const BRANCH_TRIO_COMBINE: Array<{ branches: string; element: FiveElement }> = [
  { branches: "申子辰", element: "水" },
  { branches: "亥卯未", element: "木" },
  { branches: "寅午戌", element: "火" },
  { branches: "巳酉丑", element: "金" },
];

const BRANCH_TRIO_MEETING: Array<{ branches: string; element: FiveElement; direction: string }> = [
  { branches: "寅卯辰", element: "木", direction: "东方" },
  { branches: "巳午未", element: "火", direction: "南方" },
  { branches: "申酉戌", element: "金", direction: "西方" },
  { branches: "亥子丑", element: "水", direction: "北方" },
];

const ELEMENT_CONTROLS: Record<FiveElement, FiveElement> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

const PILLAR_ORDER: BaziPillarKey[] = ["year", "month", "day", "time"];

const at = <T,>(map: Record<string, T>, a: string, b: string): T | undefined =>
  map[`${a}${b}`] ?? map[`${b}${a}`];

const pairLabel = (a: BaziPillarKey, b: BaziPillarKey) =>
  `${PILLAR_LABELS[a]} × ${PILLAR_LABELS[b]}`;

const sortPillars = (a: BaziPillarKey, b: BaziPillarKey): BaziPillarKey[] =>
  PILLAR_ORDER.indexOf(a) <= PILLAR_ORDER.indexOf(b) ? [a, b] : [b, a];

/** Stem-to-stem relations, independent of position. */
export const stemRelations = (a: string, b: string): LightRelation[] => {
  const out: LightRelation[] = [];
  const combine = at(STEM_COMBINE, a, b);
  if (combine) {
    out.push({ kind: "天干五合", tone: "positive", detail: `${a}${b} 相合，合化为${combine}` });
  }
  const clash = at(STEM_CLASH, a, b);
  if (clash) {
    out.push({ kind: "天干相冲", tone: "negative", detail: `${a}${b} 相冲，天干层面的直接对立` });
  }
  const aTrait = getStemTrait(a);
  const bTrait = getStemTrait(b);
  if (
    aTrait &&
    bTrait &&
    aTrait.element !== bTrait.element &&
    !combine &&
    !clash &&
    (ELEMENT_CONTROLS[aTrait.element] === bTrait.element || ELEMENT_CONTROLS[bTrait.element] === aTrait.element)
  ) {
    out.push({ kind: "天干相克", tone: "negative", detail: `${a}${b} 相克，需要中间力量通关` });
  }
  return out;
};

/** Branch-to-branch relations, independent of position. */
export const branchRelations = (a: string, b: string): LightRelation[] => {
  const out: LightRelation[] = [];
  const combine = at(BRANCH_COMBINE, a, b);
  if (combine) {
    out.push({ kind: "地支六合", tone: "positive", detail: `${a}${b} 六合，合化为${combine}` });
  }
  const half = at(BRANCH_HALF_COMBINE, a, b);
  if (half) {
    out.push({ kind: "地支半合", tone: "positive", detail: `${a}${b} 半合，向${half}局靠拢` });
  }
  if (at(BRANCH_CLASH, a, b)) {
    out.push({ kind: "地支六冲", tone: "negative", detail: `${a}${b} 六冲，地支层面的正面冲突` });
  }
  const punish = at(BRANCH_PUNISH, a, b);
  if (punish) {
    out.push({ kind: "地支相刑", tone: "negative", detail: `${a}${b} ${punish}` });
  }
  if (at(BRANCH_SELF_PUNISH, a, b)) {
    out.push({ kind: "地支自刑", tone: "negative", detail: `${a}${b} 自刑，同类叠加易内耗` });
  }
  if (at(BRANCH_HARM, a, b)) {
    out.push({ kind: "地支六害", tone: "negative", detail: `${a}${b} 六害，隐性摩擦` });
  }
  if (at(BRANCH_BREAK, a, b)) {
    out.push({ kind: "地支六破", tone: "negative", detail: `${a}${b} 六破，结构松动` });
  }
  return out;
};

export type RelationPillarInput = Pick<
  BaziPillarDetail,
  "key" | "pillar" | "heavenlyStem" | "earthlyBranch" | "hiddenStems" | "xunKong"
>;

export type AnalyzeRelationsOptions = {
  dayMaster: string;
  /** Day-master strength label from the structure audit, when available. */
  dayMasterStrength?: NormalizedBaziChart["raw"]["structureAudit"]["dayMasterStrength"];
  /** The day pillar's 旬空, used to flag which pillars fall into the void. */
  dayXunKong?: string;
};

const STRENGTH_LABELS: Record<string, string> = {
  "extreme-strong": "极旺",
  strong: "偏旺",
  balanced: "中和",
  weak: "偏弱",
  "extreme-weak": "极弱",
  disputed: "存疑",
};

export const formatDayMasterStrength = (value: string | null | undefined): string | null =>
  value ? (STRENGTH_LABELS[value] ?? value) : null;

export const analyzePillarRelations = (
  pillars: RelationPillarInput[],
  options: AnalyzeRelationsOptions,
): BaziRelationAnalysis => {
  const ordered = PILLAR_ORDER.map((key) => pillars.find((pillar) => pillar.key === key)).filter(
    (pillar): pillar is RelationPillarInput => Boolean(pillar),
  );
  const relations: BaziRelation[] = [];

  const push = (
    kind: BaziRelationKind,
    tone: BaziRelationTone,
    a: BaziPillarKey,
    b: BaziPillarKey,
    symbols: string,
    detail: string,
  ) => {
    const involved = sortPillars(a, b);
    if (
      relations.some(
        (item) => item.kind === kind && item.symbols === symbols && item.pillars.join() === involved.join(),
      )
    ) {
      return;
    }
    relations.push({ kind, tone, pillars: involved, pairLabel: pairLabel(a, b), symbols, detail });
  };

  // Pairwise stem + branch relations.
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i];
      const b = ordered[j];
      const stemKey = `${a.heavenlyStem}${b.heavenlyStem}`;
      const branchKey = `${a.earthlyBranch}${b.earthlyBranch}`;

      stemRelations(a.heavenlyStem, b.heavenlyStem).forEach((relation) => {
        push(relation.kind, relation.tone, a.key, b.key, stemKey, relation.detail);
      });
      branchRelations(a.earthlyBranch, b.earthlyBranch).forEach((relation) => {
        push(relation.kind, relation.tone, a.key, b.key, branchKey, relation.detail);
      });

      if (at(STEM_CLASH, a.heavenlyStem, b.heavenlyStem) && at(BRANCH_CLASH, a.earthlyBranch, b.earthlyBranch)) {
        push(
          "天克地冲",
          "negative",
          a.key,
          b.key,
          `${a.heavenlyStem}${a.earthlyBranch}/${b.heavenlyStem}${b.earthlyBranch}`,
          "天干相冲同时地支相冲，两柱整体对冲",
        );
      }
      if (a.pillar === b.pillar) {
        push("伏吟", "neutral", a.key, b.key, a.pillar, `${a.pillar} 重复出现，同一组干支伏吟`);
      }
    }
  }

  // Branch trios (three of four pillars).
  const isTrio = (branches: string[], group: string) =>
    group.length === branches.length && branches.every((branch) => group.includes(branch));
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      for (let k = j + 1; k < ordered.length; k += 1) {
        const trio = [ordered[i], ordered[j], ordered[k]];
        const trioBranches = trio.map((pillar) => pillar.earthlyBranch);
        const symbols = trioBranches.join("");
        const trioCombine = BRANCH_TRIO_COMBINE.find((item) => isTrio(trioBranches, item.branches));
        if (trioCombine && !relations.some((item) => item.kind === "地支三合" && item.symbols === symbols)) {
          relations.push({
            kind: "地支三合",
            tone: "positive",
            pillars: trio.map((pillar) => pillar.key),
            pairLabel: trio.map((pillar) => PILLAR_LABELS[pillar.key]).join(" · "),
            symbols,
            detail: `${symbols} 三合${trioCombine.element}局`,
          });
        }
        const trioMeeting = BRANCH_TRIO_MEETING.find((item) => isTrio(trioBranches, item.branches));
        if (trioMeeting && !relations.some((item) => item.kind === "地支三会" && item.symbols === symbols)) {
          relations.push({
            kind: "地支三会",
            tone: "positive",
            pillars: trio.map((pillar) => pillar.key),
            pairLabel: trio.map((pillar) => PILLAR_LABELS[pillar.key]).join(" · "),
            symbols,
            detail: `${symbols} 三会${trioMeeting.direction}${trioMeeting.element}方`,
          });
        }
      }
    }
  }

  const missingElements: FiveElement[] = [];
  const elementPresence = new Map<FiveElement, number>([
    ["木", 0],
    ["火", 0],
    ["土", 0],
    ["金", 0],
    ["水", 0],
  ]);
  const addStemElement = (stem: string) => {
    const trait = getStemTrait(stem);
    if (trait) elementPresence.set(trait.element, (elementPresence.get(trait.element) ?? 0) + 1);
  };
  const addBranchElement = (branch: string) => {
    const trait = getBranchTrait(branch);
    if (trait) elementPresence.set(trait.element, (elementPresence.get(trait.element) ?? 0) + 1);
  };
  ordered.forEach((pillar) => {
    addStemElement(pillar.heavenlyStem);
    addBranchElement(pillar.earthlyBranch);
    pillar.hiddenStems.forEach(addStemElement);
  });
  (["木", "火", "土", "金", "水"] as FiveElement[]).forEach((element) => {
    if ((elementPresence.get(element) ?? 0) === 0) missingElements.push(element);
  });

  const counts = new Map<BaziRelationKind, number>();
  relations.forEach((relation) => {
    counts.set(relation.kind, (counts.get(relation.kind) ?? 0) + 1);
  });

  const notes: string[] = [];
  if (options.dayMasterStrength) {
    notes.push(`日主${options.dayMaster}，旺衰判为${STRENGTH_LABELS[options.dayMasterStrength] ?? options.dayMasterStrength}`);
  }
  const negativeCount = relations.filter((relation) => relation.tone === "negative").length;
  const positiveCount = relations.filter((relation) => relation.tone === "positive").length;
  notes.push(`四柱共识别 ${relations.length} 组干支关系：合会 ${positiveCount} 组、冲刑害破 ${negativeCount} 组`);
  if (missingElements.length) {
    notes.push(`五行未见：${missingElements.join("、")}（以透干、地支本气与藏干统计）`);
  }
  const clashCount = relations.filter((relation) => relation.kind === "地支六冲" || relation.kind === "天克地冲").length;
  if (clashCount > 0) notes.push(`存在 ${clashCount} 组冲，冲处多主变动、迁移或关系调整`);

  const xunKong = options.dayXunKong?.trim();
  if (xunKong) {
    const hit = ordered.filter(
      (pillar) => pillar.key !== "day" && xunKong.includes(pillar.earthlyBranch),
    );
    if (hit.length > 0) {
      notes.push(`日柱空亡 ${xunKong}，落宫见 ${hit.map((pillar) => PILLAR_LABELS[pillar.key]).join("、")}`);
    }
  }

  return {
    relations,
    notes,
    missingElements,
    counts: [...counts.entries()].map(([kind, count]) => ({ kind, count })),
  };
};

export const analyzeBaziRelations = (chart: NormalizedBaziChart): BaziRelationAnalysis =>
  analyzePillarRelations(chart.raw.pillars, {
    dayMaster: chart.raw.dayMaster,
    dayMasterStrength: chart.raw.structureAudit.dayMasterStrength,
    dayXunKong: chart.raw.pillars.find((pillar) => pillar.key === "day")?.xunKong,
  });
