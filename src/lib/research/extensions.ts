import { getCivilDateTime } from "@/lib/profile/normalize";
import { toZonedDate } from "@/lib/qimen/timezone";
import { monthGeneralAt } from "./liuren-month-general";
import { calculateDaliuren, toDaliurenJson, toDaliurenText } from "taibu-core/daliuren";
import type { NormalizedProfileInput } from "@/lib/profile";
import { TAIBU_CORE_REFERENCE } from "./provenance";

const parseDateTime = (datetime: string) => {
  const match = datetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw new Error(`无法解析日期时间: ${datetime}`);
  const [, year, month, day, hour, minute] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute) };
};

const JING_LAN_DAYS = new Set(["丁丑", "己丑", "辛丑", "丁未", "己未", "辛未"]);

export const buildDaliurenResearch = (profile: NormalizedProfileInput) => {
  const parts = parseDateTime(profile.normalized.datetime);
  const input = {
    date: `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    hour: parts.hour,
    minute: parts.minute,
    timezone: profile.normalized.timeZone,
    monthGeneral: monthGeneralAt(toZonedDate(getCivilDateTime(profile), profile.normalized.timeZone)),
  };
  const result = calculateDaliuren(input);
  const text = toDaliurenText(result).replace(
    "| 地盘 | 天盘 (五行·旺衰) | 天将 | 遁干 |",
    "| 地盘 | 天盘 (五行·旺衰) | 天将 | 地盘遁干 |",
  );
  const json = toDaliurenJson(result);
  const isJingLan = result.keTi.method === "反吟" && JING_LAN_DAYS.has(result.dateInfo.ganZhi.day);
  const remoteType = result.keTi.method === "遥克" ? result.keTi.subTypes[0] : undefined;
  const subtype = isJingLan ? "井栏射" : remoteType === "蒿失" ? "蒿矢" : remoteType;
  return {
    text: subtype ? text.replace("\n- 月将:", `\n- 课体细分: ${subtype}\n- 月将:`) : text,
    json: subtype ? { ...json, 基本信息: { ...json.基本信息, 课体细分: subtype } } : json,
    referenceEngine: TAIBU_CORE_REFERENCE,
  };
};
