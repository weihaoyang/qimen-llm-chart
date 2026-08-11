import { calculateDaliuren, toDaliurenJson, toDaliurenText } from "taibu-core/daliuren";
import { calculateTaiyi, toTaiyiJson, toTaiyiText } from "taibu-core/taiyi";
import type { NormalizedProfileInput } from "@/lib/profile";

const parseDateTime = (datetime: string) => {
  const match = datetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`无法解析日期时间: ${datetime}`);
  const [, year, month, day, hour, minute] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute) };
};

export const buildDaliurenResearch = (profile: NormalizedProfileInput) => {
  const parts = parseDateTime(profile.normalized.datetime);
  const result = calculateDaliuren({
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    hour: parts.hour,
    minute: parts.minute,
    timezone: profile.normalized.timeZone,
  });
  return { text: toDaliurenText(result), json: toDaliurenJson(result) };
};

export const buildTaiyiResearch = (profile: NormalizedProfileInput) => {
  const parts = parseDateTime(profile.normalized.datetime);
  const result = calculateTaiyi({
    mode: "day",
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    hour: parts.hour,
    minute: parts.minute,
    timezone: profile.normalized.timeZone,
  });
  return { text: toTaiyiText(result), json: toTaiyiJson(result) };
};
