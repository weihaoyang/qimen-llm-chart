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

/**
 * 阿拉伯点（Lots / Arabic Parts）。它们不是天体，而是由两个天体与上升点
 * 相加相减得到的敏感点，且公式随昼夜（sect）切换。
 */
export type AstroLot = {
  /** 稳定标识：fortune / spirit。 */
  key: string;
  /** 中文通行名。 */
  name: string;
  /** 通行英文名（来源字段）。 */
  latin: string;
  /** 中文别称（仅供检索，同名不同译）。 */
  alias: string;
  /** 计算引擎实际使用的公式（昼/夜不同）。 */
  formula: string;
  /** 该盘按昼夜公式判定为昼盘还是夜盘。 */
  sect: "昼" | "夜";
  longitude: number;
  sign: ZodiacSign;
  degree: number;
  house: number | null;
};

export type AstroChart = {
  format: "qmdj-astro-chart-v1";
  input: { datetime: string; timeZone: string; latitude: number | null; longitude: number | null };
  sun: AstroPoint;
  moon: AstroPoint;
  ascendant: AstroPoint;
  points: AstroPoint[];
  angles: { ascendant: AstroPoint; midheaven: AstroPoint; descendant: AstroPoint; imumCoeli: AstroPoint };
  houses: AstroHouseCusp[];
  /** 宫制说明（celestine 默认 Placidus；高纬/极区会回退，本仓如实标注）。 */
  houseSystem: string;
  /** 阿拉伯点（福点／精神点）；依赖上升点，故无出生地时为空数组。 */
  lots: AstroLot[];
  aspects: AstroAspect[];
  aspectSummary: Record<string, number>;
  patterns: AstroPattern[];
  complete: boolean;
  disclaimer: string;
};

export type AstroChartInput = NormalizedProfileInput;
