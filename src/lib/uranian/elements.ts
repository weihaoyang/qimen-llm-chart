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
 * - 地心黄经另按 Astrolog matrix.cpp:640 的 `aber` 项更正（见文件末
 *   aberrationDegrees 的说明）。
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
/** 位置 + 速度（速度口径与 Astrolog matrix.cpp:582-590 相同，AU/day）。 */
export type HeliocentricState = HeliocentricPosition & { vx: number; vy: number };

/** 高斯引力常数 k = 0.01720209 rad/day（Astrolog matrix.cpp:582 的字面值）。 */
const GAUSS_K = 0.01720209;

/**
 * 黄道直角坐标（以太阳为原点，AU）与速度（AU/day）。t = 自 J1900.0 起的儒略世纪。
 * 与 Astrolog matrix.cpp 的 ComputePlanets() 一致：先解 Kepler 方程，
 * 再把轨道面内的位置按近日点黄经旋转到黄道（八虚星 an/in 为 0）。
 * 速度取 matrix.cpp:582-590 的近日点坐标系分量
 *   E1 = 0.01720209 / (a^1.5 (1 − e cos EA))
 *   xw = −a E1 sin EA，yw = a E1 sqrt(1 − e²) cos EA
 * 再按同一旋转（近日点黄经 ap）变换到黄道。
 */
export const heliocentricState = (elements: MatrixElements, t: number): HeliocentricState => {
  const m = mod2pi(readThree(elements.ma, t) * DEG);
  const e = readThree(elements.ec, t);
  const a = elements.sma;
  let ea = m;
  for (let i = 0; i < 5; i += 1) ea = m + e * Math.sin(ea); // 解 Kepler 方程
  const xPeri = a * (Math.cos(ea) - e);
  const yPeri = a * Math.sin(ea) * Math.sqrt(Math.max(0, 1 - e * e));
  const ap = mod2pi(readThree(elements.ap, t) * DEG);
  const cosAp = Math.cos(ap);
  const sinAp = Math.sin(ap);
  const x = xPeri * cosAp - yPeri * sinAp;
  const y = xPeri * sinAp + yPeri * cosAp;
  // 速度（AU/day）：近日点坐标系分量 → 同一旋转
  const e1 = GAUSS_K / (Math.pow(a, 1.5) * (1 - e * Math.cos(ea)));
  const vxPeri = -a * e1 * Math.sin(ea);
  const vyPeri = a * e1 * Math.sqrt(Math.max(0, 1 - e * e)) * Math.cos(ea);
  const vx = vxPeri * cosAp - vyPeri * sinAp;
  const vy = vxPeri * sinAp + vyPeri * cosAp;
  const radius = Math.hypot(x, y);
  return { x, y, z: 0, longitude: mod360(Math.atan2(y, x) / DEG), radius, vx, vy };
};

/** 只要位置时的别名（保持既有调用点语义）。 */
export const heliocentricEcliptic = (elements: MatrixElements, t: number): HeliocentricPosition => heliocentricState(elements, t);

const JD_J1900 = 2415020.5;

/** 儒略世纪数 T：以 J1900.0 为起点，与 Astrolog matrix 要素表一致。 */
export const centuriesFromJ1900 = (julianDay: number) => (julianDay - JD_J1900) / 36525;

export type TnpPosition = {
  id: string;
  name: string;
  nameZh: string;
  glyph: string;
  principles: string[];
  /** 地心黄经（度，当日黄道），已按 Astrolog 口径做 aber 更正。 */
  longitude: number;
  /** 未做 aber 更正的地心几何黄经（度）。 */
  geometricLongitude: number;
  /** 本次更正量（度，正值 = 视黄经小于几何黄经）。 */
  aberration: number;
  /** 日心黄经（度）。 */
  heliocentric: number;
  distance: number;
};

