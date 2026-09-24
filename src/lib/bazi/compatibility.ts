import type { NormalizedBaziChart } from "./types";
import { getStemTrait } from "./relations";

export type BaziCompatibility = {
  score: number;
  headline: string;
  relations: Array<{ type: "六合" | "六冲" | "相刑" | "六害" | "六破" | "生克"; left: string; right: string; detail: string; tone: "positive" | "negative" | "neutral" }>;
  evidence: string[];
  suggestions: string[];
  disclaimer: string;
};

const BRANCH_HARMONY: Record<string, string> = { 子丑: "六合", 寅亥: "六合", 卯戌: "六合", 辰酉: "六合", 巳申: "六合", 午未: "六合" };
const BRANCH_CLASH: Record<string, string> = { 子午: "相冲", 丑未: "相冲", 寅申: "相冲", 卯酉: "相冲", 辰戌: "相冲", 巳亥: "相冲" };
const BRANCH_HARM: Record<string, string> = { 子未: "六害", 丑午: "六害", 寅巳: "六害", 卯辰: "六害", 申亥: "六害", 酉戌: "六害" };
const BRANCH_BREAK: Record<string, string> = { 子酉: "六破", 寅亥: "六破", 卯午: "六破", 辰丑: "六破", 巳申: "六破", 未戌: "六破" };
const BRANCH_PUNISH: Record<string, string> = { 子卯: "相刑", 寅巳: "相刑", 巳申: "相刑", 丑戌: "相刑", 未戌: "相刑" };

export const buildBaziCompatibility = (left: NormalizedBaziChart, right: NormalizedBaziChart): BaziCompatibility => {
  const evidence: string[] = [];
  const relations: BaziCompatibility["relations"] = [];
  let score = 50;
  const leftDay = left.raw.pillars.find((pillar) => pillar.key === "day");
  const rightDay = right.raw.pillars.find((pillar) => pillar.key === "day");
  const leftTrait = getStemTrait(left.raw.dayMaster);
  const rightTrait = getStemTrait(right.raw.dayMaster);
  if (leftTrait && rightTrait) {
    if (leftTrait.element === rightTrait.element) { score += 5; evidence.push(`双方日主同属${leftTrait.element}，节奏与关注点较容易互相理解`); }
    else if (leftTrait.yinYang !== rightTrait.yinYang) { score += 3; evidence.push(`双方日主阴阳不同，互动中可能形成互补`); }
    else { score -= 2; evidence.push(`双方日主五行分别为${leftTrait.element}/${rightTrait.element}，需要协调表达节奏`); }
  }
  if (leftDay && rightDay) {
    const pair = `${leftDay.earthlyBranch}${rightDay.earthlyBranch}`;
    const reverse = `${rightDay.earthlyBranch}${leftDay.earthlyBranch}`;
    if (BRANCH_HARMONY[pair] || BRANCH_HARMONY[reverse]) { score += 10; relations.push({ type: "六合", left: "日支", right: "日支", detail: `${leftDay.earthlyBranch} × ${rightDay.earthlyBranch}，共同目标容易形成黏合`, tone: "positive" }); evidence.push(`夫妻宫地支${leftDay.earthlyBranch}/${rightDay.earthlyBranch}见六合倾向，适合通过共同目标建立稳定互动`); }
    if (BRANCH_CLASH[pair] || BRANCH_CLASH[reverse]) { score -= 10; relations.push({ type: "六冲", left: "日支", right: "日支", detail: `${leftDay.earthlyBranch} × ${rightDay.earthlyBranch}，节奏与边界容易正面碰撞`, tone: "negative" }); evidence.push(`夫妻宫地支${leftDay.earthlyBranch}/${rightDay.earthlyBranch}见相冲倾向，冲突处理方式比“合不合”更重要`); }
  }
  const leftPillars = left.raw.pillars;
  const rightPillars = right.raw.pillars;
  for (const leftPillar of leftPillars) for (const rightPillar of rightPillars) {
    if (leftPillar.key === "day" && rightPillar.key === "day") continue;
    const pair = `${leftPillar.earthlyBranch}${rightPillar.earthlyBranch}`;
    const reverse = `${rightPillar.earthlyBranch}${leftPillar.earthlyBranch}`;
    const type = BRANCH_HARMONY[pair] || BRANCH_HARMONY[reverse] ? "六合" : BRANCH_CLASH[pair] || BRANCH_CLASH[reverse] ? "六冲" : BRANCH_PUNISH[pair] || BRANCH_PUNISH[reverse] ? "相刑" : BRANCH_HARM[pair] || BRANCH_HARM[reverse] ? "六害" : BRANCH_BREAK[pair] || BRANCH_BREAK[reverse] ? "六破" : null;
    if (type && !relations.some((item) => item.type === type && item.left === `${leftPillar.key}柱` && item.right === `${rightPillar.key}柱`)) {
      relations.push({ type, left: `${leftPillar.key}柱`, right: `${rightPillar.key}柱`, detail: `${leftPillar.earthlyBranch} × ${rightPillar.earthlyBranch}`, tone: type === "六合" ? "positive" : "negative" });
    }
  }
  const shared = left.raw.wuXing.filter((element) => right.raw.wuXing.includes(element));
  if (shared.length) { score += Math.min(6, shared.length); evidence.push(`两盘共同出现五行：${shared.join("、")}`); }
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

