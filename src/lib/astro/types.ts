import type { NormalizedProfileInput } from "@/lib/profile";

export type ZodiacSign = "白羊" | "金牛" | "双子" | "巨蟹" | "狮子" | "处女" | "天秤" | "天蝎" | "射手" | "摩羯" | "水瓶" | "双鱼" | "未知";

export type AstroPoint = {
  name: string;
  longitude: number | null;
  sign: ZodiacSign;
  degree: number | null;
  house: number | null;
};
export type AstroAspect = { body1: string; body2: string; type: string; symbol: string; separation: number; deviation: number; strength: number; isApplying: boolean | null };
export type AstroPattern = { type: string; bodies: string[]; description: string };
export type AstroHouseCusp = { house: number; longitude: number; sign: ZodiacSign; degree: number };

export type AstroChart = {
  format: "qmdj-astro-chart-v1";
  input: { datetime: string; timeZone: string; latitude: number | null; longitude: number | null };
  sun: AstroPoint;
  moon: AstroPoint;
  ascendant: AstroPoint;
  points: AstroPoint[];
  angles: { ascendant: AstroPoint; midheaven: AstroPoint; descendant: AstroPoint; imumCoeli: AstroPoint };
  houses: AstroHouseCusp[];
  aspects: AstroAspect[];
  aspectSummary: Record<string, number>;
  patterns: AstroPattern[];
  complete: boolean;
  disclaimer: string;
};

export type AstroChartInput = NormalizedProfileInput;
