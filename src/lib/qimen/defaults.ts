import type { ChartSequenceInput, SequenceStep } from "./sequence";
import type { UserChartInput } from "./types";

const FALLBACK_TIME_ZONE = "Asia/Shanghai";
const DEFAULT_SEQUENCE_STEP: SequenceStep = "double-hour";
const formatterCache = new Map<string, Intl.DateTimeFormat>();

const pad = (value: number) => String(value).padStart(2, "0");

const getFormatter = (timeZone: string) => {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
};

const isValidTimeZone = (timeZone: string) => {
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
};

const normalizeTimeZone = (timeZone?: string) => {
  if (timeZone && isValidTimeZone(timeZone)) {
    return timeZone;
  }

  return FALLBACK_TIME_ZONE;
};

const formatDateTimeInputInZone = (date: Date, timeZone: string) => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const valueByType = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return [
    valueByType.year,
    "-",
    valueByType.month,
    "-",
    valueByType.day,
    "T",
    valueByType.hour,
    ":",
    valueByType.minute,
  ].join("");
};

const shiftLocalDateTimeByDays = (datetime: string, days: number) => {
  const match = datetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`无法解析默认日期时间: ${datetime}`);
  }

  const [, year, month, day, hour, minute] = match;
  const shifted = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day) + days,
      Number(hour),
      Number(minute),
    ),
  );

  return [
    shifted.getUTCFullYear(),
    "-",
    pad(shifted.getUTCMonth() + 1),
    "-",
    pad(shifted.getUTCDate()),
    "T",
    pad(shifted.getUTCHours()),
    ":",
    pad(shifted.getUTCMinutes()),
  ].join("");
};

export const getResolvedTimeZone = (resolvedTimeZone?: string) =>
  normalizeTimeZone(resolvedTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);

export const getDefaultChartInput = (
  now = new Date(),
  resolvedTimeZone?: string,
): UserChartInput => {
  const timeZone = getResolvedTimeZone(resolvedTimeZone);

  return {
    datetime: formatDateTimeInputInZone(now, timeZone),
    timeZone,
  };
};

export const getDefaultSequenceInput = (
  now = new Date(),
  resolvedTimeZone?: string,
): ChartSequenceInput => {
  const chartInput = getDefaultChartInput(now, resolvedTimeZone);

  return {
    startDatetime: chartInput.datetime,
    endDatetime: shiftLocalDateTimeByDays(chartInput.datetime, 1),
    timeZone: chartInput.timeZone,
    step: DEFAULT_SEQUENCE_STEP,
  };
};

export const getSelectableTimeZones = (
  activeTimeZone: string,
  presetTimeZones: string[],
) =>
  Array.from(new Set([normalizeTimeZone(activeTimeZone), ...presetTimeZones]));
