/*!
 * 神圣几何图案定义。
 *
 * 移植自 MIT 许可项目 `evoluteur/sacred-geometry` 的 `patterns.js`：
 * https://github.com/evoluteur/sacred-geometry
 * (c) 2026 Olivier Giulieri - MIT license
 *
 * 每个图形都在抽象单位空间里构造（构造圆半径 = 1），返回纯形状描述，
 * 因此同一份代码可以喂给 DOM / 导出 SVG / 测试。
 *   draw(options) -> { shapes: [{ tag, attrs, len, guide }], extent }
 * extent 是图形围绕原点的半径，渲染器用它把图形缩放进 viewBox。
 *
 * MIT License — Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including without
 * limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, subject to the condition that
 * the above copyright notice and this permission notice be included in all
 * copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED
 * "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

export const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT3 = Math.sqrt(3);
const DEG = Math.PI / 180;

const n4 = (n: number) => Math.round(n * 1e4) / 1e4;
const xy = (p: number[]) => `${n4(p[0])},${n4(p[1])}`;
const polar = (dist: number, deg: number) => [dist * Math.cos(deg * DEG), dist * Math.sin(deg * DEG)];
const hex = (dist: number, offset = 0) => [0, 1, 2, 3, 4, 5].map((i) => polar(dist, i * 60 + offset));

export type SacredShape = {
  tag: "circle" | "line" | "polygon" | "path" | "rect";
  attrs: Record<string, string | number>;
  len: number;
  guide: boolean;
  fill?: boolean;
};
export type SacredFigure = { shapes: SacredShape[]; extent: number };
export type SacredSteps = { label: string; min: number; max: number; def: number };
export type SacredPattern = {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  steps: SacredSteps | null;
  draw: (options?: { steps?: number }) => SacredFigure;
};

const shape = (tag: SacredShape["tag"], attrs: SacredShape["attrs"], len: number, guide = false): SacredShape => ({ tag, attrs, len: n4(len), guide });
const circle = (c: number[], r: number, guide = false) => shape("circle", { cx: n4(c[0]), cy: n4(c[1]), r: n4(r) }, 2 * Math.PI * r, guide);
const line = (a: number[], b: number[], guide = false) => shape("line", { x1: n4(a[0]), y1: n4(a[1]), x2: n4(b[0]), y2: n4(b[1]) }, Math.hypot(b[0] - a[0], b[1] - a[1]), guide);
const polygon = (pts: number[][], guide = false) =>
  shape(
    "polygon",
    { points: pts.map(xy).join(" ") },
    pts.reduce((sum, p, i) => {
      const q = pts[(i + 1) % pts.length];
      return sum + Math.hypot(q[0] - p[0], q[1] - p[1]);
    }, 0),
    guide,
  );
const path = (d: string, len: number, guide = false) => shape("path", { d }, len, guide);

const pairs = (pts: number[][]) => {
  const out: Array<[number[], number[]]> = [];
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) out.push([pts[i], pts[j]]);
  }
  return out;
};

/** 两枚单位圆（圆心距 d）共享的透镜（mandorla）。 */
const mandorla = (mid: number, d: number, r = 1) => {
  const h = Math.sqrt(r * r - (d / 2) * (d / 2));
  const lens = path(`M ${n4(mid)},${n4(-h)} A ${n4(r)},${n4(r)} 0 0,1 ${n4(mid)},${n4(h)} A ${n4(r)},${n4(r)} 0 0,1 ${n4(mid)},${n4(-h)} Z`, (4 * Math.PI * r) / 3);
  lens.fill = true;
  return lens;
};

/** 三角格子上的圆心，保留落在 rings 内的点。 */
const lattice = (rings: number) => {
  const pts: number[][] = [];
  const span = rings + 1;
  for (let i = -span; i <= span; i += 1) {
    for (let j = -span; j <= span; j += 1) {
      const x = i + j * 0.5;
      const y = (j * SQRT3) / 2;
      if (Math.hypot(x, y) <= rings + 1e-9) pts.push([x, y]);
    }
  }
  return pts;
};

const fibSquares = (count: number) => {
  const sq = [{ x0: 0, y0: 0, x1: 1, y1: 1, dir: 3 }];
  let minx = 0;
  let miny = 0;
  let maxx = 1;
  let maxy = 1;
  for (let k = 1; k < count; k += 1) {
    const dir = (k - 1) % 4;
    if (dir === 0) {
      const s = maxy - miny;
      sq.push({ x0: maxx, y0: miny, x1: maxx + s, y1: miny + s, dir });
      maxx += s;
    } else if (dir === 1) {
      const s = maxx - minx;
      sq.push({ x0: minx, y0: maxy, x1: minx + s, y1: maxy + s, dir });
      maxy += s;
    } else if (dir === 2) {
      const s = maxy - miny;
      sq.push({ x0: minx - s, y0: maxy - s, x1: minx, y1: maxy, dir });
      minx -= s;
    } else {
      const s = maxx - minx;
      sq.push({ x0: maxx - s, y0: miny - s, x1: maxx, y1: miny, dir });
      miny -= s;
    }
  }
  return { sq, bbox: [minx, miny, maxx, maxy] };
};

