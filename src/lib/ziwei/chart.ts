import { astro } from "iztro";
import { getMutagensByHeavenlyStem } from "iztro/lib/utils";
import type { NormalizedProfileInput } from "@/lib/profile";
import { DEFAULT_BAZI_SETTINGS, type BaziDayBoundary } from "@/lib/bazi/settings";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { toTimeIndex } from "./time-index";
import { buildZiweiInsights } from "./insights";
import type {
  NormalizedZiweiChart,
  ZiweiPalaceSummary,
  ZiweiStarSummary,
} from "./types";

const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/**
 * iztro keeps its day-division convention in module-global state, and its default
 * is `forward` — 晚子时算次日. The product's default is the opposite: `midnight`
 * (子正换日), where 23:00–23:59 still belongs to the current day. The 八字 engine
 * already honours the user's setting, so without this the two panels disagreed
 * about which day a 23:00 birth belongs to.
 *
 * `astro.withOptions` mutates the same global and never restores it, which would
 * leave whichever convention the last request used in place for the whole
 * process. Setting and restoring explicitly around a *synchronous* call is safe:
 * Node runs a synchronous function to completion, so no other request can
 * observe the temporary value.
 */
const withDayDivide = <T>(dayBoundary: BaziDayBoundary, run: () => T): T => {
  const dayDivide = dayBoundary === "midnight" ? "current" : "forward";
  const previous = astro.getConfig().dayDivide;
  if (previous === dayDivide) {
    return run();
  }
  astro.config({ dayDivide });
  try {
    return run();
  } finally {
    astro.config({ dayDivide: previous });
  }
};

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

const toGenderLabel = (gender: NormalizedProfileInput["original"]["gender"]) =>
  gender === "male" ? "男" : "女";

const serializeStar = (star: {
  name: string;
  brightness?: string;
  mutagen?: string;
  scope?: string;
}): ZiweiStarSummary => ({
  name: star.name,
  brightness: star.brightness,
  mutagen: star.mutagen,
  scope: star.scope,
});

const serializePalace = (palace: {
  index: number;
  name: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Array<{
    name: string;
    brightness?: string;
    mutagen?: string;
    scope?: string;
  }>;
  minorStars: Array<{
    name: string;
    brightness?: string;
    mutagen?: string;
    scope?: string;
  }>;
  adjectiveStars: Array<{
    name: string;
    brightness?: string;
    mutagen?: string;
    scope?: string;
  }>;
  changsheng12: string;
  boshi12: string;
  jiangqian12: string;
  suiqian12: string;
  decadal: {
    range: [number, number];
    heavenlyStem: string;
    earthlyBranch: string;
  };
  ages: number[];
  branchIndex?: number;
}): ZiweiPalaceSummary => ({
  index: palace.index,
  name: palace.name,
  isBodyPalace: palace.isBodyPalace,
  isOriginalPalace: palace.isOriginalPalace,
  heavenlyStem: palace.heavenlyStem,
  earthlyBranch: palace.earthlyBranch,
  branchIndex: palace.branchIndex ?? -1,
  majorStars: palace.majorStars.map(serializeStar),
  minorStars: palace.minorStars.map(serializeStar),
  adjectiveStars: palace.adjectiveStars.map(serializeStar),
  changsheng12: palace.changsheng12,
  boshi12: palace.boshi12,
  jiangqian12: palace.jiangqian12,
  suiqian12: palace.suiqian12,
  decadal: palace.decadal,
  ages: palace.ages,
  isEmpty: palace.majorStars.length === 0,
  borrowedStars: [],
  sanFangSiZheng: [],
});

