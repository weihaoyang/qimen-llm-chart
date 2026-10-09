import type { NormalizedProfileInput } from "@/lib/profile";

type CombinedChartPayload = {
  format: string;
  payload: unknown;
  structuredText?: string;
};

/**
 * 三盘联合的时间口径。
 *
 * 默认三盘共用出生时间。勾选「三盘分别用不同时间」后，奇门用问事起局时间，
 * 八字/紫微仍用出生时间——这里把它显式写进上下文，避免模型把问事时间当出生时间。
 */
const combinedTimeBasis = (input: NormalizedProfileInput) => {
  const { splitChartTimes, questionDatetime, datetime } = input.original;
  return splitChartTimes && questionDatetime
    ? {
        note: "奇门用问事起局时间，八字/紫微用出生时间。",
        qimen: questionDatetime,
        bazi_ziwei: datetime,
      }
    : { combined: datetime };
};

export const serializeCombinedToCompactJson = ({
  input,
  qimen,
  bazi,
  ziwei,
}: {
  input: NormalizedProfileInput;
  qimen?: CombinedChartPayload;
  bazi?: CombinedChartPayload;
  ziwei?: CombinedChartPayload;
}) =>
  JSON.stringify({
    format: "meta-llm-combined-v1",
    note: "三盘联合阶段一仅做聚合，不包含程序断语。",
    timeBasis: combinedTimeBasis(input),
    input,
    charts: { qimen, bazi, ziwei },
  });

export const serializeCombinedToStructuredText = ({
  input,
  qimen,
  bazi,
  ziwei,
}: {
  input: NormalizedProfileInput;
  qimen?: CombinedChartPayload;
  bazi?: CombinedChartPayload;
  ziwei?: CombinedChartPayload;
}) => {
  const basis = combinedTimeBasis(input);
  const timeLines = "note" in basis
    ? [`时间口径: ${basis.note}`, `问事起局时间(奇门): ${basis.qimen}`, `出生时间(八字/紫微): ${basis.bazi_ziwei}`]
    : [];

  return [
    "### 输入总览",
    `时间: ${input.original.datetime}`,
    ...timeLines,
    `时区: ${input.original.timeZone}`,
    `解析后的本地时间: ${input.normalized.datetime}`,
    "",
    "### 奇门",
    qimen?.structuredText ?? "未生成",
    "",
    "### 八字",
    bazi?.structuredText ?? "未生成",
    "",
    "### 紫微",
    ziwei?.structuredText ?? "未生成",
  ].join("\n");
};
