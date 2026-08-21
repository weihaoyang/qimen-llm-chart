import type { NormalizedBaziChart } from "@/lib/bazi/types";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import type { NormalizedZiweiChart } from "@/lib/ziwei/types";

export type ResearchTool = "trend" | "verification" | "daliuren" | "taiyi";

export type LifeTrendSignal = {
  kind: "support" | "review";
  text: string;
};

export type LifeTrendPoint = {
  year: number;
  age: number;
  ganZhi: string;
  dayunGanZhi: string;
  dayunStartYear: number;
  open: number;
  high: number;
  low: number;
  close: number;
  signals: LifeTrendSignal[];
};

export type LifeTrendData = {
  startAge: number;
  startAgeDetail: string;
  direction: "forward" | "backward";
  points: LifeTrendPoint[];
  disclaimer: string;
};

export type VerificationStatus = "match" | "difference" | "unavailable";

/**
 * Research-only provenance. This is deliberately kept out of the public
 * analysis narrative so a user sees evidence, not package internals.
 */
export type ReferenceEngineProvenance = {
  package: "taibu-core";
  version: "3.5.0";
  license: "MIT";
  source: "https://github.com/hhszzzz/taibu";
  role: "reference_only";
};

export type VerificationRow = {
  system: "八字" | "奇门" | "紫微";
  field: string;
  primary: string;
  reference: string;
  status: VerificationStatus;
  note: string;
};

export type VerificationData = {
  rows: VerificationRow[];
  generatedAt: string;
  disclaimer: string;
  referenceEngine: ReferenceEngineProvenance;
};

export type ResearchWorkspaceData = {
  trend: LifeTrendData;
  verification: VerificationData;
  daliuren: {
    text: string;
    json: unknown;
    referenceEngine: ReferenceEngineProvenance;
  } | null;
  taiyi: {
    text: string;
    json: unknown;
    referenceEngine: ReferenceEngineProvenance;
  } | null;
};

export type ResearchInput = {
  profile: NormalizedProfileInput;
  qimen: NormalizedQimenChart | null;
  bazi: NormalizedBaziChart | null;
  ziwei: NormalizedZiweiChart | null;
};
