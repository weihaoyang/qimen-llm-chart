import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { buildBaziRelationSummary, serializeBaziToCompactJson, serializeBaziToStructuredText } from "@/lib/bazi/serializer";
import { normalizeProfileInput } from "@/lib/profile/normalize";
import type { Gender } from "@/lib/profile/types";
import { buildZiweiChartFromProfile } from "@/lib/ziwei/chart";
import { serializeZiweiToCompactJson, serializeZiweiToStructuredText } from "@/lib/ziwei/serializer";
import { LunarUtil } from "lunar-typescript";

export type HistoricalBenchmarkBirth = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  gender?: string;
};

export type HistoricalBenchmarkContext = {
  structuredText: string;
  jsonPayload: string;
  targetYear: number | null;
  candidateYears: number[];
  timeConvention: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const targetYearFrom = (question: string) => {
  const match = question.match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
};

const toGender = (value: string | undefined): Gender =>
  value === "女" || value?.toLowerCase() === "female" ? "female" : "male";

const BRANCH_RELATIONS = [
  ["六合", ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]],
  ["六冲", ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"]],
  ["六害", ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"]],
  ["六破", ["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"]],
] as const;

const pairIs = (left: string, right: string, pairs: readonly string[]) => pairs.some((pair) => pair === `${left}${right}` || pair === `${right}${left}`);

const branchInteractions = (branch: string, chart: ReturnType<typeof buildBaziChartFromProfile>) =>
  chart.raw.pillars.flatMap((pillar) => BRANCH_RELATIONS.flatMap(([name, pairs]) =>
    pairIs(branch, pillar.earthlyBranch, pairs) ? [`${branch}与${pillar.key === "year" ? "年" : pillar.key === "month" ? "月" : pillar.key === "day" ? "日" : "时"}支${pillar.earthlyBranch}${name}`] : [],
  ));

/**
 * Rebuilds the benchmark context with the same product calculators and
 * serializers that feed the Agent in the UI. Historical datasets often retain
 * only a civil birth clock, so this deliberately never pretends to have a
 * verified birthplace/time-zone or true-solar correction.
 */
export const buildHistoricalBenchmarkContext = ({
  birth,
  question,
  candidateYears: suppliedCandidateYears = [],
}: {
  birth: HistoricalBenchmarkBirth;
  question: string;
  /** Years found in answer options. They are time slices to compare, not labels. */
  candidateYears?: readonly number[];
}): HistoricalBenchmarkContext => {
  const hour = birth.hour ?? 12;
  const minute = birth.minute ?? 0;
  const profile = normalizeProfileInput({
    calendarMode: "solar",
    datetime: `${birth.year}-${pad(birth.month)}-${pad(birth.day)}T${pad(hour)}:${pad(minute)}`,
    // The calculators use the supplied civil clock unless true-solar is chosen.
    // UTC is a neutral label here; it must not be interpreted as a verified
    // birthplace for public benchmark records.
    timeZone: "Etc/UTC",
    gender: toGender(birth.gender),
    timeBasis: "civil",
    solar: { year: birth.year, month: birth.month, day: birth.day, hour, minute },
  });
  const targetYear = targetYearFrom(question);
  const candidateYears = [...new Set([
    ...(targetYear ? [targetYear] : []),
    ...suppliedCandidateYears.filter((year) => Number.isInteger(year) && year >= 1800 && year <= 2200),
  ])].sort((left, right) => left - right);
  const referenceDate = targetYear ? new Date(Date.UTC(targetYear, 6, 1)) : undefined;
  const bazi = buildBaziChartFromProfile(profile);
  const ziwei = buildZiweiChartFromProfile(profile);
  const baziOptions = referenceDate ? { referenceDate } : undefined;
  const baziText = serializeBaziToStructuredText(bazi, baziOptions);
  const baziJson = JSON.parse(serializeBaziToCompactJson(bazi, baziOptions));
  const ziweiText = serializeZiweiToStructuredText(ziwei);
  const ziweiJson = JSON.parse(serializeZiweiToCompactJson(ziwei));
  const timingSlices = candidateYears.map((year) => {
    const timing = buildBaziRelationSummary(bazi, { referenceDate: new Date(Date.UTC(year, 6, 1)) }).timing;
    const age = year - birth.year + 1;
    const ziweiDecadal = ziwei.raw.palaces.find((palace) => age >= palace.decadal.range[0] && age <= palace.decadal.range[1]);
    return {
      year,
      age,
      liuNian: timing.liuNian,
      liuNianTenGod: LunarUtil.SHI_SHEN[`${bazi.raw.dayMaster}${timing.liuNian.ganZhi[0]}`] ?? null,
      liuNianBranchInteractions: branchInteractions(timing.liuNian.ganZhi[1] ?? "", bazi),
      daYun: timing.currentDaYun ? {
        ganZhi: timing.currentDaYun.ganZhi,
        years: [timing.currentDaYun.startYear, timing.currentDaYun.endYear],
        ages: [timing.currentDaYun.startAge, timing.currentDaYun.endAge],
        stemTenGod: LunarUtil.SHI_SHEN[`${bazi.raw.dayMaster}${timing.currentDaYun.ganZhi[0]}`] ?? null,
        branchInteractions: branchInteractions(timing.currentDaYun.ganZhi[1] ?? "", bazi),
      } : null,
      ziweiDecadalPalace: ziweiDecadal ? `${ziweiDecadal.name} ${ziweiDecadal.decadal.range.join("-")}岁` : null,
    };
  });
  const targetAge = targetYear ? targetYear - birth.year + 1 : null;
  const activeZiweiDecadal = targetAge
    ? ziwei.raw.palaces.find((palace) => targetAge >= palace.decadal.range[0] && targetAge <= palace.decadal.range[1])
    : null;
  const timingNote = targetYear
    ? [
        `目标年份: ${targetYear}`,
        `目标虚岁（出生年计 1）: ${targetAge}`,
        `紫微对应大限: ${activeZiweiDecadal ? `${activeZiweiDecadal.name} ${activeZiweiDecadal.decadal.range.join("-")}岁` : "未在已提供大限范围内"}`,
      ].join("\n")
    : "本题未出现明确年份，仅提供本命结构；不得补造流年结论。";
  const timeConvention = "公开题只保留民用出生时钟；本上下文使用 civil / 不启用真太阳时，时区不视为已核验出生地。";
  const candidateTimingText = timingSlices.length
    ? [
        "### 候选年份时间切片（产品引擎）",
        "以下每一项都对应选项中出现的年份。必须横向比较这些切片；不得用未列出的当前年份替代。",
        ...timingSlices.map((slice) => [
          `- ${slice.year}（虚岁 ${slice.age}）`,
          `流年: ${slice.liuNian.calendarYear} ${slice.liuNian.ganZhi}（${slice.liuNian.xun} / ${slice.liuNian.xunKong}）`,
          `流年十神: ${slice.liuNianTenGod ?? "无"}；流年支触发: ${slice.liuNianBranchInteractions.join("、") || "无"}`,
          `大运: ${slice.daYun ? `${slice.daYun.ganZhi}（${slice.daYun.stemTenGod ?? "无"}）${slice.daYun.years.join("-")} / ${slice.daYun.ages.join("-")}岁；大运支触发: ${slice.daYun.branchInteractions.join("、") || "无"}` : "未在已提供范围"}`,
          `紫微大限: ${slice.ziweiDecadalPalace ?? "未在已提供范围"}`,
        ].join("；")),
      ].join("\n")
    : "本题与选项均未提供明确年份，仅提供本命结构；不得补造流年结论。";

  return {
    targetYear,
    candidateYears,
    timeConvention,
    structuredText: [
      "### 历史题时间口径",
      timeConvention,
      timingNote,
      candidateTimingText,
      "",
      "### 八字（产品引擎）",
      baziText,
      "",
      "### 紫微（产品引擎）",
      ziweiText,
    ].join("\n"),
    jsonPayload: JSON.stringify({
      format: "qmdj-history-benchmark-context-v1",
      timeConvention,
      targetYear,
      candidateYears,
      timingSlices,
      targetAge,
      ziweiDecadalPalace: activeZiweiDecadal?.name ?? null,
      bazi: baziJson,
      ziwei: ziweiJson,
    }),
  };
};
