import { calculateBaziDayun, type DayunOutput } from "taibu-core/bazi-dayun";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { LifeTrendData, LifeTrendPoint, LifeTrendSignal } from "./types";
import type { KlinePoint, KlineSeries } from "@/lib/qimen/kline";

const parseDateTime = (datetime: string) => {
  const match = datetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`无法解析日期时间: ${datetime}`);
  const [, year, month, day, hour, minute] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute) };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const STAGE_SCORE: Record<string, number> = {
  帝旺: 3,
  临官: 2,
  长生: 2,
  冠带: 1,
  养: 1,
  沐浴: 0,
  胎: 0,
  衰: -1,
  墓: -2,
  病: -2,
  死: -3,
  绝: -3,
};

const SUPPORT_TERMS = ["天乙贵人", "太极贵人", "福星贵人", "文昌", "天喜", "红鸾", "三合", "六合"];
const REVIEW_TERMS = ["六冲", "相刑", "相害", "冲太岁", "刑太岁", "害太岁", "破太岁", "白虎", "劫煞", "灾煞", "亡神"];

const signalKind = (text: string): LifeTrendSignal["kind"] =>
  SUPPORT_TERMS.some((term) => text.includes(term)) ? "support" : "review";

const collectSignals = (dayun: DayunOutput["list"][number], year: DayunOutput["list"][number]["liunianList"][number]) => {
  const signals: LifeTrendSignal[] = [];
  const add = (text: string) => {
    if (!signals.some((signal) => signal.text === text)) signals.push({ kind: signalKind(text), text });
  };

  dayun.branchRelations.forEach((relation) => add(`大运${relation.type}：${relation.description}`));
  year.branchRelations.forEach((relation) => add(`流年${relation.type}：${relation.description}`));
  year.taiSui.forEach((item) => add(`流年${item}`));
  year.shenSha.filter((item) => SUPPORT_TERMS.some((term) => item.includes(term)) || REVIEW_TERMS.some((term) => item.includes(term))).slice(0, 3).forEach((item) => add(`流年神煞：${item}`));
  if (signals.length === 0) add(`流年十二长生：${year.diShi}`);
  return signals.slice(0, 6);
};

const scoreYear = (dayun: DayunOutput["list"][number], year: DayunOutput["list"][number]["liunianList"][number]) => {
  const terms = [dayun.diShi, year.diShi, ...dayun.branchRelations.map((item) => item.type), ...year.branchRelations.map((item) => item.type), ...year.taiSui, ...year.shenSha];
  let score = (STAGE_SCORE[dayun.diShi] ?? 0) + (STAGE_SCORE[year.diShi] ?? 0);
  terms.forEach((term) => {
    if (SUPPORT_TERMS.some((item) => term.includes(item))) score += 1;
    if (REVIEW_TERMS.some((item) => term.includes(item))) score -= 1;
  });
  return clamp(score, -8, 8);
};

const toPoint = (dayun: DayunOutput["list"][number], year: DayunOutput["list"][number]["liunianList"][number], previousClose: number): LifeTrendPoint => {
  const score = scoreYear(dayun, year);
  const close = clamp(50 + score * 5, 12, 88);
  const signals = collectSignals(dayun, year);
  const supportCount = signals.filter((signal) => signal.kind === "support").length;
  const reviewCount = signals.filter((signal) => signal.kind === "review").length;
  const open = previousClose;
  const high = clamp(Math.max(open, close) + 3 + supportCount * 2, 0, 100);
  const low = clamp(Math.min(open, close) - 3 - reviewCount * 2, 0, 100);
  return {
    year: year.year,
    age: year.age,
    ganZhi: year.ganZhi,
    dayunGanZhi: dayun.ganZhi,
    dayunStartYear: dayun.startYear,
    open,
    high,
    low,
    close,
    signals,
  };
};

export const buildLifeTrendData = (profile: NormalizedProfileInput): LifeTrendData => {
  const { year, month, day, hour, minute } = parseDateTime(profile.normalized.datetime);
  const dayun = calculateBaziDayun({
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthHour: hour,
    birthMinute: minute,
    gender: profile.original.gender === "male" ? "male" : "female",
  });
  const points: LifeTrendPoint[] = [];
  let previousClose = 50;
  dayun.list.forEach((entry) => {
    entry.liunianList.forEach((yearEntry) => {
      const point = toPoint(entry, yearEntry, previousClose);
      points.push(point);
      previousClose = point.close;
    });
  });

  return {
    startAge: dayun.startAge,
    startAgeDetail: dayun.startAgeDetail,
    direction: dayun.list.length > 1 && dayun.list[1].startYear > dayun.list[0].startYear ? "forward" : "backward",
    points,
    disclaimer: "K线仅把大运、流年、十二长生、关系与神煞整理成可复核的结构波动，不代表财富、健康或事件预测。",
  };
};

/** Adapt the existing Bazi dayun/liunian trend into the shared K-line view model. */
export const lifeTrendToKlineSeries = (trend: LifeTrendData): KlineSeries => {
  const points: KlinePoint[] = trend.points.map((point, index) => {
    const score = clamp(point.close, 0, 100);
    const previous = index === 0 ? 50 : clamp(trend.points[index - 1].close, 0, 100);
    const delta = score - previous;
    const phase = delta >= 4 ? "上行" : delta <= -4 ? "下行" : "震荡";
    const signals = point.signals.map((signal) => `${signal.kind === "support" ? "支持" : "待核"}：${signal.text}`);
    return {
      index,
      datetime: `${point.year}-01-01T00:00`,
      score,
      delta,
      phase,
      label: `${point.year} · ${point.age}岁 · ${point.ganZhi}`,
      keyPoint: index === 0 ? "起运序列起点" : index === trend.points.length - 1 ? "当前资料终点" : Math.abs(delta) >= 8 ? "结构跃迁" : score >= 70 ? "高位区间" : score <= 30 ? "低位区间" : "",
      prediction: phase === "上行" && score >= 60
        ? "未来相邻运年支持条件可能延续；把资源投入与现实反馈逐项记录。"
        : phase === "下行" && score <= 40
          ? "未来相邻运年阻滞条件可能延续；先核验边界、节奏与可逆选项。"
          : "当前结构处于震荡或证据不足，等待下一运年与现实反馈再复盘。",
      evidence: [`大运 ${point.dayunGanZhi}（${point.dayunStartYear} 起）`, `流年 ${point.ganZhi}`, `开 ${point.open} / 高 ${point.high} / 低 ${point.low} / 收 ${point.close}`, ...signals].slice(0, 8),
    };
  });
  return {
    kind: "life",
    title: "人生 K 线",
    disclaimer: trend.disclaimer,
    methodology: "人生线使用八字大运/流年、十二长生、干支关系与神煞生成；它不是金融市场行情，也不是事件概率。",
    points,
    keyPoints: points.filter((point) => point.keyPoint).slice(0, 5),
    sourceCount: points.length,
  };
};
