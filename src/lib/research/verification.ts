import { calculateBazi } from "taibu-core/bazi";
import { calculateZiwei } from "taibu-core/ziwei";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import type { NormalizedZiweiChart } from "@/lib/ziwei/types";
import type { VerificationData, VerificationRow } from "./types";

const parseDateTime = (datetime: string) => {
  const match = datetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`无法解析日期时间: ${datetime}`);
  const [, year, month, day, hour, minute] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute) };
};

const row = (value: Omit<VerificationRow, "status">): VerificationRow => ({
  ...value,
  status: value.primary === value.reference ? "match" : "difference",
});

export const buildVerificationData = ({ profile, qimen, bazi, ziwei }: { profile: NormalizedProfileInput; qimen: NormalizedQimenChart | null; bazi: NormalizedBaziChart | null; ziwei: NormalizedZiweiChart | null }): VerificationData => {
  const parts = parseDateTime(profile.normalized.datetime);
  const input = {
    birthYear: parts.year,
    birthMonth: parts.month,
    birthDay: parts.day,
    birthHour: parts.hour,
    birthMinute: parts.minute,
    gender: profile.original.gender === "male" ? "male" as const : "female" as const,
    longitude: profile.original.location?.longitude,
  };
  const rows: VerificationRow[] = [];

  if (bazi) {
    const reference = calculateBazi(input);
    const referencePillars = [reference.fourPillars.year, reference.fourPillars.month, reference.fourPillars.day, reference.fourPillars.hour].map((pillar) => `${pillar.stem}${pillar.branch}`);
    rows.push(row({ system: "八字", field: "四柱", primary: bazi.raw.baZi.join(" "), reference: referencePillars.join(" "), note: "比较年、月、日、时四柱干支；差异通常来自时间口径或历法分界。" }));
    rows.push(row({ system: "八字", field: "日主", primary: bazi.raw.dayMaster, reference: reference.dayMaster, note: "仅比较日主干，不把算法差异直接解释为吉凶。" }));
  } else {
    rows.push({ system: "八字", field: "四柱", primary: "未生成", reference: "未生成", status: "unavailable", note: "当前没有八字盘面。" });
  }

  if (ziwei) {
    const reference = calculateZiwei(input);
    rows.push(row({ system: "紫微", field: "公历日期", primary: ziwei.raw.solarDate, reference: reference.solarDate, note: "比较同一出生档案归一化后的公历日期。" }));
    rows.push(row({ system: "紫微", field: "十二宫数量", primary: String(ziwei.raw.palaces.length), reference: String(reference.palaces.length), note: "仅确认盘面结构完整性，不代表星曜解释一致。" }));
  } else {
    rows.push({ system: "紫微", field: "基础盘面", primary: "未生成", reference: "未生成", status: "unavailable", note: "当前没有紫微盘面。" });
  }

  if (qimen) {
    const usesAlternateMethod = qimen.input.qimenSettings?.method !== "default";
    rows.push({
      system: "奇门",
      field: "参考引擎",
      primary: qimen.engine,
      reference: "taibu-core/qimen",
      status: usesAlternateMethod ? "unavailable" : "unavailable",
      note: usesAlternateMethod ? "当前盘使用拆补/茅山口径，参考引擎只用于默认转盘；等待单独核验。" : "参考引擎为异步计算，盘面生成后补充局数、遁 type、值符值使比较。",
    });
  }

  return {
    rows,
    generatedAt: new Date().toISOString(),
    disclaimer: "核验层只报告不同算法源的输入和输出差异，不把某一算法自动认定为唯一正确。",
  };
};

export const buildQimenReferenceVerification = async (profile: NormalizedProfileInput, qimen: NormalizedQimenChart): Promise<VerificationRow[]> => {
  if (qimen.input.qimenSettings?.method !== "default") return [];
  const { calculateQimen } = await import("taibu-core/qimen");
  const parts = parseDateTime(profile.normalized.datetime);
  const reference = await calculateQimen({ year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, timezone: profile.normalized.timeZone });
  const rows: VerificationRow[] = [];
  rows.push(row({ system: "奇门", field: "阴阳遁", primary: qimen.raw.ju.type, reference: reference.dunType === "yang" ? "阳遁" : "阴遁", note: "只比较默认转盘口径；拆补和茅山方法不在此处强行对齐。" }));
  rows.push(row({ system: "奇门", field: "局数", primary: String(qimen.raw.ju.number), reference: String(reference.juNumber), note: "局数差异应回到节气、年界和用局法逐项排查。" }));
  rows.push(row({ system: "奇门", field: "值符", primary: `${qimen.raw.zhiFu.star}/${qimen.raw.zhiFu.position}宫`, reference: `${reference.zhiFu.star}/${reference.zhiFu.palace}宫`, note: "值符宫位以各引擎自身九宫编号为准。" }));
  rows.push(row({ system: "奇门", field: "值使", primary: `${qimen.raw.zhiShi.gate}/${qimen.raw.zhiShi.position}宫`, reference: `${reference.zhiShi.gate}/${reference.zhiShi.palace}宫`, note: "值使宫位差异只作为核验提示，不直接生成结论。" }));
  return rows;
};
