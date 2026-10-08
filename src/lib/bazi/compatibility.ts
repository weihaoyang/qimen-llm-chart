import type { NormalizedBaziChart } from "./types";
import { getStemTrait } from "./relations";
import {
  branchRelations,
  stemRelations,
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

const isStemClash = (a: string, b: string) =>
  stemRelations(a, b).some((relation) => relation.kind === "天干相冲");
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
        isStemClash(leftPillar.heavenlyStem, rightPillar.heavenlyStem) &&
        isBranchClash(leftPillar.earthlyBranch, rightPillar.earthlyBranch)
      ) {
        addRelation(
          "天克地冲",
          "negative",
          leftLabel,
          rightLabel,
          `${leftPillar.pillar} × ${rightPillar.pillar}，天干相冲同时地支相冲`,
        );
      }
    }
  }

  const shared = left.raw.wuXing.filter((element) => right.raw.wuXing.includes(element));
  if (shared.length) {
    score += Math.min(6, shared.length);
    evidence.push(`两盘共同出现五行：${shared.join("、")}`);
  }

  const positiveCount = relations.filter((relation) => relation.tone === "positive").length;
  const negativeCount = relations.filter((relation) => relation.tone === "negative").length;
  evidence.unshift(`两盘共识别 ${relations.length} 组干支关系：合会 ${positiveCount} 组、冲刑害破 ${negativeCount} 组`);

  const finalScore = Math.max(0, Math.min(100, score));
  return {
    score: finalScore,
    headline: finalScore >= 65 ? "有可利用的协同条件，也要把边界写清" : finalScore <= 40 ? "阻力信号较明显，先验证互动事实与节奏" : "结构中性，适合用现实互动持续校准",
    relations,
    evidence,
    suggestions: ["先约定一个可观察的沟通或协作目标，并在 7 天后复盘", "把冲突拆成事实、感受、请求三层，不用命理结论替代对话", "涉及承诺、金钱或重大决定时保留可逆选项"],
    disclaimer: "双人合盘是传统结构的比较工具，不替任何一方断言想法、忠诚或必然结果。",
  };
};
