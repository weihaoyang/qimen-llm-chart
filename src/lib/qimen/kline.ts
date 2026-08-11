import type { ChartSequenceItem } from "./sequence";
import type { NormalizedQimenChart } from "./types";

export type KlineKind = "life" | "relationship";
export type KlineScale = "double-hour" | "day" | "month" | "year";
export type KlinePhase = "上行" | "下行" | "震荡";

export type KlinePoint = {
  index: number;
  datetime: string;
  score: number;
  delta: number;
  phase: KlinePhase;
  label: string;
  keyPoint: string;
  prediction: string;
  evidence: string[];
};

export type KlineSeries = {
  kind: KlineKind;
  title: string;
  disclaimer: string;
  methodology: string;
  points: KlinePoint[];
  keyPoints: KlinePoint[];
  sourceCount: number;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const includesAny = (value: unknown, terms: readonly string[]) =>
  typeof value === "string" && terms.some((term) => value.includes(term));

const palaceLabel = (chart: NormalizedQimenChart, position: number) => {
  const palace = chart.palaceMap[position];
  if (!palace) return `${position}宫`;
  return `${position}宫${palace.trigram ?? ""}`;
};

const scoreChart = (chart: NormalizedQimenChart, kind: KlineKind) => {
  const positiveGates = ["开门", "生门", "休门", "景门"];
  const negativeGates = ["死门", "惊门", "伤门", "杜门"];
  const relationshipPositive = ["休门", "生门"];
  const relationshipNegative = ["伤门", "惊门", "死门"];
  const positiveDeities = ["六合", "太阴", "九地"];
  const negativeDeities = ["白虎", "玄武", "腾蛇"];
  let total = 50;
  const evidence: string[] = [];
  let count = 0;

  chart.raw.palaces.forEach((palace) => {
    count += 1;
    const gate = String(palace.gate ?? "");
    const deity = String(palace.deity ?? "");
    const gatePositive = kind === "relationship" ? relationshipPositive : positiveGates;
    const gateNegative = kind === "relationship" ? relationshipNegative : negativeGates;
    if (gatePositive.some((term) => gate.includes(term))) {
      total += 3;
      evidence.push(`${palaceLabel(chart, palace.position)} ${gate}提供支持`);
    }
    if (gateNegative.some((term) => gate.includes(term))) {
      total -= 3;
      evidence.push(`${palaceLabel(chart, palace.position)} ${gate}形成阻滞`);
    }
    if (positiveDeities.some((term) => deity.includes(term))) {
      total += kind === "relationship" ? 3 : 1;
      evidence.push(`${palaceLabel(chart, palace.position)} ${deity}偏向协同`);
    }
    if (negativeDeities.some((term) => deity.includes(term))) {
      total -= kind === "relationship" ? 3 : 1;
      evidence.push(`${palaceLabel(chart, palace.position)} ${deity}提示摩擦`);
    }
    if (palace.isZhiFu) {
      total += 4;
      evidence.push(`${palaceLabel(chart, palace.position)}为值符宫`);
    }
    if (palace.isZhiShi) {
      total += 2;
      evidence.push(`${palaceLabel(chart, palace.position)}为值使宫`);
    }
    if (palace.isPostHorse) {
      total += 2;
      evidence.push(`${palaceLabel(chart, palace.position)}见驿马，变化/行动性增强`);
    }
    if (palace.voidness?.hasVoidness) {
      total -= 3;
      evidence.push(`${palaceLabel(chart, palace.position)}空亡，需现实复核`);
    }
    if (includesAny(palace.gatePressure, ["门迫", "迫"])) {
      total -= 2;
      evidence.push(`${palaceLabel(chart, palace.position)}门迫，执行阻力增加`);
    }
    const status = `${palace.status?.gate ?? ""}${palace.status?.star ?? ""}`;
    if (includesAny(status, ["旺", "相", "休"])) total += 1;
    if (includesAny(status, ["囚", "死"])) total -= 1;
  });

  const score = clamp(Math.round(total / Math.max(count, 1) * 2));
  return { score, evidence: evidence.slice(0, 8) };
};

const phaseFor = (delta: number): KlinePhase =>
  delta >= 4 ? "上行" : delta <= -4 ? "下行" : "震荡";

const predictionFor = (score: number, phase: KlinePhase, kind: KlineKind) => {
  const subject = kind === "relationship" ? "关系互动" : "行动与人生推进";
  if (phase === "上行" && score >= 60) return `未来1–2个序列点，${subject}的支持条件可能延续；先把可执行动作落地并记录反馈。`;
  if (phase === "下行" && score <= 40) return `未来1–2个序列点，${subject}的阻滞条件可能持续；先降低不可逆承诺，核验具体风险来源。`;
  return `趋势处于${phase}，暂不足以外推确定事件；等待下一序列点与现实反馈后再复盘。`;
};

const keyPointReason = (score: number, delta: number, index: number, length: number) =>
  index === 0 ? "序列起点" : index === length - 1 ? "序列终点" : Math.abs(delta) >= 8 ? "分数跃迁" : score >= 70 ? "进入高位区间" : score <= 30 ? "进入低位区间" : "";

export const buildQimenKline = (sequence: ChartSequenceItem[], kind: KlineKind): KlineSeries => {
  if (sequence.length < 2) {
    return {
      kind,
      title: kind === "life" ? "人生 K 线" : "感情 K 线",
      disclaimer: "至少生成 2 张奇门序列盘后才能计算 K 线。",
      methodology: "K 线分数来自序列盘字段的确定性加权，不是金融市场行情，也不是确定预言。",
      points: [],
      keyPoints: [],
      sourceCount: sequence.length,
    };
  }
  let previous = 50;
  const points = sequence.map((item, index) => {
    const { score, evidence } = scoreChart(item.chart, kind);
    const delta = index === 0 ? 0 : score - previous;
    const phase = phaseFor(delta);
    const reason = keyPointReason(score, delta, index, sequence.length);
    const point: KlinePoint = {
      index,
      datetime: item.input.datetime,
      score,
      delta,
      phase,
      label: item.chart.raw.timeInfo.solarTerm ? `${item.chart.raw.timeInfo.solarTerm} · ${item.input.datetime.slice(0, 10)}` : item.input.datetime.slice(0, 16),
      keyPoint: reason,
      prediction: predictionFor(score, phase, kind),
      evidence,
    };
    previous = score;
    return point;
  });
  const keyPoints = points.filter((point) => point.keyPoint).slice(0, 5);
  return {
    kind,
    title: kind === "life" ? "人生 K 线" : "感情 K 线",
    disclaimer: "这是基于奇门序列盘的条件性趋势提示，不是金融市场预测，也不是确定预言；感情线不替第三方断言想法或结果。",
    methodology: "每个点按门、星、神、值符/值使、驿马、空亡、门迫与旺衰做固定加权；同一输入始终得到同一分数，并保留盘面证据。",
    points,
    keyPoints,
    sourceCount: sequence.length,
  };
};
