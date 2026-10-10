import { describe, expect, it } from "vitest";
import { buildAstroChart } from "@/lib/astro/chart";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildUranianChart, julianDayFromProfile, toZodiac } from "./chart";
import {
  dialDistance,
  dialPosition,
  differenceAxis,
  findDifferenceStructures,
  findEquationStructures,
  findMidpointStructures,
  findSumStructures,
  formatDial,
  midpointAxis,
  sumAxis,
  type DialBody,
} from "./dial";
import { ASTROLOG_ABERRATION_CONSTANT, aberrationDegrees, centuriesFromJ1900, EARTH_ELEMENTS, heliocentricEcliptic, heliocentricState, TNPS, uranianPositions } from "./elements";
import { serializeUranianToCompactJson, serializeUranianToStructuredText } from "./serializer";

const profile = () => {
  const input = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return normalizeProfileInput(input);
};

const body = (id: string, longitude: number): DialBody => ({ id, name: id, glyph: id.toUpperCase(), longitude, kind: "planet" });

describe("uranian elements", () => {
  it("places the epoch and the eight trans-Neptunian bodies", () => {
    expect(centuriesFromJ1900(2451545.0)).toBeCloseTo(1, 4);
    expect(TNPS).toHaveLength(8);
    for (const item of TNPS) {
      expect(item.principles.length).toBeGreaterThan(0);
      expect(item.elements.sma).toBeGreaterThan(40);
    }
  });

  it("solves Cupido on its circular orbit at epoch", () => {
    const cupido = heliocentricEcliptic(TNPS[0].elements, 0);
    expect(cupido.longitude).toBeCloseTo(104.5959, 3);
    expect(cupido.radius).toBeCloseTo(40.99837, 3);
    expect(cupido.z).toBe(0);
  });

  it("keeps the earth elements usable for the geocentric step", () => {
    const earth = heliocentricEcliptic(EARTH_ELEMENTS, 1);
    expect(earth.radius).toBeGreaterThan(0.98);
    expect(earth.radius).toBeLessThan(1.02);
  });

  it("returns eight distinct geocentric longitudes", () => {
    const positions = uranianPositions(2451545.0);
    expect(positions).toHaveLength(8);
    for (const position of positions) {
      expect(position.longitude).toBeGreaterThanOrEqual(0);
      expect(position.longitude).toBeLessThan(360);
      expect(position.distance).toBeGreaterThan(0);
    }
    expect(new Set(positions.map((position) => position.longitude.toFixed(3))).size).toBe(8);
    expect(toZodiac(positions[0].longitude).label).toMatch(/[白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯水瓶双鱼]/);
  });

  it("applies Astrolog's aber term (light-time × geocentric daily motion) to the longitudes", () => {
    // 常数与公式口径来自 Astrolog matrix.cpp:640
    //   aber = 0.0057756 * RLength3(XS, YS, ZS) * ret[i];
    expect(ASTROLOG_ABERRATION_CONSTANT).toBe(0.0057756);

    const withAberration = uranianPositions(2451545.0); // J2000.0
    const geometric = uranianPositions(2451545.0, { aberration: false });
    const mod = (value: number) => ((value % 360) + 360) % 360;

    expect(withAberration).toHaveLength(8);
    for (let index = 0; index < withAberration.length; index += 1) {
      const row = withAberration[index];
      const delta = Math.abs(row.longitude - geometric[index].longitude);
      expect(delta).toBeGreaterThan(1e-4); // 确实施加了更正，不是空操作
      expect(delta).toBeLessThan(0.02); // 仍是 0.01° 量级：远小于 1.5° 容许度
      expect(row.longitude).toBeCloseTo(mod(row.geometricLongitude - row.aberration), 6);
      expect(geometric[index].aberration).toBe(0); // 关闭时置零
      expect(geometric[index].longitude).toBeCloseTo(geometric[index].geometricLongitude, 9);
    }
  });

  it("reproduces the classical aberration constant for the Sun", () => {
    // 自洽性检验：太阳地心黄经的日变化 ≈ 1°/天、距离 ≈ 1 AU，
    // 同一式子应给出经典周年光行差常数 ≈ 20.5″。
    const earth = heliocentricState(EARTH_ELEMENTS, 1);
    const dailyMotion = ((earth.x * earth.vy - earth.y * earth.vx) / (earth.x * earth.x + earth.y * earth.y)) * (180 / Math.PI);
    const arcseconds = aberrationDegrees(earth.radius, dailyMotion) * 3600;
    expect(arcseconds).toBeGreaterThan(15);
    expect(arcseconds).toBeLessThan(25);
  });
});

