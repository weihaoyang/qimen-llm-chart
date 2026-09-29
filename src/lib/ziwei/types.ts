import type { NormalizedProfileInput } from "@/lib/profile";

export type ZiweiStarSummary = {
  name: string;
  brightness?: string;
  mutagen?: string;
  scope?: string;
};

export type ZiweiPatternLevel = "excellent" | "good" | "neutral" | "caution";

export type ZiweiPattern = {
  id: string;
  name: string;
  level: ZiweiPatternLevel;
  summary: string;
  evidence: string[];
  source?: string;
};

export type ZiweiPalaceSummary = {
  index: number;
  name: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  branchIndex: number;
  majorStars: ZiweiStarSummary[];
  minorStars: ZiweiStarSummary[];
  adjectiveStars: ZiweiStarSummary[];
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
  isEmpty: boolean;
  oppositePalace?: string;
  borrowedStars: string[];
  sanFangSiZheng: string[];
};

export type NormalizedZiweiChart = {
  input: NormalizedProfileInput;
  interpretedDateTime: string;
  raw: {
    solarDate: string;
    lunarDate: string;
    chineseDate: string;
    rawDates: {
      lunarDate: {
        lunarYear: number;
        lunarMonth: number;
        lunarDay: number;
        isLeap: boolean;
      };
      chineseDate: {
        yearly: [string, string];
        monthly: [string, string];
        daily: [string, string];
        hourly: [string, string];
      };
    };
    time: string;
    timeRange: string;
    gender: string;
    sign: string;
    zodiac: string;
    soul: string;
    body: string;
    earthlyBranchOfSoulPalace: string;
    earthlyBranchOfBodyPalace: string;
    fiveElementsClass: string;
    mutagens: {
      lu: string;
      quan: string;
      ke: string;
      ji: string;
    };
    mingZhu: string;
    shenZhu: string;
    yinYangGender: string;
    patterns: ZiweiPattern[];
    sanFangSiZheng: string[];
    emptyPalaces: Array<{
      palace: string;
      oppositePalace: string;
      borrowedStars: string[];
    }>;
    palaces: ZiweiPalaceSummary[];
  };
};
