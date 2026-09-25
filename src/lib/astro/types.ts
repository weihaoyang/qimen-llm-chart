import type { NormalizedProfileInput } from "@/lib/profile";

export type ZodiacSign = "白羊" | "金牛" | "双子" | "巨蟹" | "狮子" | "处女" | "天秤" | "天蝎" | "射手" | "摩羯" | "水瓶" | "双鱼" | "未知";

export type AstroPoint = {
  name: string;
  longitude: number | null;
  sign: ZodiacSign;
  degree: number | null;
  house: number | null;
};

export type AstroChart = {
  format: "qmdj-astro-chart-v1";
  input: { datetime: string; timeZone: string; latitude: number | null; longitude: number | null };
  sun: AstroPoint;
  moon: AstroPoint;
  ascendant: AstroPoint;
  points: AstroPoint[];
  complete: boolean;
  disclaimer: string;
};

export type AstroChartInput = NormalizedProfileInput;
