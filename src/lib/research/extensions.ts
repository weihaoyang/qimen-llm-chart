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
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const STEMS = "甲乙丙丁戊己庚辛壬癸";
// 《大六壬探原》日贵、夜贵歌，依十干甲至癸排列；仅作位置比较，不重排主盘天将。
const TAN_YUAN_DAY_NOBLES = "未申酉亥丑子丑寅卯巳";
const TAN_YUAN_NIGHT_NOBLES = "丑子亥酉未申未午巳卯";
export const classifyLiuRenPlate = (general: string, hourBranch: string | undefined) => {
  const generalIndex = general.length === 1 ? BRANCHES.indexOf(general) : -1;
  const hourIndex = hourBranch && hourBranch.length === 1 ? BRANCHES.indexOf(hourBranch) : -1;
  const distance = generalIndex < 0 || hourIndex < 0 ? -1 : (generalIndex - hourIndex + 12) % 12;
  return distance === 0 ? "伏吟" : distance === 6 ? "返吟" : undefined;
};

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
  const plate = classifyLiuRenPlate(result.dateInfo.yueJiang, result.dateInfo.ganZhi.hour[1]);
  const nobleConvention = "按《六壬存验》昼夜贵人口径；《大六壬探原》部分日干的昼夜贵人互换";
  const dayStem = result.dateInfo.ganZhi.day[0] ?? "";
  const stemIndex = dayStem.length === 1 ? STEMS.indexOf(dayStem) : -1;
  const hourBranch = result.dateInfo.ganZhi.hour[1] ?? "";
  const isDay = hourBranch.length === 1 && "卯辰巳午未申".includes(hourBranch);
  const isNight = hourBranch.length === 1 && "酉戌亥子丑寅".includes(hourBranch);
  const alternateNoble = stemIndex >= 0 && (isDay || isNight)
    ? `《大六壬探原》${isDay ? "昼" : "夜"}贵在${(isDay ? TAN_YUAN_DAY_NOBLES : TAN_YUAN_NIGHT_NOBLES)[stemIndex]}；仅对照贵人位置，未重排天将`
    : undefined;
  const annotations = [plate ? `- 天地盘: ${plate}` : "", subtype ? `- 课体细分: ${subtype}` : "", `- 贵人口径: ${nobleConvention}`, alternateNoble ? `- 贵人异说: ${alternateNoble}` : ""].filter(Boolean);
  return {
    text: annotations.length ? text.replace("\n- 月将:", `\n${annotations.join("\n")}\n- 月将:`) : text,
    json: { ...json, 基本信息: { ...json.基本信息, ...(plate ? { 天地盘: plate } : {}), ...(subtype ? { 课体细分: subtype } : {}), 贵人口径: nobleConvention, ...(alternateNoble ? { 贵人异说: alternateNoble } : {}) } },
    referenceEngine: TAIBU_CORE_REFERENCE,
  };
};
