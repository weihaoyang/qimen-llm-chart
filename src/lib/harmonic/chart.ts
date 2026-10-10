/**
 * 谐波占星（Harmonic / overtone astrology）。
 *
 * 约定：第 n 谐波把每个黄经乘以 n 再取模 360 —— `h = (lon × n) mod 360`。
 * 母盘中相隔 360°/n（及其整数倍）的两点，在 n 谐波里会叠成合相，所以谐波盘
 * 用来把 quintile(72°)、septile(~51.43°) 这类次要相位「拉直」来看。
 *
 * 口径说明（有据，非本仓简化）：「谐波盘主要以合相来读」是 Addey 一系的通行做法。
 *   - Addey 理论（Harmonics in Astrology, 1976）与 Astrodienst 的说明即以此为
 *     读取方式：「In the harmonic chart, these planets form conjunctions.」
 *     （https://www.astro.com/astrology/in_harmon_e.htm，检索快照）。
 *   - 现代综述亦如此描述：「The most important feature of a harmonic chart is
 *     usually conjunction: planetary separations belonging to that harmonic family
 *     are compressed into conjunctions… Other aspects inside harmonic charts can
 *     also be studied, but their interpretation becomes increasingly compound and
 *     should be handled with greater caution.」
 *     （https://zodiacroots.com/harmonics-in-astrology/）。
 *   因此本仓只判合相（固定容许度 HARMONIC_ORB）；盘内其它相位属「复合解读」，
 *   无统一容许度规则，本仓不自行发明，未实现。
 *
 * 行星黄经复用既有 celestine 星盘结果（地心坐标，不依赖出生地）；上升/中天只在
 * 有出生地时才有意义，因此仅在完整盘时纳入。合相扫描对 `astro.points` 全量生效，
 * 因而自动包含星盘已扩到的 18 个点位（十大行星 + 凯龙 + 四小行星 + 真交点南北 +
 * 莉莉丝），见 `@/lib/astro/chart.ts` 的 PLANET_NAMES 与 celestine 默认配置
 * （`dist/index.js:7305-7316`：includeAsteroids / includeChiron / includeNodes:"true" /
 * includeLilith:"mean"）。
 */
import { buildAstroChart } from "@/lib/astro/chart";
import type { AstroPoint } from "@/lib/astro/types";
import type { NormalizedProfileInput } from "@/lib/profile";

const SIGNS = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"] as const;

export const MIN_HARMONIC = 1;
export const MAX_HARMONIC = 36;
/** 谐波盘上判定「合相」的容许度（度）。 */
export const HARMONIC_ORB = 4;

export type HarmonicPoint = {
  name: string;
  natalLongitude: number;
  longitude: number;
  sign: string;
  degree: number;
};

export type HarmonicConjunction = {
  a: string;
  b: string;
  /** 谐波盘上的实际夹角。 */
  harmonicOrb: number;
  /** 折算回母盘的夹角（谐波夹角 ÷ n）。 */
  natalOrb: number;
  /** 该谐波对应的母盘基准相位 360/n。 */
  natalAngle: number;
};

export type HarmonicChart = {
  format: "qmdj-harmonic-chart-v1";
  harmonic: number;
  orb: number;
  points: HarmonicPoint[];
  angles: HarmonicPoint[];
  conjunctions: HarmonicConjunction[];
  complete: boolean;
  disclaimer: string;
};

const wrap = (value: number) => ((value % 360) + 360) % 360;
const signOf = (longitude: number) => SIGNS[Math.floor(wrap(longitude) / 30) % 12];

export const harmonicLongitude = (longitude: number, harmonic: number) => wrap(longitude * harmonic);

const angularDistance = (a: number, b: number) => {
  const delta = Math.abs(wrap(a) - wrap(b)) % 360;
  return delta > 180 ? 360 - delta : delta;
};

const toHarmonicPoint = (name: string, natalLongitude: number, harmonic: number): HarmonicPoint => {
  const longitude = harmonicLongitude(natalLongitude, harmonic);
  return { name, natalLongitude: wrap(natalLongitude), longitude, sign: signOf(longitude), degree: Number((longitude % 30).toFixed(2)) };
};

export const clampHarmonic = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_HARMONIC, Math.max(MIN_HARMONIC, Math.round(value)));
};

export const buildHarmonicChart = (profile: NormalizedProfileInput, harmonicInput: number): HarmonicChart => {
  const harmonic = clampHarmonic(harmonicInput);
  const astro = buildAstroChart(profile);

  const points = astro.points
    .filter((point): point is AstroPoint & { longitude: number } => point.longitude !== null)
    .map((point) => toHarmonicPoint(point.name, point.longitude, harmonic));
  const angles = astro.complete
    ? Object.values(astro.angles)
        .filter((point): point is AstroPoint & { longitude: number } => point.longitude !== null)
        .map((point) => toHarmonicPoint(point.name, point.longitude, harmonic))
    : [];

  const all = [...points, ...angles];
  const conjunctions: HarmonicConjunction[] = [];
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const harmonicOrb = angularDistance(all[i].longitude, all[j].longitude);
      if (harmonicOrb <= HARMONIC_ORB) {
        conjunctions.push({ a: all[i].name, b: all[j].name, harmonicOrb: Number(harmonicOrb.toFixed(2)), natalOrb: Number((harmonicOrb / harmonic).toFixed(3)), natalAngle: Number((360 / harmonic).toFixed(3)) });
      }
    }
  }
  conjunctions.sort((left, right) => left.harmonicOrb - right.harmonicOrb);

  return {
    format: "qmdj-harmonic-chart-v1",
    harmonic,
    orb: HARMONIC_ORB,
    points,
    angles,
    conjunctions,
    complete: points.length > 0,
    disclaimer: `研究性谐波盘：h = (黄经 × ${harmonic}) mod 360，行星星历与星盘共用同一引擎（含凯龙、小行星、真交点与莉莉丝共 18 个点位）；${astro.complete ? "上升/中天已纳入。" : "未提供出生地，上升/中天未纳入。"}按 Addey 一系通行做法，谐波盘以合相（容许度 ${HARMONIC_ORB}°）为读取口径；盘内其它相位属复合解读、无统一容许度规则，本仓不自行发明，故不输出。谐波盘只重组角度关系，不引入新的星历，也不作现实预测。`,
  };
};
