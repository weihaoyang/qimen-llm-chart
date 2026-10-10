/**
 * 汉堡学派 90° 盘（及 45°/22.5° 盘）的盘面算术、中点与行星图景。
 *
 * 圆盘把所有天体投影到 modulus（默认 90°）区间：合相、刑相、冲相在盘上
 * 重合，故盘面上的“合”对应四正相位。相关方法与术语属该体系通行做法，
 * 本文件为自实现（无外部代码移植）。
 */

export type DialBody = {
  id: string;
  name: string;
  glyph: string;
  longitude: number;
  kind: "planet" | "angle" | "tnp";
};

export type DialSettings = { modulus: number; orb: number };

export const DEFAULT_DIAL: DialSettings = { modulus: 90, orb: 1.5 };

export const dialPosition = (longitude: number, modulus = DEFAULT_DIAL.modulus) => {
  const value = ((longitude % modulus) + modulus) % modulus;
  return Number(value.toFixed(6));
};

export const dialDistance = (a: number, b: number, modulus = DEFAULT_DIAL.modulus) => {
  const diff = Math.abs(dialPosition(a, modulus) - dialPosition(b, modulus));
  return Number(Math.min(diff, modulus - diff).toFixed(6));
};

/** 中点轴所在的盘面位置（A/B 与它的对轴同点）。 */
export const midpointAxis = (a: number, b: number, modulus = DEFAULT_DIAL.modulus) => dialPosition((a + b) / 2, modulus);

/** 和点轴（A+B）。 */
export const sumAxis = (a: number, b: number, modulus = DEFAULT_DIAL.modulus) => dialPosition(a + b, modulus);

/** 差点轴（A−B）。 */
export const differenceAxis = (a: number, b: number, modulus = DEFAULT_DIAL.modulus) => dialPosition(a - b, modulus);

export type Occupation = { body: DialBody; orb: number };

export type MidpointStructure = {
  a: DialBody;
  b: DialBody;
  axis: number;
  occupied: Occupation[];
};

export type SumStructure = {
  a: DialBody;
  b: DialBody;
  axis: number;
  occupied: Occupation[];
};

export type EquationStructure = {
  axis: number;
  left: [DialBody, DialBody];
  right: [DialBody, DialBody];
  orb: number;
};

const sortByTightest = (occupied: Occupation[]) => [...occupied].sort((left, right) => left.orb - right.orb);

/** 被其他天体“占据”的中点（A/B = C），按最紧的容许度排序。 */
export const findMidpointStructures = (bodies: DialBody[], settings: DialSettings = DEFAULT_DIAL): MidpointStructure[] => {
  const out: MidpointStructure[] = [];
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const axis = midpointAxis(bodies[i].longitude, bodies[j].longitude, settings.modulus);
      const occupied = bodies
        .filter((_, index) => index !== i && index !== j)
        .map((body) => ({ body, orb: dialDistance(body.longitude, axis, settings.modulus) }))
        .filter((entry) => entry.orb <= settings.orb);
      if (occupied.length) out.push({ a: bodies[i], b: bodies[j], axis, occupied: sortByTightest(occupied) });
    }
  }
  return out.sort((left, right) => left.occupied[0].orb - right.occupied[0].orb);
};

/** 被占据的和点（A+B = C），即单因子行星图景。 */
export const findSumStructures = (bodies: DialBody[], settings: DialSettings = DEFAULT_DIAL): SumStructure[] => {
  const out: SumStructure[] = [];
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const axis = sumAxis(bodies[i].longitude, bodies[j].longitude, settings.modulus);
      const occupied = bodies
        .filter((_, index) => index !== i && index !== j)
        .map((body) => ({ body, orb: dialDistance(body.longitude, axis, settings.modulus) }))
        .filter((entry) => entry.orb <= settings.orb);
      if (occupied.length) out.push({ a: bodies[i], b: bodies[j], axis, occupied: sortByTightest(occupied) });
    }
  }
  return out.sort((left, right) => left.occupied[0].orb - right.occupied[0].orb);
};

const key = (a: DialBody, b: DialBody, c: DialBody, d: DialBody) => [a.id, b.id, c.id, d.id].join("|");

/** 和点等式（A+B = C+D），两个因子和相同，即双因子行星图景。 */
export const findEquationStructures = (bodies: DialBody[], settings: DialSettings = DEFAULT_DIAL, limit = 40): EquationStructure[] => {
  const pairs: Array<[number, number, number]> = [];
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      pairs.push([i, j, sumAxis(bodies[i].longitude, bodies[j].longitude, settings.modulus)]);
    }
  }
  const out: EquationStructure[] = [];
  const seen = new Set<string>();
  for (let p = 0; p < pairs.length; p += 1) {
    for (let q = p + 1; q < pairs.length; q += 1) {
      const [i, j, axis] = pairs[p];
      const [k, l, other] = pairs[q];
      if (i === k || i === l || j === k || j === l) continue;
      const orb = dialDistance(axis, other, settings.modulus);
      if (orb > settings.orb) continue;
      const id = key(bodies[i], bodies[j], bodies[k], bodies[l]);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ axis, left: [bodies[i], bodies[j]], right: [bodies[k], bodies[l]], orb });
    }
  }
  return out.sort((left, right) => left.orb - right.orb).slice(0, limit);
};

/** 盘面数值格式化：90° 盘上以「度°分′」呈现。 */
export const formatDial = (position: number) => {
  const total = Math.round(position * 60);
  const degree = Math.floor(total / 60);
  const minute = total % 60;
  return `${degree}°${String(minute).padStart(2, "0")}′`;
};
