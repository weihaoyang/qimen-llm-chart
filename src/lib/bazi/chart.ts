import { Lunar, LunarUtil, Solar } from "lunar-typescript";
import type { NormalizedProfileInput } from "@/lib/profile";
import { getCivilDateTime } from "@/lib/profile/normalize";
import { getChinaEphemerisParts, toZonedDate } from "@/lib/qimen/timezone";
import { DEFAULT_BAZI_SETTINGS, type BaziSettings } from "./settings";
import type {
  BaziPillarDetail,
  BaziPillarKey,
  BaziYunPreview,
  NormalizedBaziChart,
} from "./types";
import { buildShenSha } from "./shen-sha";
import { buildBaziStructureAudit } from "./structure-audit";

type EightCharInstance = ReturnType<ReturnType<typeof Lunar.fromDate>["getEightChar"]>;

const resolveBaziSettings = (profile: NormalizedProfileInput): BaziSettings => ({
  ...DEFAULT_BAZI_SETTINGS,
  ...profile.original.baziSettings,
});

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

  return Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
};

const setTermReference = (lunar: Lunar, instant: Date) => {
  const { year, month, day, hour, minute, second } = getChinaEphemerisParts(instant);
  const reference = Solar.fromYmdHms(year, month, day, hour, minute, second).getLunar();
  (lunar as Lunar & { setSolarTermReference(reference: Lunar): void }).setSolarTermReference(reference);
};

const shiftedLunar = (datetime: string, minuteDelta: number) => {
  const { year, month, day, hour, minute } = parseNormalizedDateTime(datetime);
  const shifted = new Date(0);
  shifted.setUTCFullYear(year, month - 1, day);
  shifted.setUTCHours(hour, minute + minuteDelta, 0, 0);
  return Solar.fromYmdHms(
    shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(),
    shifted.getUTCHours(), shifted.getUTCMinutes(), 0,
  ).getLunar();
};

const baZiFor = (lunar: ReturnType<typeof shiftedLunar>, settings: BaziSettings) => {
  const eightChar = lunar.getEightChar();
  // lunar-typescript sect 1 treats the 子初 (23:00) as the next day;
  // sect 2 keeps the calendar day until 子正 (00:00).
  eightChar.setSect(settings.dayBoundary === "zi-start" ? 1 : 2);
  const year = settings.yearBoundary === "lunar-new-year"
    ? lunar.getYearInGanZhi()
    : eightChar.getYear();
  return [year, eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()];
};