export const buildZiweiChartFromProfile = (
  profile: NormalizedProfileInput,
): NormalizedZiweiChart => {
  const { year, month, day, hour } = parseNormalizedDateTime(
    profile.normalized.datetime,
  );
  const timeIndex = toTimeIndex(hour);
  const gender = toGenderLabel(profile.original.gender);
  const solarDate = `${year}-${month}-${day}`;

  const dayBoundary = profile.original.baziSettings?.dayBoundary ?? DEFAULT_BAZI_SETTINGS.dayBoundary;
  const astrolabe = withDayDivide(dayBoundary, () =>
    profile.original.calendarMode === "lunar" && profile.original.lunar
      ? astro.byLunar(
          `${profile.original.lunar.year}-${profile.original.lunar.month}-${profile.original.lunar.day}`,
          timeIndex,
          gender,
          profile.original.lunar.isLeapMonth,
          true,
          "zh-CN",
        )
      : astro.bySolar(solarDate, timeIndex, gender, true, "zh-CN"),
  );

  const [lu, quan, ke, ji] = getMutagensByHeavenlyStem(
    astrolabe.rawDates.chineseDate.yearly[0] as never,
  );
  // iztro's display string uses lunar-month text. The product's cross-panel
  // four-pillar truth is the deterministic Bazi engine and the user-selected
  // year/day conventions, so never expose two incompatible pillar strings.
  const bazi = buildBaziChartFromProfile(profile);
  const mingGongBranch = BRANCHES.indexOf(astrolabe.earthlyBranchOfSoulPalace as typeof BRANCHES[number]);
  const shenGongBranch = BRANCHES.indexOf(astrolabe.earthlyBranchOfBodyPalace as typeof BRANCHES[number]);
  const basePalaces = astrolabe.palaces.map((palace) =>
    serializePalace({ ...palace, branchIndex: BRANCHES.indexOf(palace.earthlyBranch as typeof BRANCHES[number]) }),
  );
  const palaceByBranch = new Map(basePalaces.map((palace) => [palace.branchIndex, palace]));
  const palaces = basePalaces.map((palace) => {
    const opposite = palaceByBranch.get((palace.branchIndex + 6) % 12);
    const sanFangBranches = [palace.branchIndex, (palace.branchIndex + 4) % 12, (palace.branchIndex + 8) % 12, (palace.branchIndex + 6) % 12];
    const sanFangSiZheng = sanFangBranches.map((branch) => palaceByBranch.get(branch)?.name).filter((name): name is string => Boolean(name));
    return {
      ...palace,
      oppositePalace: opposite?.name,
      borrowedStars: palace.isEmpty ? (opposite?.majorStars.map((star) => star.name) ?? []) : [],
      sanFangSiZheng,
    };
  });
  const insights = buildZiweiInsights({ palaces, mingGongBranch, shenGongBranch });
  const yearStem = String(astrolabe.rawDates.chineseDate.yearly[0] ?? "").slice(0, 1);
  const yangStems = new Set(["甲", "丙", "戊", "庚", "壬"]);
  const yinYangGender = `${yangStems.has(yearStem) ? "阳" : "阴"}${gender}`;

  return {
    input: profile,
    interpretedDateTime: profile.normalized.datetime,
    raw: {
      solarDate: astrolabe.solarDate,
      lunarDate: astrolabe.lunarDate,
      chineseDate: bazi.raw.baZi.join(" "),
      rawDates: astrolabe.rawDates,
      time: astrolabe.time,
      timeRange: astrolabe.timeRange,
      gender: astrolabe.gender,
      sign: astrolabe.sign,
      zodiac: astrolabe.zodiac,
      soul: astrolabe.soul,
      body: astrolabe.body,
      earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
      earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
      fiveElementsClass: astrolabe.fiveElementsClass,
      mingZhu: astrolabe.soul,
      shenZhu: astrolabe.body,
      yinYangGender,
      mutagens: {
        lu,
        quan,
        ke,
        ji,
      },
      patterns: insights.patterns,
      sanFangSiZheng: insights.sanFangSiZheng,
      emptyPalaces: insights.emptyPalaces,
      palaces,
    },
  };
};
