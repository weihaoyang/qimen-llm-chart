import type { NormalizedProfileInput } from "@/lib/profile";

export type ZodiacSign = "白羊" | "金牛" | "双子" | "巨蟹" | "狮子" | "处女" | "天秤" | "天蝎" | "射手" | "摩羯" | "水瓶" | "双鱼";

export type AstroPoint = {
  name: string;
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  house: number;
};

export type AstroChart = {
  format: "qmdj-astro-chart-v1";
  input: { datetime: string; timeZone: string; latitude: number | null; longitude: number | null };
  sun: AstroPoint;
  moon: AstroPoint;
  ascendant: AstroPoint;
  points: AstroPoint[];
  disclaimer: string;
};

export type AstroChartInput = NormalizedProfileInput;
