import type { NormalizedProfileInput } from "@/lib/profile";

export type BaziPillarKey = "year" | "month" | "day" | "time";

export type BaziPillarDetail = {
  key: BaziPillarKey;
  pillar: string;
  heavenlyStem: string;
  earthlyBranch: string;
  hiddenStems: string[];
  wuXing: string;
  naYin: string;
  shiShenGan: string;
  shiShenZhi: string[];
  diShi: string;
  xun: string;
  xunKong: string;
  shenSha: string[];
};

export type BaziYunPreview = {
  startSolar: string;
  startOffset: {
    years: number;
    months: number;
    days: number;
    hours: number;
  };
  direction: "forward" | "backward";
  daYun: Array<{
    index: number;
    ganZhi: string;
    xun: string;
    xunKong: string;
    startYear: number;
    endYear: number;
    startAge: number;
    endAge: number;
  }>;
};

export type NormalizedBaziChart = {
  input: NormalizedProfileInput;
  interpretedDateTime: string;
  raw: {
    solar: string;
    solarFull: string;
    lunar: string;
    lunarFull: string;
    baZi: string[];
    dayMaster: string;
    wuXing: string[];
    naYin: string[];
    shiShenGan: string[];
    shiShenZhi: string[];
    pillars: BaziPillarDetail[];
    taiYuan: {
      pillar: string;
      naYin: string;
    };
    taiXi: {
      pillar: string;
      naYin: string;
    };
    mingGong: {
      pillar: string;
      naYin: string;
    };
    shenGong: {
      pillar: string;
      naYin: string;
    };
    yun: BaziYunPreview;
  };
};