const buildBoundaryAudit = (datetime: string, instant: Date, current: string[], settings: BaziSettings) => {
  const at = (minutes: number) => {
    const lunar = shiftedLunar(datetime, minutes);
    setTermReference(lunar, new Date(instant.getTime() + minutes * 60_000));
    return baZiFor(lunar, settings);
  };
  const before = at(-30);
  const after = at(30);
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

const getDiShi = (dayGan: string, branch: string) => {
  const offset = LunarUtil.CHANG_SHENG_OFFSET[dayGan];
  const dayGanIndex = LunarUtil.GAN.indexOf(dayGan);
  const branchIndex = LunarUtil.ZHI.indexOf(branch);
  if (offset === undefined || dayGanIndex < 0 || branchIndex < 0) return "";
  let index = offset + (dayGanIndex % 2 === 0 ? branchIndex : -branchIndex);
  if (index >= 12) index -= 12;
  if (index < 0) index += 12;
  return LunarUtil.CHANG_SHENG[index] ?? "";
};

const buildLunarNewYearPillar = (
  lunar: ReturnType<typeof buildLunarFromProfile>,
  dayGan: string,
): BaziPillarDetail => {
  const heavenlyStem = lunar.getYearGan();
  const earthlyBranch = lunar.getYearZhi();
  const pillar = lunar.getYearInGanZhi();
  const hiddenStems = LunarUtil.ZHI_HIDE_GAN[earthlyBranch] ?? [];

  return {
    key: "year",
    pillar,
    heavenlyStem,
    earthlyBranch,
    hiddenStems,
    wuXing: `${LunarUtil.WU_XING_GAN[heavenlyStem] ?? ""}${LunarUtil.WU_XING_ZHI[earthlyBranch] ?? ""}`,
    naYin: LunarUtil.NAYIN[pillar] ?? "",
    shiShenGan: LunarUtil.SHI_SHEN[dayGan + heavenlyStem] ?? "",
    shiShenZhi: hiddenStems.map((stem) => LunarUtil.SHI_SHEN[dayGan + stem] ?? "").filter(Boolean),
    diShi: getDiShi(dayGan, earthlyBranch),
    xun: lunar.getYearXun(),
    xunKong: lunar.getYearXunKong(),
    shenSha: [],
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

// 命、身宫支沿用排盘库的月时定位，宫干按本站选定的年干起寅。
const palacePillarForYear = (palace: string, yearStem: string) => {
  const branch = palace.slice(1);
  const yearIndex = LunarUtil.GAN.indexOf(yearStem) - 1;
  const branchOffset = LunarUtil.MONTH_ZHI.indexOf(branch) - 1;
  const tigerStemIndex = (yearIndex % 5) * 2 + 2;
  const stem = LunarUtil.GAN[(tigerStemIndex + branchOffset) % 10 + 1];
  const pillar = stem + branch;
  return { pillar, naYin: LunarUtil.NAYIN[pillar] ?? "" };
};

// 《三命通会》卷二〈论小运〉并载固定起点法和醉醒子的时柱法。
const buildXiaoYun = (timePillar: string, gender: "male" | "female", direction: BaziYunPreview["direction"]) => {
  const cycle = LunarUtil.JIA_ZI;
  const timeIndex = cycle.indexOf(timePillar);
  const fixedStart = cycle.indexOf(gender === "male" ? "丙寅" : "壬申");
  const step = direction === "forward" ? 1 : -1;
  const fixedStep = gender === "male" ? 1 : -1;
  const at = (index: number) => cycle[(index + cycle.length) % cycle.length];

  return Array.from({ length: 12 }, (_, index) => ({
    age: index + 1,
    birthHourMethod: at(timeIndex + (index + 1) * step),
    fixedStartMethod: at(fixedStart + index * fixedStep),
  }));
};

const buildYunPreview = (
  gender: NormalizedProfileInput["original"]["gender"],
  eightChar: EightCharInstance,
  settings: BaziSettings,
): BaziYunPreview => {
  if (settings.yearBoundary === "lunar-new-year") {
    const lunar = eightChar.getLunar() as Lunar & { _yunYearGanIndex?: number };
    lunar._yunYearGanIndex = lunar.getYearGanIndex();
  }
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

/** Shared calculation context for natal charts and dayun consumers. */
export const buildBaziCalculationContext = (profile: NormalizedProfileInput) => {
  const conventions = resolveBaziSettings(profile);
  const lunar = buildLunarFromProfile(profile);
  const instant = toZonedDate(getCivilDateTime(profile), profile.normalized.timeZone);
  setTermReference(lunar, instant);
  const eightChar = lunar.getEightChar();
  eightChar.setSect(conventions.dayBoundary === "zi-start" ? 1 : 2);
  if (conventions.yearBoundary === "lunar-new-year") {
    (lunar as Lunar & { _yunYearGanIndex?: number })._yunYearGanIndex = lunar.getYearGanIndex();
  }
  return { conventions, lunar, instant, eightChar };
};

export const buildBaziChartFromProfile = (
  profile: NormalizedProfileInput,
): NormalizedBaziChart => {
  const { conventions, lunar, instant, eightChar } = buildBaziCalculationContext(profile);
  const solar = lunar.getSolar();
  const pillars = (["year", "month", "day", "time"] as const).map((key) =>
    getPillarDetail(key, eightChar),
  );
  if (conventions.yearBoundary === "lunar-new-year") {
    pillars[0] = buildLunarNewYearPillar(lunar, eightChar.getDayGan());
  }
  const shenSha = buildShenSha(pillars, eightChar.getDayGan());
  pillars.forEach((pillar, index) => {
    pillar.shenSha = shenSha[index] ?? [];
  });
  const taiYuan = { pillar: eightChar.getTaiYuan(), naYin: eightChar.getTaiYuanNaYin() };
  const taiXi = { pillar: eightChar.getTaiXi(), naYin: eightChar.getTaiXiNaYin() };
  const mingGong = palacePillarForYear(eightChar.getMingGong(), pillars[0].heavenlyStem);
  const shenGong = palacePillarForYear(eightChar.getShenGong(), pillars[0].heavenlyStem);
  const naYin = pillars.map((pillar) => pillar.naYin);
  const structureAudit = buildBaziStructureAudit(pillars, eightChar.getDayGan(), naYin, mingGong.pillar, shenGong.pillar);
  const baZi = pillars.map((pillar) => pillar.pillar);
  const boundaryAudit = buildBoundaryAudit(profile.normalized.datetime, instant, baZi, conventions);
  const yun = buildYunPreview(profile.original.gender, eightChar, conventions);

  return {
    input: profile,
    interpretedDateTime: profile.normalized.datetime,
    raw: {
      solar: solar.toYmdHms(),
      solarFull: solar.toFullString(),
      lunar: lunar.toString(),
      lunarFull: lunar.toFullString(),
      conventions,
      baZi,
      dayMaster: eightChar.getDayGan(),
      wuXing: pillars.map((pillar) => pillar.wuXing),
      naYin,
      shiShenGan: pillars.map((pillar) => pillar.shiShenGan),
      shiShenZhi: pillars.map((pillar) => pillar.shiShenZhi[0] ?? ""),
      pillars,
      taiYuan,
      taiXi,
      mingGong,
      shenGong,
      structureAudit,
      boundaryAudit,
      yun,
      xiaoYun: buildXiaoYun(eightChar.getTime(), profile.original.gender, yun.direction),
    },
  };
};
