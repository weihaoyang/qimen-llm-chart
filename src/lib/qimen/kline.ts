import type { ChartSequenceItem } from "./sequence";
import type { NormalizedQimenChart } from "./types";

export type KlineKind = "life" | "relationship";
export type KlineScale = "double-hour" | "day" | "month" | "year";
export type KlinePhase = "上行" | "下行" | "震荡";

export type KlinePoint = {
  index: number;
  datetime: string;
  /** OHLC values make every sequence point a real, reproducible candle. */
  open: number;
  high: number;
  low: number;
  close: number;
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

type RelationshipScaleProfile = {
  axis: number;
  outlet: number;
  context: number;
};

const relationshipProfiles: Record<KlineScale, RelationshipScaleProfile> = {
  "double-hour": { axis: 1.3, outlet: 1.25, context: 0.8 },
  day: { axis: 1.15, outlet: 1.1, context: 0.95 },
  month: { axis: 0.9, outlet: 0.95, context: 1.25 },
  year: { axis: 0.7, outlet: 0.8, context: 1.4 },
};

const palaceElements: Record<number, "木" | "火" | "土" | "金" | "水"> = {
  1: "水", 2: "土", 3: "木", 4: "木", 5: "土", 6: "金", 7: "金", 8: "土", 9: "火",
};

const generates: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const controls: Record<string, string> = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };
const branchPairs = new Set(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]);
const branchClashes = new Set(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"]);

const valuesOf = (value: unknown) => Array.isArray(value) ? value.map(String) : [String(value ?? "")];
const hasStem = (palace: NormalizedQimenChart["raw"]["palaces"][number], hiddenStem: string, stem: string) =>
  [...valuesOf(palace.heavenlyStem), ...valuesOf(palace.earthlyStem), hiddenStem].some((value) => value.includes(stem));
const firstBranch = (value: unknown) => valuesOf(value).find(Boolean) ?? "";
const gateSignal = (gate: string) => includesAny(gate, ["休门", "生门", "开门"]) ? 3 : includesAny(gate, ["死门", "惊门", "伤门", "杜门"]) ? -3 : 0;
const deitySignal = (deity: string) => includesAny(deity, ["六合", "太阴", "九地"]) ? 2 : includesAny(deity, ["白虎", "玄武", "腾蛇", "螣蛇"]) ? -2 : 0;
const starSignal = (star: string) => includesAny(star, ["天心", "天辅", "天任", "天英"]) ? 2 : includesAny(star, ["天芮", "天柱", "天禽"]) ? -2 : 0;

const palaceRelation = (from: number, to: number) => {
  const fromElement = palaceElements[from];
  const toElement = palaceElements[to];
  if (fromElement === toElement) return { score: 2, label: `${fromElement}同气` };
  if (generates[fromElement] === toElement || generates[toElement] === fromElement) return { score: 5, label: `${fromElement}${generates[fromElement] === toElement ? "生" : "受生于"}${toElement}` };
  if (controls[fromElement] === toElement || controls[toElement] === fromElement) return { score: -5, label: `${fromElement}${controls[fromElement] === toElement ? "克" : "受克于"}${toElement}` };
  return { score: 0, label: "五行关系平" };
};

const palaceStructureSignal = (palace: NormalizedQimenChart["raw"]["palaces"][number]) => {
  let score = 0;
  const reasons: string[] = [];
  const status = `${palace.status?.gate ?? ""}${palace.status?.star ?? ""}`;
  if (includesAny(status, ["旺", "相"])) { score += 2; reasons.push("旺相"); }
  if (includesAny(status, ["囚", "死"])) { score -= 2; reasons.push("囚死"); }
  const tomb = valuesOf(palace.tombInfo?.heavenlyStemInTomb).concat(valuesOf(palace.tombInfo?.earthlyStemInTomb));
  if (tomb.some((value) => value && value !== "无")) { score -= 2; reasons.push("入墓"); }
  if (palace.liuYiJiXing?.hasJiXing) { score -= 3; reasons.push("六仪击刑"); }
  const auspicious = palace.auspiciousPatterns?.length ?? 0;
  const inauspicious = palace.inauspiciousPatterns?.length ?? 0;
  if (auspicious) { score += Math.min(2, auspicious); reasons.push(`吉格${auspicious}`); }
  if (inauspicious) { score -= Math.min(2, inauspicious); reasons.push(`凶格${inauspicious}`); }
  const stemResponse = JSON.stringify(palace.tenStemResponse ?? {});
  if (includesAny(stemResponse, ["生", "合"])) { score += 1; reasons.push("干支关系有生合"); }
  if (includesAny(stemResponse, ["克", "刑"])) { score -= 1; reasons.push("干支关系有克刑"); }
  return { score, reasons };
};

const relationshipScore = (chart: NormalizedQimenChart, scale: KlineScale) => {
  const profile = relationshipProfiles[scale];
  const palaces = chart.raw.palaces;
  const findStemPalace = (stem: "乙" | "庚") => palaces.find((palace) => hasStem(palace, chart.hiddenStemsByPalace[palace.position] ?? "", stem));
  const yi = findStemPalace("乙");
  const geng = findStemPalace("庚");
  const zhiShi = palaces.find((palace) => palace.position === chart.raw.zhiShi?.position)
    ?? chart.palaceMap[chart.raw.zhiShi?.position];
  const zhiFu = palaces.find((palace) => palace.position === chart.raw.zhiFu?.position)
    ?? chart.palaceMap[chart.raw.zhiFu?.position];
  const evidence: string[] = [];
  let score = 50;

  if (!yi || !geng) {
    evidence.push(`乙庚未完整定位（乙：${yi ? palaceLabel(chart, yi.position) : "未定位"}；庚：${geng ? palaceLabel(chart, geng.position) : "未定位"}），本点降级为值使互动结构。`);
  } else {
    evidence.push(`乙在${palaceLabel(chart, yi.position)}，庚在${palaceLabel(chart, geng.position)}。`);
    if (yi.position === geng.position) {
      score += 14 * profile.axis;
      evidence.push("乙庚同宫，关系主轴出现直接接触。");
    } else {
      const interaction = palaceRelation(yi.position, geng.position);
      score += interaction.score * profile.axis;
      evidence.push(`乙庚落宫${interaction.label}，主轴${interaction.score >= 0 ? "较易衔接" : "存在牵制"}。`);
      const yiBranch = firstBranch(yi.earthBranch);
      const gengBranch = firstBranch(geng.earthBranch);
      if (yiBranch && gengBranch) {
        const pair = `${yiBranch}${gengBranch}`;
        const reverse = `${gengBranch}${yiBranch}`;
        if (branchPairs.has(pair) || branchPairs.has(reverse)) {
          score += 5 * profile.axis;
          evidence.push(`乙庚宫地支${yiBranch}${gengBranch}相合，互动有回旋余地。`);
        } else if (branchClashes.has(pair) || branchClashes.has(reverse)) {
          score -= 6 * profile.axis;
          evidence.push(`乙庚宫地支${yiBranch}${gengBranch}相冲，互动节奏易拉扯。`);
        }
      }
    }

    [yi, geng].forEach((palace, index) => {
      const role = index === 0 ? "乙" : "庚";
      const local = gateSignal(String(palace.gate ?? "")) + deitySignal(String(palace.deity ?? "")) + starSignal(String(palace.star ?? ""));
      if (local !== 0) {
        score += local * profile.axis;
        evidence.push(`${role}宫${palace.gate ?? ""}／${palace.star ?? ""}／${palace.deity ?? ""}${local > 0 ? "提供互动支持" : "提示关系摩擦"}。`);
      }
      if (palace.voidness?.hasVoidness) {
        score -= 4 * profile.axis;
        evidence.push(`${role}宫空亡，眼前条件须以现实回应复核。`);
      }
      if (includesAny(palace.gatePressure, ["门迫", "迫"])) {
        score -= 3 * profile.axis;
        evidence.push(`${role}宫门迫，推进成本上升。`);
      }
      const structure = palaceStructureSignal(palace);
      if (structure.score !== 0) {
        score += structure.score * profile.context;
        evidence.push(`${role}宫${structure.reasons.join("、")}，作为关系背景${structure.score > 0 ? "增益" : "减益"}。`);
      }
    });
  }

  if (zhiShi) {
    const outlet = gateSignal(String(chart.raw.zhiShi.gate ?? zhiShi.gate ?? ""));
    score += outlet * profile.outlet;
    evidence.push(`值使${chart.raw.zhiShi.gate ?? zhiShi.gate ?? ""}在${palaceLabel(chart, zhiShi.position)}，作为当前互动出口${outlet > 0 ? "可沟通、可推进" : outlet < 0 ? "宜先降速避险" : "偏中性"}。`);
    [yi, geng].filter(Boolean).forEach((palace) => {
      const link = palaceRelation(zhiShi.position, palace!.position);
      score += link.score * 0.55 * profile.outlet;
      evidence.push(`值使宫与${palace === yi ? "乙" : "庚"}宫${link.label}。`);
      if (zhiShi.position === palace!.position) score += 4 * profile.outlet;
    });
    const outletStructure = palaceStructureSignal(zhiShi);
    if (outletStructure.score !== 0) {
      score += outletStructure.score * 0.6 * profile.outlet;
      evidence.push(`值使宫${outletStructure.reasons.join("、")}，影响互动出口的可执行性。`);
    }
  } else {
    evidence.push("值使宫未定位，本点不使用互动出口加权。");
  }

  if (zhiFu) {
    const context = deitySignal(String(zhiFu.deity ?? "")) + starSignal(String(zhiFu.star ?? ""));
    score += context * profile.context;
    evidence.push(`值符在${palaceLabel(chart, zhiFu.position)}，${context > 0 ? "主导背景偏支持" : context < 0 ? "主导背景提示压力" : "主导背景中性"}。`);
  }
  if (yi && geng && (yi.isPostHorse || geng.isPostHorse)) {
    score += 2 * profile.axis;
    evidence.push("乙或庚临驿马，关系条件变化加快，宜用现实行动验证。");
  }
  if (chart.raw.specialPatterns?.wuBuYuShi) {
    score -= 2 * profile.context;
    evidence.push("见五不遇时，沟通与行动宜预留纠错空间。");
  }

  return { score: clamp(Math.round(score)), evidence: evidence.slice(0, 16) };
};

const scoreChart = (chart: NormalizedQimenChart, kind: KlineKind, scale: KlineScale = "double-hour") => {
  if (kind === "relationship") return relationshipScore(chart, scale);
  const positiveGates = ["开门", "生门", "休门", "景门"];
  const negativeGates = ["死门", "惊门", "伤门", "杜门"];
  const positiveDeities = ["六合", "太阴", "九地"];
  const negativeDeities = ["白虎", "玄武", "腾蛇"];
  let total = 50;
  const evidence: string[] = [];
  let count = 0;

  chart.raw.palaces.forEach((palace) => {
    count += 1;
    const gate = String(palace.gate ?? "");
    const deity = String(palace.deity ?? "");
    const gatePositive = positiveGates;
    const gateNegative = negativeGates;
    if (gatePositive.some((term) => gate.includes(term))) {
      total += 3;
      evidence.push(`${palaceLabel(chart, palace.position)} ${gate}提供支持`);
    }
    if (gateNegative.some((term) => gate.includes(term))) {
      total -= 3;
      evidence.push(`${palaceLabel(chart, palace.position)} ${gate}形成阻滞`);
    }
    if (positiveDeities.some((term) => deity.includes(term))) {
      total += 1;
      evidence.push(`${palaceLabel(chart, palace.position)} ${deity}偏向协同`);
    }
    if (negativeDeities.some((term) => deity.includes(term))) {
      total -= 1;
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

export const buildQimenKline = (sequence: ChartSequenceItem[], kind: KlineKind, scale: KlineScale = "double-hour"): KlineSeries => {
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
    const { score, evidence } = scoreChart(item.chart, kind, scale);
    const delta = index === 0 ? 0 : score - previous;
    const open = previous;
    const close = score;
    // The range is derived only from this chart's scored movement and evidence count,
    // so an identical sequence always produces the same candle geometry.
    const range = clamp(Math.round(4 + Math.abs(delta) * 0.45 + evidence.length * 0.35), 4, 12);
    const high = clamp(Math.max(open, close) + Math.ceil(range / 2));
    const low = clamp(Math.min(open, close) - Math.floor(range / 2));
    const phase = phaseFor(delta);
    const reason = keyPointReason(score, delta, index, sequence.length);
    const point: KlinePoint = {
      index,
      datetime: item.input.datetime,
      open,
      high,
      low,
      close,
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
    methodology: kind === "relationship"
      ? "以乙庚落宫为关系主轴，并按值使互动出口、值符背景、双方宫位五行/地支、门星神、旺衰、空亡、门迫、入墓、六仪击刑、十干克应、吉凶格、驿马与五不遇时固定加权；时辰、日、月、年采用不同权重。同一输入始终得到同一分数，并保留盘面证据。"
      : "每个点按门、星、神、值符/值使、驿马、空亡、门迫与旺衰做固定加权；同一输入始终得到同一分数，并保留盘面证据。",
    points,
    keyPoints,
    sourceCount: sequence.length,
  };
};
