export type BaziYearBoundary = "li-chun" | "lunar-new-year";

export type BaziDayBoundary = "midnight" | "zi-start";

export type BaziSettings = {
  /** 八字年柱按立春或农历春节切换；默认采用现代子平常见的立春口径。 */
  yearBoundary: BaziYearBoundary;
  /** 日柱按子正（0 时）或子初（23 时）切换。 */
  dayBoundary: BaziDayBoundary;
};

export const DEFAULT_BAZI_SETTINGS: BaziSettings = {
  yearBoundary: "li-chun",
  dayBoundary: "midnight",
};
