import { buildChart } from "./chart";
import type { NormalizedQimenChart, UserChartInput } from "./types";

export type SequenceStep = "double-hour" | "day";

export type ChartSequenceInput = {
  startDatetime: string;
  endDatetime: string;
  timeZone: string;
  step: SequenceStep;
};

export type ChartSequenceItem = {
  index: number;
  input: UserChartInput;
  chart: NormalizedQimenChart;
};

const MAX_SEQUENCE_ITEMS = 120;

const parseDateTimeParts = (datetime: string) => {
  const match = datetime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error(`无法解析序列时间: ${datetime}`);
  }

  const [, year, month, day, hour, minute] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
};

const toUtcMillis = (datetime: string) => {
  const parts = parseDateTimeParts(datetime);
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
};

const pad = (value: number) => String(value).padStart(2, "0");

const fromUtcMillis = (value: number) => {
  const date = new Date(value);
  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    ":",
    pad(date.getUTCMinutes()),
  ].join("");
};

export const buildSequenceInputs = (
  input: ChartSequenceInput,
): UserChartInput[] => {
  if (!input.startDatetime || !input.endDatetime) {
    throw new Error("请输入序列起止日期时间。");
  }

  if (!input.timeZone) {
    throw new Error("请输入序列时区。");
  }

  const start = toUtcMillis(input.startDatetime);
  const end = toUtcMillis(input.endDatetime);

  if (end < start) {
    throw new Error("序列结束时间不能早于开始时间。");
  }

  const stepMs = input.step === "day" ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
  const result: UserChartInput[] = [];

  for (let current = start; current <= end; current += stepMs) {
    if (result.length >= MAX_SEQUENCE_ITEMS) {
      throw new Error(`序列最多生成 ${MAX_SEQUENCE_ITEMS} 个盘，请缩短时间范围。`);
    }

    result.push({
      datetime: fromUtcMillis(current),
      timeZone: input.timeZone,
    });
  }

  return result;
};

export const buildChartSequence = (
  input: ChartSequenceInput,
): ChartSequenceItem[] =>
  buildSequenceInputs(input).map((nextInput, index) => ({
    index,
    input: nextInput,
    chart: buildChart(nextInput),
  }));