export const PATTERNS: SacredPattern[] = [
  {
    id: "vesica",
    name: "Vesica Piscis",
    tagline: "二而成一",
    blurb: "两枚圆各自穿过对方圆心；重叠出的杏形（mandorla）含 √2、√3、√5，其后所有图形都由它生成。",
    steps: { label: "Circles", min: 2, max: 8, def: 2 },
    draw({ steps = 2 } = {}) {
      const n = Math.max(2, steps);
      const shapes: SacredShape[] = [];
      const xs: number[] = [];
      for (let i = 0; i < n; i += 1) xs.push(i - (n - 1) / 2);
      shapes.push(line([xs[0] - 1.15, 0], [xs[n - 1] + 1.15, 0], true));
      const h = SQRT3 / 2;
      for (let i = 0; i < n - 1; i += 1) {
        const mid = (xs[i] + xs[i + 1]) / 2;
        shapes.push(line([mid, -h], [mid, h], true));
        shapes.push(polygon([[xs[i], 0], [xs[i + 1], 0], [mid, -h]], true));
        shapes.push(polygon([[xs[i], 0], [xs[i + 1], 0], [mid, h]], true));
      }
      xs.forEach((x) => shapes.push(circle([x, 0], 1)));
      for (let i = 0; i < n - 1; i += 1) shapes.push(mandorla((xs[i] + xs[i + 1]) / 2, 1));
      return { shapes, extent: (n - 1) / 2 + 1 };
    },
  },
  {
    id: "seed",
    name: "Seed of Life",
    tagline: "七日七圆",
    blurb: "六圆绕一圆，每圆圆心落在前一圆的圆周上；六个交叠的 vesica 构成生命之花中心的六瓣花。",
    steps: null,
    draw() {
      const shapes = [polygon(hex(1), true), circle([0, 0], 2, true)];
      shapes.push(circle([0, 0], 1));
      hex(1).forEach((c) => shapes.push(circle(c, 1)));
      return { shapes, extent: 2 };
    },
  },
  {
    id: "flower",
    name: "Flower of Life",
    tagline: "万形生长其上的格子",
    blurb: "生命之种沿三角格子向外延展。两环即经典的十九圆花——阿比多斯奥西里昂所刻；继续外扩，玫瑰花形便会无限平铺。",
    steps: { label: "Rings", min: 1, max: 6, def: 2 },
    draw({ steps = 2 } = {}) {
      const rings = Math.max(1, steps);
      const shapes: SacredShape[] = [polygon(hex(rings), true)];
      lattice(rings).forEach((c) => shapes.push(circle(c, 1)));
      shapes.push(circle([0, 0], rings + 1));
      shapes.push(circle([0, 0], rings + 1.1));
      return { shapes, extent: rings + 1.1 };
    },
  },
  {
    id: "metatron",
    name: "Metatron's Cube",
    tagline: "十三圆，七十八线",
    blurb: "取「生命之果」的十三个完整圆，把每个圆心与其余圆心相连。七十八条线里藏着两个六芒星、一个六边形，以及五个柏拉图立体的平面投影。",
    steps: null,
    draw() {
      const centers = [[0, 0]].concat(hex(2), hex(2 * SQRT3, 30));
      const shapes: SacredShape[] = [circle([0, 0], 2 * SQRT3 + 1, true), polygon(hex(2), true)];
      centers.forEach((c) => shapes.push(circle(c, 1)));
      pairs(centers).forEach(([a, b]) => shapes.push(line(a, b)));
      return { shapes, extent: 2 * SQRT3 + 1 };
    },
  },
  {
    id: "golden",
    name: "Golden Spiral",
    tagline: "1, 1, 2, 3, 5, 8, 13…",
    blurb: "斐波那契正方形彼此角接，每边长为前两者之和；跨过它们的四分之一圆逼近每转四分之一增长 φ(1.618…) 的对数螺旋。",
    steps: { label: "Squares", min: 2, max: 13, def: 8 },
    draw({ steps = 8 } = {}) {
      const count = Math.max(2, steps);
      const { sq, bbox } = fibSquares(count);
      const cx = (bbox[0] + bbox[2]) / 2;
      const cy = (bbox[1] + bbox[3]) / 2;
      const p = (x: number, y: number) => [x - cx, -(y - cy)];
      const shapes: SacredShape[] = [];
      sq.forEach((s) => {
        const c = p(s.x0, s.y1);
        const side = s.x1 - s.x0;
        shapes.push(shape("rect", { x: n4(c[0]), y: n4(c[1]), width: n4(side), height: n4(side) }, 4 * side, true));
      });
      const bw = bbox[2] - bbox[0];
      const bh = bbox[3] - bbox[1];
      shapes.push(shape("rect", { x: n4(bbox[0] - cx), y: n4(-(bbox[3] - cy)), width: n4(bw), height: n4(bh) }, 2 * (bw + bh), true));
      sq.forEach((s) => {
        const r = s.x1 - s.x0;
        let from: number[];
        let to: number[];
        if (s.dir === 0) {
          from = p(s.x0, s.y0);
          to = p(s.x1, s.y1);
        } else if (s.dir === 1) {
          from = p(s.x1, s.y0);
          to = p(s.x0, s.y1);
        } else if (s.dir === 2) {
          from = p(s.x1, s.y1);
          to = p(s.x0, s.y0);
        } else {
          from = p(s.x0, s.y1);
          to = p(s.x1, s.y0);
        }
        shapes.push(path(`M ${xy(from)} A ${n4(r)},${n4(r)} 0 0,0 ${xy(to)}`, (Math.PI * r) / 2));
      });
      return { shapes, extent: Math.max(bw, bh) / 2 };
    },
  },
];

export const patternById = (id: string) => PATTERNS.find((pattern) => pattern.id === id) ?? PATTERNS[0];
