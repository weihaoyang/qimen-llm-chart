/**
 * 汉堡学派（Hamburg School / Uranian astrology）八虚星（trans-Neptunian
 * planets，TNP）的轨道根数与开普勒解算。
 *
 * 要素表移植自 Astrolog（8.00）`matrix.cpp` 中的 Neely / Matrix 要素表
 * （James Neely，见 Michael Erlewine《Manual of Computer Programming for
 * Astrologers》, Matrix Software；Astrolog 由 Walter D. Pullen 整理）。
 *   https://github.com/CruiserOne/Astrolog  (matrix.cpp)
 *   Copyright (C) 1991-2026 Walter D. Pullen - GPL-2.0-or-later
 * 本仓库整体为 GPL-3.0-only，GPL-2.0-or-later 可与之合并，故此处移植并署名。
 *
 * 说明：
 * - 原表中 `ma` = 平近点角系数（度，关于 T = 自 J1900.0 起的儒略世纪）、
 *   `ec` = 离心率、`sma` = 半长轴（AU）、`ap` = 近日点黄经、`an` = 升交点、
 *   `in` = 轨道倾角。八虚星的 e、ap、an、in 均为 0，即圆轨道、投影到黄道，
 *   因此其日心黄经就等于平近点角。
 * - 解算流程（SolveKepler → 轨道面旋转 → 地心黄经）与 matrix.cpp 的
 *   ComputePlanets()/ProcessPlanet() 一致；天体坐标为地心黄道（当日）。
 */

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

export type ElementTriple = [number, number, number];

export type MatrixElements = {
  ma: ElementTriple;
  ec: ElementTriple;
  sma: number;
  ap: ElementTriple;
  an: ElementTriple;
  inc: ElementTriple;
};

/** 地球 / 太阳（Astrolog matrix.cpp rgoe[0]）。用于把八虚星换算为地心坐标。 */
export const EARTH_ELEMENTS: MatrixElements = {
  ma: [358.4758, 35999.0498, -0.0002],
  ec: [0.01675, -0.00004, 0],
  sma: 1,
  ap: [101.2208, 1.7192, 0.00045],
  an: [0, 0, 0],
  inc: [0, 0, 0],
};

export type Tnp = {
  id: string;
  name: string;
  nameZh: string;
  glyph: string;
  /** 汉堡学派通行的原则归类（象征解释，非计算事实）。 */
  principles: string[];
  elements: MatrixElements;
};

const tnp = (id: string, name: string, nameZh: string, glyph: string, principles: string[], ma0: number, ma1: number, sma: number): Tnp => ({
  id,
  name,
  nameZh,
  glyph,
  principles,
  elements: { ma: [ma0, ma1, 0], ec: [0, 0, 0], sma, ap: [0, 0, 0], an: [0, 0, 0], inc: [0, 0, 0] },
});

/** 八虚星，按汉堡学派传统顺序（Witte 1914 起的名义天体）。 */
export const TNPS: Tnp[] = [
  tnp("cupido", "Cupido", "丘比特", "⯂", ["家庭", "婚姻", "社团", "艺术", "群体联结"], 104.5959, 138.5369, 40.99837),
  tnp("hades", "Hades", "哈迪斯", "⯃", ["悲伤", "贫困", "疾病", "过去", "隐秘与腐坏"], 337.4517, 101.2176, 50.667443),
  tnp("zeus", "Zeus", "宙斯", "⯄", ["创造之火", "生殖", "领导", "机械与电", "有向意志"], 104.0904, 80.4057, 59.214362),
  tnp("kronos", "Kronos", "克洛诺斯", "⯅", ["权威", "政府", "体制", "高位", "规范"], 17.7346, 70.3863, 64.816896),
  tnp("apollon", "Apollon", "阿波罗", "⯆", ["科学", "商业", "扩张", "多元", "和平与广博"], 138.0354, 62.5, 70.361652),
  tnp("admetos", "Admetos", "阿德墨托斯", "⯇", ["深度", "专注", "凝止", "原料", "土地与终结"], -8.678, 58.3468, 73.736476),
  tnp("vulkanus", "Vulkanus", "火神星", "⯈", ["巨大力量", "强力", "势能", "不可抗的推进"], 55.9826, 54.2986, 77.445895),
  tnp("poseidon", "Poseidon", "波塞冬", "⯉", ["精神", "心智", "启蒙", "哲学", "真理与理念"], 165.3595, 48.6486, 83.493733),
];

const mod360 = (value: number) => ((value % 360) + 360) % 360;
const mod2pi = (value: number) => ((value % TWO_PI) + TWO_PI) % TWO_PI;
const readThree = (triple: ElementTriple, t: number) => triple[0] + triple[1] * t + triple[2] * t * t;

export type HeliocentricPosition = { x: number; y: number; z: number; longitude: number; radius: number };

/**
 * 黄道直角坐标（以太阳为原点，AU）。t = 自 J1900.0 起的儒略世纪。
 * 与 Astrolog matrix.cpp 的 ComputePlanets() 一致：先解 Kepler 方程，
 * 再把轨道面内的位置按近日点黄经旋转到黄道（八虚星 an/in 为 0）。
 */
export const heliocentricEcliptic = (elements: MatrixElements, t: number): HeliocentricPosition => {
  const m = mod2pi(readThree(elements.ma, t) * DEG);
  const e = readThree(elements.ec, t);
  const a = elements.sma;
  let ea = m;
  for (let i = 0; i < 5; i += 1) ea = m + e * Math.sin(ea); // 解 Kepler 方程
  const xPeri = a * (Math.cos(ea) - e);
  const yPeri = a * Math.sin(ea) * Math.sqrt(Math.max(0, 1 - e * e));
  const ap = mod2pi(readThree(elements.ap, t) * DEG);
  const x = xPeri * Math.cos(ap) - yPeri * Math.sin(ap);
  const y = xPeri * Math.sin(ap) + yPeri * Math.cos(ap);
  const radius = Math.hypot(x, y);
  return { x, y, z: 0, longitude: mod360(Math.atan2(y, x) / DEG), radius };
};

const JD_J1900 = 2415020.5;

/** 儒略世纪数 T：以 J1900.0 为起点，与 Astrolog matrix 要素表一致。 */
export const centuriesFromJ1900 = (julianDay: number) => (julianDay - JD_J1900) / 36525;

export type TnpPosition = {
  id: string;
  name: string;
  nameZh: string;
  glyph: string;
  principles: string[];
  /** 地心黄经（度，当日黄道）。 */
  longitude: number;
  /** 日心黄经（度）。 */
  heliocentric: number;
  distance: number;
};

/** 八虚星的地心黄经：日心坐标减去地球日心坐标。 */
export const uranianPositions = (julianDay: number): TnpPosition[] => {
  const t = centuriesFromJ1900(julianDay);
  const earth = heliocentricEcliptic(EARTH_ELEMENTS, t);
  return TNPS.map((body) => {
    const helio = heliocentricEcliptic(body.elements, t);
    const dx = helio.x - earth.x;
    const dy = helio.y - earth.y;
    return {
      id: body.id,
      name: body.name,
      nameZh: body.nameZh,
      glyph: body.glyph,
      principles: body.principles,
      longitude: mod360(Math.atan2(dy, dx) / DEG),
      heliocentric: helio.longitude,
      distance: Math.hypot(dx, dy),
    };
  });
};