describe("uranian dial", () => {
  it("wraps positions and measures the shortest dial distance", () => {
    expect(dialPosition(190, 90)).toBe(10);
    expect(dialPosition(-10, 90)).toBe(80);
    expect(dialDistance(1, 89, 90)).toBe(2);
    expect(dialDistance(10, 40, 90)).toBe(30);
    expect(midpointAxis(10, 20, 90)).toBe(15);
    expect(sumAxis(10, 20, 90)).toBe(30);
    expect(differenceAxis(30, 10, 90)).toBe(20);
    expect(formatDial(12.5)).toBe("12°30′");
    expect(formatDial(0)).toBe("0°00′");
  });

  it("finds occupied midpoints, sums and sum equations", () => {
    const midpoints = findMidpointStructures([body("a", 0), body("b", 60), body("c", 30)], { modulus: 90, orb: 0.5 });
    expect(midpoints).toHaveLength(1);
    expect(midpoints[0].axis).toBe(30);
    expect(midpoints[0].occupied[0].body.id).toBe("c");

    const sums = findSumStructures([body("a", 5), body("b", 25), body("c", 30), body("d", 70)], { modulus: 90, orb: 0.5 });
    expect(sums.some((entry) => entry.axis === 30 && entry.occupied.some((hit) => hit.body.id === "c"))).toBe(true);

    const equations = findEquationStructures([body("a", 0), body("b", 10), body("c", 20), body("d", 30)], { modulus: 90, orb: 0.001 });
    expect(equations).toHaveLength(1);
    expect(equations[0].axis).toBe(30);
  });

  it("finds occupied difference axes (A−B = C)", () => {
    // 50 − 20 = 30（mod 90），令 c 落在 30
    const differences = findDifferenceStructures([body("a", 50), body("b", 20), body("c", 30)], { modulus: 90, orb: 0.5 });
    const hit = differences.find((entry) => entry.a.id === "a" && entry.b.id === "b");
    expect(hit?.axis).toBe(30);
    expect(hit?.occupied.some((item) => item.body.id === "c")).toBe(true);
  });
});

describe("uranian chart", () => {
  it("assembles planets, angles, the eight TNPs and the dial structures", () => {
    const input = profile();
    const astro = buildAstroChart(input);
    const chart = buildUranianChart(input, astro);

    expect(chart.format).toBe("qmdj-uranian-v1");
    expect(chart.tnps).toHaveLength(8);
    expect(chart.bodies).toHaveLength(astro.points.length + 2 + 8);
    expect(chart.bodies.filter((entry) => entry.kind === "tnp")).toHaveLength(8);
    expect(chart.midpoints.length).toBeGreaterThan(0);

    for (const row of chart.tnps) {
      expect(row.dial90).toBeGreaterThanOrEqual(0);
      expect(row.dial90).toBeLessThan(90);
      expect(row.dial90Label).toBe(formatDial(row.dial90));
    }

    const text = serializeUranianToStructuredText(chart);
    expect(text).toContain("汉堡学派");
    expect(text).toContain("Cupido");
    expect(text).toContain("仅列前 60 条");
    const payload = JSON.parse(serializeUranianToCompactJson(chart)) as { format: string; tnps: unknown[]; bodies: unknown[] };
    expect(payload.format).toBe("qmdj-uranian-v1");
    expect(payload.tnps).toHaveLength(8);
    expect(payload.bodies).toHaveLength(chart.bodies.length);
  });

  it("recomputes the dial structures for the 22.5° and 45° dials", () => {
    const input = profile();
    const astro = buildAstroChart(input);
    const ninety = buildUranianChart(input, astro, { modulus: 90, orb: 1.5 });

    for (const modulus of [45, 22.5]) {
      const chart = buildUranianChart(input, astro, { modulus, orb: 1.5 });
      expect(chart.settings.modulus).toBe(modulus);
      // 盘面与结构检索都按 modulus 重算，而不是沿用 90°。
      for (const row of chart.tnps) {
        expect(row.dial).toBeGreaterThanOrEqual(0);
        expect(row.dial).toBeLessThan(modulus);
        expect(row.dialLabel).toBe(formatDial(row.dial));
      }
      for (const entry of chart.midpoints) {
        expect(entry.axis).toBeGreaterThanOrEqual(0);
        expect(entry.axis).toBeLessThan(modulus);
      }
      for (const entry of chart.sums) {
        expect(entry.axis).toBeGreaterThanOrEqual(0);
        expect(entry.axis).toBeLessThan(modulus);
      }
      expect(chart.totals.midpoints).toBeGreaterThan(ninety.totals.midpoints);
      expect(chart.midpoints).toHaveLength(Math.min(60, chart.totals.midpoints));
      expect(chart.limits).toEqual({ structures: 60, equations: 40 });
      expect(chart.equations.length).toBe(Math.min(40, chart.totals.equations));
      expect(chart.totals.midpoints).toBeGreaterThanOrEqual(chart.totals.sums);
    }
  });

  it("drops the angles when there is no birth place", () => {
    const unlocated = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    delete unlocated.location;
    const input = normalizeProfileInput(unlocated);
    const chart = buildUranianChart(input, buildAstroChart(input));
    expect(chart.input.hasPlace).toBe(false);
    expect(chart.bodies.filter((entry) => entry.kind === "angle")).toHaveLength(0);
    expect(chart.tnps).toHaveLength(8);
    expect(julianDayFromProfile(input.normalized.datetime, input.normalized.timeZone)).toBeGreaterThan(2460000);
  });
});
