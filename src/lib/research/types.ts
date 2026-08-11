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
};

export type ResearchWorkspaceData = {
  trend: LifeTrendData;
  verification: VerificationData;
  daliuren: {
    text: string;
    json: unknown;
  } | null;
  taiyi: {
    text: string;
    json: unknown;
  } | null;
};

export type ResearchInput = {
  profile: NormalizedProfileInput;
  qimen: NormalizedQimenChart | null;
  bazi: NormalizedBaziChart | null;
  ziwei: NormalizedZiweiChart | null;
};
