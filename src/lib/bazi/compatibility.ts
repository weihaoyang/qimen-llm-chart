import type { NormalizedBaziChart } from "./types";
import { getStemTrait } from "./relations";
import {
  branchRelations,
  getBaziRelationGroup,
  stemRelations,
  stemsControlEachOther,
  type BaziRelationKind,
  type BaziRelationTone,
} from "./relations-analysis";

export type BaziCompatibility = {
  score: number;
  headline: string;
  relations: Array<{ type: BaziRelationKind; left: string; right: string; detail: string; tone: BaziRelationTone }>;
  evidence: string[];
  suggestions: string[];
  disclaimer: string;
};

const PILLAR_LABELS: Record<"year" | "month" | "day" | "time", string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

const isBranchClash = (a: string, b: string) =>
  branchRelations(a, b).some((relation) => relation.kind === "地支六冲");

/**
 * 双人合盘: the same glyph-pair engine as the single chart, applied across two
 * people. Day-pillar (夫妻宫) signals are called out explicitly, and every other
 * column pair is reported so nothing noteworthy is hidden behind a summary.
 */
export const buildBaziCompatibility = (
  left: NormalizedBaziChart,
  right: NormalizedBaziChart,
): BaziCompatibility => {
  const evidence: string[] = [];
  const relations: BaziCompatibility["relations"] = [];
  let score = 50;

  const addRelation = (
    type: BaziRelationKind,
    tone: BaziRelationTone,
    leftLabel: string,
    rightLabel: string,
    detail: string,
  ) => {
    if (relations.some((item) => item.type === type && item.left === leftLabel && item.right === rightLabel)) {
      return;
    }
    relations.push({ type, left: leftLabel, right: rightLabel, detail, tone });
    if (tone === "positive") score += 4;
    else if (tone === "negative") score -= 4;
  };

  const leftTrait = getStemTrait(left.raw.dayMaster);
  const rightTrait = getStemTrait(right.raw.dayMaster);
  const leftDay = left.raw.pillars.find((pillar) => pillar.key === "day");
  const rightDay = right.raw.pillars.find((pillar) => pillar.key === "day");

  // 日主 (day master) stem interaction.
  stemRelations(left.raw.dayMaster, right.raw.dayMaster).forEach((relation) => {
    addRelation(relation.kind, relation.tone, "日主", "日主", relation.detail);
    evidence.push(`日主${left.raw.dayMaster}/${right.raw.dayMaster}：${relation.detail}`);
  });
  if (leftTrait && rightTrait) {
    if (leftTrait.element === rightTrait.element) {
      evidence.push(`双方日主同属${leftTrait.element}，节奏与关注点较容易互相理解`);
    } else if (leftTrait.yinYang !== rightTrait.yinYang) {
      evidence.push(`双方日主阴阳不同，互动中可能形成互补`);
    } else {
      evidence.push(`双方日主五行分别为${leftTrait.element}/${rightTrait.element}，需要协调表达节奏`);
    }
  }

  // 夫妻宫 (day branch) interaction, called out on its own.
  if (leftDay && rightDay) {
    branchRelations(leftDay.earthlyBranch, rightDay.earthlyBranch).forEach((relation) => {
      addRelation(relation.kind, relation.tone, "夫妻宫", "夫妻宫", `${leftDay.earthlyBranch} × ${rightDay.earthlyBranch}，${relation.detail}`);
    });
    if (stemsControlEachOther(leftDay.heavenlyStem, rightDay.heavenlyStem) && isBranchClash(leftDay.earthlyBranch, rightDay.earthlyBranch)) {
      const strict = stemRelations(leftDay.heavenlyStem, rightDay.heavenlyStem).some(relation => relation.kind === "天干相冲");
      addRelation("天克地冲", "negative", "日柱", "日柱", `${leftDay.pillar} × ${rightDay.pillar}，天干五行相克、地支六冲（${strict ? "也属天干四冲" : "不属天干四冲"}）`);
    }
  }

  // Every other pillar pair, stem and branch.
  for (const leftPillar of left.raw.pillars) {
    for (const rightPillar of right.raw.pillars) {
      if (leftPillar.key === "day" && rightPillar.key === "day") continue;
      const leftLabel = PILLAR_LABELS[leftPillar.key];
      const rightLabel = PILLAR_LABELS[rightPillar.key];
      stemRelations(leftPillar.heavenlyStem, rightPillar.heavenlyStem).forEach((relation) => {
        addRelation(relation.kind, relation.tone, leftLabel, rightLabel, `${leftPillar.heavenlyStem} × ${rightPillar.heavenlyStem}，${relation.detail}`);
      });
      branchRelations(leftPillar.earthlyBranch, rightPillar.earthlyBranch).forEach((relation) => {
        addRelation(relation.kind, relation.tone, leftLabel, rightLabel, `${leftPillar.earthlyBranch} × ${rightPillar.earthlyBranch}，${relation.detail}`);
      });
      if (
        stemsControlEachOther(leftPillar.heavenlyStem, rightPillar.heavenlyStem) &&
        isBranchClash(leftPillar.earthlyBranch, rightPillar.earthlyBranch)
      ) {
        addRelation(
          "天克地冲",
          "negative",
          leftLabel,
          rightLabel,
          `${leftPillar.pillar} × ${rightPillar.pillar}，天干五行相克、地支六冲（${stemRelations(leftPillar.heavenlyStem, rightPillar.heavenlyStem).some(relation => relation.kind === "天干相冲") ? "也属天干四冲" : "不属天干四冲"}）`,
        );
      }
    }
  }

  // Each pillar's wuXing is a two-character stem/branch pair, not one element.
  // Compare distinct elements rather than exact pairs or repeated occurrences.
  const visibleElements = (pairs: string[]) => new Set(pairs.flatMap((pair) => [...pair]).filter((element) => "木火土金水".includes(element)));
  const leftElements = visibleElements(left.raw.wuXing);
  const rightElements = visibleElements(right.raw.wuXing);
  const shared = [..."木火土金水"].filter((element) => leftElements.has(element) && rightElements.has(element));
  if (shared.length) {
    score += Math.min(6, shared.length);
    evidence.push(`两盘天干和地支本气共同出现的五行：${shared.join("、")}`);
  }

  const count = (group: "合会" | "冲" | "刑害破" | "其他") => relations.filter(relation => getBaziRelationGroup(relation.type) === group).length;
  evidence.unshift(`两盘共识别 ${relations.length} 条干支关系记录：合会 ${count("合会")} 条、冲 ${count("冲")} 条、刑害破 ${count("刑害破")} 条、其他 ${count("其他")} 条；复合关系可与组成关系同时计数。`);

  const finalScore = Math.max(0, Math.min(100, score));
  return {
    score: finalScore,
    headline: finalScore >= 65 ? "有可利用的协同条件，也要把边界写清" : finalScore <= 40 ? "阻力信号较明显，先验证互动事实与节奏" : "结构中性，适合用现实互动持续校准",
    relations,
    evidence,
    suggestions: ["先约定一个可观察的沟通或协作目标，并在 7 天后复盘", "把冲突拆成事实、感受、请求三层，不用命理结论替代对话", "涉及承诺、金钱或重大决定时保留可逆选项"],
    disclaimer: "双人合盘是传统结构的比较工具；分数是产品自定义的关系计数，并非古籍评分或已验证的关系预测，不替任何一方断言想法、忠诚或必然结果。",
  };
};
