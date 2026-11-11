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
const HEAVENLY_GENERALS = ["贵人", "腾蛇", "朱雀", "六合", "勾陈", "青龙", "天空", "白虎", "太常", "玄武", "太阴", "天后"] as const;
type LiuRenPalace = ReturnType<typeof calculateDaliuren>["gongInfos"][number];
// 《探原》六十日表中标“改正涉害”的 24 课；仅列原表，不补推其他课。
const TANYUAN_SHEHAI: Record<string, string> = {
  "丁卯巳": "亥酉未", "丁卯亥": "亥卯未", "庚午辰": "子申辰", "庚午午": "寅子戌",
  "癸酉申": "亥午丑", "己卯巳": "亥酉未", "己卯亥": "亥卯未", "庚辰午": "寅子戌",
  "癸未酉": "卯亥未", "甲申戌": "子申辰", "己丑卯": "卯亥未", "庚寅辰": "子申辰",
  "辛卯寅": "亥卯未", "辛卯申": "亥酉未", "甲午子": "寅子戌", "己亥亥": "亥卯未",
  "癸卯亥": "亥酉未", "甲辰子": "寅子戌", "甲辰未": "子巳戌", "甲辰戌": "子申辰",
  "己酉卯": "卯亥未", "乙卯寅": "亥酉未", "乙卯申": "亥卯未", "乙卯亥": "午丑申",
};
export const tanYuanShehai = (day: string, upper: string): string | undefined => TANYUAN_SHEHAI[day + upper];


/** 以异说贵人所在天盘及所临地盘重新布将；原盘保持不变。 */
export const alternateLiuRenGenerals = (palaces: LiuRenPalace[], noble: string) => {
  if (palaces.length !== 12) return [];
  const start = palaces.findIndex((palace) => palace.tianZhi === noble);
  if (start < 0) return [];
  const earth = palaces[start].diZhi;
  if (!earth || !BRANCHES.includes(earth)) return [];
  const direction = "亥子丑寅卯辰".includes(earth) ? 1 : -1;
  const labels = Array<string>(12);
  HEAVENLY_GENERALS.forEach((general, offset) => { labels[(start + 12 + direction * offset) % 12] = general; });
  return palaces.map((palace, index) => ({ 地盘: palace.diZhi, 天盘: palace.tianZhi, 天将: labels[index] }));
};
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
  const alternateBranch = stemIndex >= 0 && (isDay || isNight) ? (isDay ? TAN_YUAN_DAY_NOBLES : TAN_YUAN_NIGHT_NOBLES)[stemIndex] : undefined;
  const alternateGenerals = alternateBranch ? alternateLiuRenGenerals(result.gongInfos, alternateBranch) : [];
  const alternateNoble = alternateBranch ? `《大六壬探原》${isDay ? "昼" : "夜"}贵在${alternateBranch}；另列天将对照，主盘不变` : undefined;
  const alternateLine = alternateGenerals.length === 12 ? `- 探原天将（天盘:天将）: ${alternateGenerals.map((palace) => `${palace.天盘}:${palace.天将}`).join("、")}` : "";
  const alternateTransmission = tanYuanShehai(result.dateInfo.ganZhi.day, result.siKe.yiKe[0]?.[0] ?? "");
  const mainTransmission = [result.sanChuan.chu[0], result.sanChuan.zhong[0], result.sanChuan.mo[0]].join("");
  const transmissionNote = alternateTransmission && alternateTransmission !== mainTransmission
    ? `《大六壬探原》六十日表的改正涉害三传为${[...alternateTransmission].join("、")}；主盘三传保持不变` : undefined;
  const annotations = [transmissionNote ? `- 涉害异说: ${transmissionNote}` : "", plate ? `- 天地盘: ${plate}` : "", subtype ? `- 课体细分: ${subtype}` : "", `- 贵人口径: ${nobleConvention}`, alternateNoble ? `- 贵人异说: ${alternateNoble}` : "", alternateLine].filter(Boolean);
  return {
    text: annotations.length ? text.replace("\n- 月将:", `\n${annotations.join("\n")}\n- 月将:`) : text,
    json: { ...json, 基本信息: { ...json.基本信息, ...(plate ? { 天地盘: plate } : {}), ...(subtype ? { 课体细分: subtype } : {}), ...(transmissionNote ? { 涉害异说: transmissionNote } : {}), 贵人口径: nobleConvention, ...(alternateNoble ? { 贵人异说: alternateNoble } : {}) }, ...(alternateGenerals.length === 12 ? { 探原天将对照: alternateGenerals } : {}) },
    referenceEngine: TAIBU_CORE_REFERENCE,
  };
};
