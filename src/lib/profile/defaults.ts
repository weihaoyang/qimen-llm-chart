import { getResolvedTimeZone } from "@/lib/qimen/defaults";
import { DEFAULT_QIMEN_SETTINGS } from "@/lib/qimen/settings";
import type { ProfileInput } from "./types";

const pad = (value: number) => String(value).padStart(2, "0");

const formatLocalDateTime = (date: Date) =>
  [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");

export const getDefaultProfileInput = (
  now = new Date(),
  resolvedTimeZone?: string,
): ProfileInput => {
  const timeZone = getResolvedTimeZone(resolvedTimeZone);

  return {
    calendarMode: "solar",
    datetime: formatLocalDateTime(now),
    timeZone,
    gender: "male",
    timeBasis: "civil",
    qimenSettings: DEFAULT_QIMEN_SETTINGS,
    solar: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    },
  };
};
