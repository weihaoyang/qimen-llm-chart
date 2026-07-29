import type { QimenSettings } from "@/lib/qimen/settings";

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
  longitude?: number;
  latitude?: number;
};

export type ProfileInput = {
  calendarMode: CalendarMode;
  datetime: string;
  timeZone: string;
  gender: Gender;
  timeBasis: TimeBasis;
  qimenSettings?: QimenSettings;
  solar?: SolarInput;
  lunar?: LunarInput;
  location?: GeoLocationInput;
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
