import { Lunar, Solar } from "lunar-typescript";
import type { NormalizedProfileInput } from "@/lib/profile";
import type {
  BaziPillarDetail,
  BaziPillarKey,
  BaziYunPreview,
  NormalizedBaziChart,
} from "./types";
import { buildShenSha } from "./shen-sha";
import { buildBaziStructureAudit } from "./structure-audit";

type EightCharInstance = ReturnType<ReturnType<typeof Lunar.fromDate>["getEightChar"]>;

const parseNormalizedDateTime = (datetime: string) => {
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

const buildLunarFromProfile = (profile: NormalizedProfileInput) => {
  const { year, month, day, hour, minute } = parseNormalizedDateTime(
    profile.normalized.datetime,
  );

  if (profile.original.calendarMode === "lunar" && profile.original.lunar) {
    const lunarMonth = profile.original.lunar.isLeapMonth
      ? -profile.original.lunar.month
      : profile.original.lunar.month;

    return Lunar.fromYmdHms(
      profile.original.lunar.year,
      lunarMonth,
      profile.original.lunar.day,
      profile.original.lunar.hour ?? hour,
      profile.original.lunar.minute ?? minute,
      0,
    );
  }

  return Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
};

const shiftedLunar = (datetime: string, minuteDelta: number) => {
  const { year, month, day, hour, minute } = parseNormalizedDateTime(datetime);
  const shifted = new Date(Date.UTC(year, month - 1, day, hour, minute + minuteDelta));
  return Solar.fromYmdHms(
    shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(),
    shifted.getUTCHours(), shifted.getUTCMinutes(), 0,
  ).getLunar();
};

const buildBoundaryAudit = (datetime: string, current: string[]) => {
  const before = shiftedLunar(datetime, -30).getBaZi();
  const after = shiftedLunar(datetime, 30).getBaZi();
  const keys: BaziPillarKey[] = ["year", "month", "day", "time"];
  const changedPillars = keys.filter((_, index) => before[index] !== current[index] || after[index] !== current[index]);
  return {
    engineVersion: "bazi-boundary-audit-v1" as const,
    windowMinutes: 30 as const,
    sensitive: changedPillars.length > 0,
    changedPillars,
    before,
    current,
    after,
    note: changedPillars.length
      ? "出生时间前后30分钟会改变柱位；盲测失配时应优先按相邻盘回放，不能直接归因于人格映射。"
      : "出生时间前后30分钟四柱未变化。",
  };
};

const getPillarDetail = (
  key: BaziPillarKey,
  eightChar: EightCharInstance,
): BaziPillarDetail => {
  switch (key) {
    case "year":
      return {
        key,
        pillar: eightChar.getYear(),
        heavenlyStem: eightChar.getYearGan(),
        earthlyBranch: eightChar.getYearZhi(),
        hiddenStems: eightChar.getYearHideGan(),
        wuXing: eightChar.getYearWuXing(),
        naYin: eightChar.getYearNaYin(),
        shiShenGan: eightChar.getYearShiShenGan(),
        shiShenZhi: eightChar.getYearShiShenZhi(),
        diShi: eightChar.getYearDiShi(),
        xun: eightChar.getYearXun(),
        xunKong: eightChar.getYearXunKong(),
        shenSha: [],
      };
    case "month":
      return {
        key,
        pillar: eightChar.getMonth(),
        heavenlyStem: eightChar.getMonthGan(),
        earthlyBranch: eightChar.getMonthZhi(),
        hiddenStems: eightChar.getMonthHideGan(),
        wuXing: eightChar.getMonthWuXing(),
        naYin: eightChar.getMonthNaYin(),
        shiShenGan: eightChar.getMonthShiShenGan(),
        shiShenZhi: eightChar.getMonthShiShenZhi(),
        diShi: eightChar.getMonthDiShi(),
        xun: eightChar.getMonthXun(),
        xunKong: eightChar.getMonthXunKong(),
        shenSha: [],
      };
    case "day":
      return {
        key,
        pillar: eightChar.getDay(),
        heavenlyStem: eightChar.getDayGan(),
        earthlyBranch: eightChar.getDayZhi(),
        hiddenStems: eightChar.getDayHideGan(),
        wuXing: eightChar.getDayWuXing(),
        naYin: eightChar.getDayNaYin(),
        shiShenGan: eightChar.getDayShiShenGan(),
        shiShenZhi: eightChar.getDayShiShenZhi(),
        diShi: eightChar.getDayDiShi(),
        xun: eightChar.getDayXun(),
        xunKong: eightChar.getDayXunKong(),
        shenSha: [],
      };
    case "time":
      return {
        key,
        pillar: eightChar.getTime(),
        heavenlyStem: eightChar.getTimeGan(),
        earthlyBranch: eightChar.getTimeZhi(),
        hiddenStems: eightChar.getTimeHideGan(),
        wuXing: eightChar.getTimeWuXing(),
        naYin: eightChar.getTimeNaYin(),
        shiShenGan: eightChar.getTimeShiShenGan(),
        shiShenZhi: eightChar.getTimeShiShenZhi(),
        diShi: eightChar.getTimeDiShi(),
        xun: eightChar.getTimeXun(),
        xunKong: eightChar.getTimeXunKong(),
        shenSha: [],
      };
  }
};

const buildYunPreview = (
  gender: NormalizedProfileInput["original"]["gender"],
  eightChar: EightCharInstance,
): BaziYunPreview => {
  const yun = eightChar.getYun(gender === "male" ? 1 : 0, 1);

  return {
    startSolar: yun.getStartSolar().toYmdHms(),
    startOffset: {
      years: yun.getStartYear(),
      months: yun.getStartMonth(),
      days: yun.getStartDay(),
      hours: yun.getStartHour(),
    },
    direction: yun.isForward() ? "forward" : "backward",
    daYun: yun
      .getDaYun(8)
      .filter((item) => Boolean(item.getGanZhi()))
      .map((item) => ({
        index: item.getIndex(),
        ganZhi: item.getGanZhi(),
        xun: item.getXun(),
        xunKong: item.getXunKong(),
        startYear: item.getStartYear(),
        endYear: item.getEndYear(),
        startAge: item.getStartAge(),
        endAge: item.getEndAge(),
      })),
  };
};

export const buildBaziChartFromProfile = (
  profile: NormalizedProfileInput,
): NormalizedBaziChart => {
  const lunar = buildLunarFromProfile(profile);
  const solar = lunar.getSolar();
  const eightChar = lunar.getEightChar();
  const pillars = (["year", "month", "day", "time"] as const).map((key) =>
    getPillarDetail(key, eightChar),
  );
  const shenSha = buildShenSha(pillars, eightChar.getDayGan());
  pillars.forEach((pillar, index) => {
    pillar.shenSha = shenSha[index] ?? [];
  });
  const taiYuan = { pillar: eightChar.getTaiYuan(), naYin: eightChar.getTaiYuanNaYin() };
  const taiXi = { pillar: eightChar.getTaiXi(), naYin: eightChar.getTaiXiNaYin() };
  const mingGong = { pillar: eightChar.getMingGong(), naYin: eightChar.getMingGongNaYin() };
  const shenGong = { pillar: eightChar.getShenGong(), naYin: eightChar.getShenGongNaYin() };
  const structureAudit = buildBaziStructureAudit(pillars, eightChar.getDayGan(), lunar.getBaZiNaYin(), mingGong.pillar, shenGong.pillar);
  const boundaryAudit = buildBoundaryAudit(profile.normalized.datetime, lunar.getBaZi());

  return {
    input: profile,
    interpretedDateTime: profile.normalized.datetime,
    raw: {
      solar: solar.toYmdHms(),
      solarFull: solar.toFullString(),
      lunar: lunar.toString(),
      lunarFull: lunar.toFullString(),
      baZi: lunar.getBaZi(),
      dayMaster: eightChar.getDayGan(),
      wuXing: lunar.getBaZiWuXing(),
      naYin: lunar.getBaZiNaYin(),
      shiShenGan: lunar.getBaZiShiShenGan(),
      shiShenZhi: lunar.getBaZiShiShenZhi(),
      pillars,
      taiYuan,
      taiXi,
      mingGong,
      shenGong,
      structureAudit,
      boundaryAudit,
      yun: buildYunPreview(profile.original.gender, eightChar),
    },
  };
};