/**
 * 地心黄经的 aber 项，口径完全取自 Astrolog（matrix.cpp:640）：
 *
 *   aber = 0.0057756 * RLength3(XS, YS, ZS) * ret[i];   // Aberration
 *
 * 其中 0.0057756 是 1 AU 的光行时（天/AU，即 499.0048 s），RLength3 是地心距离
 * （AU），ret[i] 是地心黄经的日变化（度/天，matrix.cpp:637-638 由地心位置与
 * 「天体日心速度 − 地球日心速度」的速度分量算出）。于是
 *
 *   视黄经 = 几何黄经 − τ·dλ/dt          （calc.cpp:937 `planet[ind] = Mod(DFromR(ang) - aber ...)`）
 *
 * 这既含光行时（观测到的是 τ 天前的几何位置），也含观测者（地球）运动引起的
 * 光行差，即天文上的「行星光行差」。自洽性检验：对太阳，r≈1 AU、ret≈1°/天，
 * 该式给出 ≈0.0058° ≈ 20.8″，与经典周年光行差常数 20.49552″ 同量级——
 * Astrolog 正是用同一式子处理太阳的。
 *
 * 适用范围说明（重要）：光行差/光行时是光的传播与观测者运动效应，物理上只对
 * 「真实发光（反射光）天体」成立。八虚星是 Witte 1914 起的名义假想天体，没有光，
 * 因此这一项对它们没有物理必然性。之所以仍然施加，是因为本仓的要素表与解算流
 * 程就是 Astrolog ComputePlanets()/ProcessPlanet() 的移植，而 Astrolog 对八虚星
 * 同样施加该项（matrix.cpp:632-641 的循环一直走到 uranHi）。若省略，得到的就是
 * 与「Astrolog 口径的八虚星」相差 ~0.006° 的另一组数——即本仓自己的移植不完整。
 * 因此这里保留该项，并把 geometricLongitude / aberration 一并输出，使「用了哪
 * 个口径」可核对；量级 ~0.006° 远小于汉堡学派通行容许度（默认 1.5°）。
 *
 * 本仓没有独立的地球速度向量来源：地球速度按同一 Astrolog 口径由 EARTH_ELEMENTS
 * （即 matrix.cpp rgoe[0]「Earth/Sun」）用上面的 E1 公式与 velocity 旋转自行求出，
 * 不使用 celestine（celestine 对真实行星直接加常数 −20.49552″ 的视位置改正，
 * 见 dist/index.js:1159/2950/3435 等，与 Astrolog 的 r·dλ/dt 形式不同口径）。
 */
export const ASTROLOG_ABERRATION_CONSTANT = 0.0057756; // 天/AU（Astrolog matrix.cpp:640 字面值）

/** aber（度）= 光行时 × 地心黄经日变化。 */
export const aberrationDegrees = (distanceAu: number, dailyMotionDeg: number) => ASTROLOG_ABERRATION_CONSTANT * distanceAu * dailyMotionDeg;

export type UranianPositionOptions = {
  /** 是否施加 Astrolog 的 aber 更正，默认 true（与参考实现口径一致）。 */
  aberration?: boolean;
};

/** 八虚星的地心黄经：日心坐标减去地球日心坐标（地球为 oEar，matrix.cpp:605-611）。 */
export const uranianPositions = (julianDay: number, options: UranianPositionOptions = {}): TnpPosition[] => {
  const applyAberration = options.aberration ?? true;
  const t = centuriesFromJ1900(julianDay);
  const earth = heliocentricState(EARTH_ELEMENTS, t);
  return TNPS.map((body) => {
    const helio = heliocentricState(body.elements, t);
    const dx = helio.x - earth.x;
    const dy = helio.y - earth.y;
    const distance = Math.hypot(dx, dy);
    const geometricLongitude = mod360(Math.atan2(dy, dx) / DEG);
    // 地心黄经日变化（度/天），Astrolog matrix.cpp:637-638：
    //   ret = DFromR((X·(vy_i − vy_earth) − Y·(vx_i − vx_earth)) / (X² + Y²))
    const dailyMotion = (dx * (helio.vy - earth.vy) - dy * (helio.vx - earth.vx)) / (dx * dx + dy * dy) / DEG;
    const aberration = applyAberration ? aberrationDegrees(distance, dailyMotion) : 0;
    return {
      id: body.id,
      name: body.name,
      nameZh: body.nameZh,
      glyph: body.glyph,
      principles: body.principles,
      longitude: mod360(geometricLongitude - aberration),
      geometricLongitude,
      aberration,
      heliocentric: helio.longitude,
      distance,
    };
  });
};
