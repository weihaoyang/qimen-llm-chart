import { astro } from "iztro";
import { getMutagensByHeavenlyStem } from "iztro/lib/utils";
import type { NormalizedProfileInput } from "@/lib/profile";
import type {
  NormalizedZiweiChart,
  ZiweiPalaceSummary,
  ZiweiStarSummary,
} from "./types";

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

const toTimeIndex = (hour: number) => {
  if (hour === 0) {
    return 0;
  }

  if (hour === 23) {
    return 12;
  }

  return Math.floor((hour + 1) / 2);
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
}): ZiweiPalaceSummary => ({
  index: palace.index,
  name: palace.name,
  isBodyPalace: palace.isBodyPalace,
  isOriginalPalace: palace.isOriginalPalace,
  heavenlyStem: palace.heavenlyStem,
  earthlyBranch: palace.earthlyBranch,
  majorStars: palace.majorStars.map(serializeStar),
  minorStars: palace.minorStars.map(serializeStar),
  adjectiveStars: palace.adjectiveStars.map(serializeStar),
  changsheng12: palace.changsheng12,
  boshi12: palace.boshi12,
  jiangqian12: palace.jiangqian12,
  suiqian12: palace.suiqian12,
  decadal: palace.decadal,
  ages: palace.ages,
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

  const astrolabe =
    profile.original.calendarMode === "lunar" && profile.original.lunar
      ? astro.byLunar(
          `${profile.original.lunar.year}-${profile.original.lunar.month}-${profile.original.lunar.day}`,
          timeIndex,
          gender,
          profile.original.lunar.isLeapMonth,
          true,
          "zh-CN",
        )
      : astro.bySolar(solarDate, timeIndex, gender, true, "zh-CN");

  const [lu, quan, ke, ji] = getMutagensByHeavenlyStem(
    astrolabe.rawDates.chineseDate.yearly[0] as never,
  );

  return {
    input: profile,
    interpretedDateTime: profile.normalized.datetime,
    raw: {
      solarDate: astrolabe.solarDate,
      lunarDate: astrolabe.lunarDate,
      chineseDate: astrolabe.chineseDate,
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
      mutagens: {
        lu,
        quan,
        ke,
        ji,
      },
      palaces: astrolabe.palaces.map(serializePalace),
    },
  };
};
