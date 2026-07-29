import { Lunar } from "lunar-typescript";
import { formatDateTimeInZone, toZonedDate } from "@/lib/qimen/timezone";
import type { NormalizedProfileInput, ProfileInput } from "./types";

const pad = (value: number) => String(value).padStart(2, "0");

const toDateTimeInputValue = ({
  year,
  month,
  day,
  hour,
  minute,
}: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}) => `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;

const normalizeDateTime = (input: ProfileInput) => {
  if (input.calendarMode === "lunar" && input.lunar) {
    const lunarMonth = input.lunar.isLeapMonth
      ? -input.lunar.month
      : input.lunar.month;
    const solar = Lunar.fromYmdHms(
      input.lunar.year,
      lunarMonth,
      input.lunar.day,
      input.lunar.hour ?? 0,
      input.lunar.minute ?? 0,
      0,
    ).getSolar();

    return toDateTimeInputValue({
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
      hour: solar.getHour(),
      minute: solar.getMinute(),
    });
  }

  return input.datetime;
};

const parseDateTime = (datetime: string) => {
  const match = datetime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error(`无法解析日期时间: ${datetime}`);
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

const getDayOfYear = ({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) => {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / (24 * 60 * 60 * 1000));
};

const getTimeZoneOffsetMinutes = (datetime: string, timeZone: string) => {
  const parts = parseDateTime(datetime);
  const zonedDate = toZonedDate(datetime, timeZone);
  const naiveUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );

  return (naiveUtc - zonedDate.getTime()) / (60 * 1000);
};

const applyTrueSolarCorrection = (
  datetime: string,
  timeZone: string,
  longitude: number,
) => {
  const parts = parseDateTime(datetime);
  const dayOfYear = getDayOfYear(parts);
  const b = ((360 / 364) * (dayOfYear - 81) * Math.PI) / 180;
  const equationOfTime =
    9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const offsetHours = getTimeZoneOffsetMinutes(datetime, timeZone) / 60;
  const localStandardMeridian = offsetHours * 15;
  const correctionMinutes =
    4 * (longitude - localStandardMeridian) + equationOfTime;
  const civilDate = toZonedDate(datetime, timeZone);
  const correctedDate = new Date(
    Math.round((civilDate.getTime() + correctionMinutes * 60 * 1000) / 60000) *
      60000,
  );

  return formatDateTimeInZone(correctedDate, timeZone).slice(0, 16).replace(" ", "T");
};

export const normalizeProfileInput = (
  input: ProfileInput,
): NormalizedProfileInput => {
  const civilDateTime = normalizeDateTime(input);
  const normalizedDateTime =
    input.timeBasis === "true-solar" && input.location?.longitude !== undefined
      ? applyTrueSolarCorrection(civilDateTime, input.timeZone, input.location.longitude)
      : civilDateTime;

  return {
    original: input,
    normalized: {
      datetime: normalizedDateTime,
      timeZone: input.timeZone,
      calendarMode: input.calendarMode,
      timeBasis: input.timeBasis,
    },
  };
};
