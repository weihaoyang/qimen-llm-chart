import type { NormalizedProfileInput } from "@/lib/profile";

type CombinedChartPayload = {
  format: string;
  payload: unknown;
  structuredText?: string;
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
}) =>
  [
    "### 输入总览",
    `时间: ${input.original.datetime}`,
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
