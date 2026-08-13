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

/** Reproducible traditional-analysis inputs; not a claim of one canonical school. */
export type BaziStructureAudit = {
  engineVersion: "ziping-luming-rules-v1";
  dayMasterElement: string;
  monthCommandElement: string;
  elementWeights: Record<"wood" | "fire" | "earth" | "metal" | "water", number>;
  supportWeight: number;
  drainWeight: number;
  rootCount: number;
  visibleSupportCount: number;
  dayMasterStrength: "extreme-strong" | "strong" | "balanced" | "weak" | "extreme-weak" | "disputed";
  followStructure: "not-supported" | "follow-strong-candidate" | "follow-weak-candidate" | "follow-wealth-candidate" | "follow-officer-killing-candidate" | "follow-output-candidate" | "transformation-candidate" | "disputed";
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  luMingFeatures: Array<{ name: string; positions: string[]; evidence: string }>;
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
    structureAudit: BaziStructureAudit;
    boundaryAudit: {
      engineVersion: "bazi-boundary-audit-v1";
      windowMinutes: 30;
      sensitive: boolean;
      changedPillars: BaziPillarKey[];
      before: string[];
      current: string[];
      after: string[];
      note: string;
    };
    yun: BaziYunPreview;
  };
};
