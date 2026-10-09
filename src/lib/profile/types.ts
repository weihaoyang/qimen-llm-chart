import type { QimenSettings } from "@/lib/qimen/settings";
import type { BaziSettings } from "@/lib/bazi/settings";

export type CalendarMode = "solar" | "lunar";

export type Gender = "male" | "female";

export type TimeBasis = "civil" | "true-solar";

export type SolarInput = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
};

export type LunarInput = {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  hour?: number;
  minute?: number;
};

export type GeoLocationInput = {
  city?: string;
  timeZone?: string;
  longitude?: number;
  latitude?: number;
};

export type ProfileInput = {
  calendarMode: CalendarMode;
  datetime: string;
  timeZone: string;
  gender: Gender;
  timeBasis: TimeBasis;
  baziSettings?: BaziSettings;
  qimenSettings?: QimenSettings;
  solar?: SolarInput;
  lunar?: LunarInput;
  location?: GeoLocationInput;
  /** 三盘联合：勾选后奇门用「问事起局时间」，八字/紫微仍用出生时间。 */
  splitChartTimes?: boolean;
  /** 问事起局时间（公历 `YYYY-MM-DDTHH:mm`）。 */
  questionDatetime?: string;
};

export type NormalizedProfileInput = {
  original: ProfileInput;
  normalized: {
    datetime: string;
    timeZone: string;
    calendarMode: CalendarMode;
    timeBasis: TimeBasis;
  };
};
