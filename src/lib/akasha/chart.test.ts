import { describe, expect, it } from "vitest";
import { buildAkashaChart, sourcePositions } from "./chart";
import { AKASHA_CONCEPTS, AKASHA_ETHICS, FRACTALS, HOLOGRAM_CONCEPTS, MASS_PRESETS } from "./data";
import { bekensteinBits, bekensteinNats, entropyBits, fft, hologramDemo, holographicReport, horizonArea, schwarzschildRadius, volumeLawBits } from "./holography";
import { serializeAkashaToCompactJson, serializeAkashaToStructuredText } from "./serializer";

describe("akasha knowledge tables", () => {
  it("ships the concept entries, timeline, protocol and ethics", () => {
    expect(AKASHA_CONCEPTS.length).toBeGreaterThanOrEqual(6);
    expect(FRACTALS).toHaveLength(5);
    expect(HOLOGRAM_CONCEPTS.length).toBeGreaterThanOrEqual(8);
    expect(AKASHA_ETHICS.length).toBeGreaterThanOrEqual(4);
    expect(MASS_PRESETS).toHaveLength(5);
    for (const entry of HOLOGRAM_CONCEPTS) expect(entry.computed.length).toBeGreaterThan(0);
  });

  it("keeps the classical fractal dimensions", () => {
    const byName = Object.fromEntries(FRACTALS.map((fractal) => [fractal.zh, fractal.dimension]));
    expect(byName["康托集"]).toBeCloseTo(0.6309, 4);
    expect(byName["科赫曲线"]).toBeCloseTo(1.2619, 4);
    expect(byName["谢尔宾斯基三角"]).toBeCloseTo(1.585, 3);
    expect(byName["门格海绵"]).toBeCloseTo(2.7268, 4);
  });
});

describe("holographic physics", () => {
  it("computes the Schwarzschild radius and horizon area", () => {
    const earth = schwarzschildRadius(5.9722e24);
    expect(earth).toBeCloseTo(8.87e-3, 4); // 约 8.87 mm
    expect(horizonArea(earth)).toBeCloseTo(4 * Math.PI * earth * earth, 6);
  });

  it("puts one bit per four Planck areas and reproduces the known magnitudes", () => {
    const earth = holographicReport(5.9722e24);
    expect(Math.log10(earth.bits)).toBeGreaterThan(65);
    expect(Math.log10(earth.bits)).toBeLessThan(66); // 地球约 1e66 比特
    expect(earth.entropyJK / earth.bits).toBeCloseTo(1.380649e-23, 34);

    const sun = holographicReport(1.98847e30);
    expect(Math.log10(sun.bits)).toBeGreaterThan(76);
    expect(Math.log10(sun.bits)).toBeLessThan(78); // 太阳约 1e77

    const universe = holographicReport(1.5e53);
    expect(Math.log10(universe.bits)).toBeGreaterThan(122);
    expect(Math.log10(universe.bits)).toBeLessThan(123); // 观测宇宙约 1e122
  });

  it("shows the area law is far smaller than the volume law", () => {
    const report = holographicReport(5.9722e24);
    expect(report.volumeBits).toBeGreaterThan(report.bits);
    expect(report.areaVsVolume).toBeGreaterThan(1);
    expect(entropyBits(4 * 1.616255e-35 ** 2)).toBeCloseTo(1, 6); // 4 个普朗克面积 = 1 比特
  });

  it("computes the Bekenstein bound in nats and converts to bits (÷ ln 2)", () => {
    const nats = bekensteinNats(1, 1 * 2.99792458e8 ** 2);
    expect(nats).toBeGreaterThan(1.7e43);
    expect(nats).toBeLessThan(1.9e43);
    const bits = bekensteinBits(1, 1 * 2.99792458e8 ** 2);
    expect(bits).toBeCloseTo(nats / Math.LN2, 30);
    expect(bits).toBeGreaterThan(2.4e43);
    expect(bits).toBeLessThan(2.7e43);
    expect(volumeLawBits(1)).toBeGreaterThan(0);
  });
});

describe("fft and hologram reconstruction", () => {
  it("transforms a small sequence like the textbook DFT", () => {
    const re = Float64Array.from([1, 2, 3, 4]);
    const im = new Float64Array(4);
    fft(re, im);
    const magnitude = Array.from({ length: 4 }, (_, i) => Number(Math.hypot(re[i], im[i]).toFixed(4)));
    expect(magnitude[0]).toBeCloseTo(10, 4);
    expect(magnitude[1]).toBeCloseTo(Math.sqrt(8), 4);
    expect(magnitude[2]).toBeCloseTo(2, 4);
    expect(magnitude[3]).toBeCloseTo(Math.sqrt(8), 4);
  });

  it("matches a naive DFT pointwise at the demo size (N = 256)", () => {
    const n = 256;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    const signal = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      signal[i] = Math.sin((2 * Math.PI * 5 * i) / n) + 0.5 * Math.cos((2 * Math.PI * 11 * i) / n);
      re[i] = signal[i];
    }
    fft(re, im);
    for (let k = 0; k < n; k += 1) {
      let sumRe = 0;
      let sumIm = 0;
      for (let t = 0; t < n; t += 1) {
        const angle = (-2 * Math.PI * k * t) / n;
        sumRe += signal[t] * Math.cos(angle);
        sumIm += signal[t] * Math.sin(angle);
      }
      expect(re[k]).toBeCloseTo(sumRe, 8);
      expect(im[k]).toBeCloseTo(sumIm, 8);
    }
  });

  it("quantifies the 25% fragment correlation (documented as 0.755)", () => {
    expect(hologramDemo([-0.45, 0, 0.45], 0.25).correlation).toBeCloseTo(0.755, 2);
  });

  it("spreads the sources evenly and deterministically", () => {
    expect(sourcePositions(1)).toEqual([0]);
    expect(sourcePositions(3)).toEqual([-0.45, 0, 0.45]);
    expect(sourcePositions(5)).toHaveLength(5);
    expect(sourcePositions(99)).toHaveLength(9);
  });

  it("recovers the object points from the whole hologram", () => {
    const demo = hologramDemo([-0.45, 0, 0.45], 1);
    expect(demo.correlation).toBeCloseTo(1, 3);
    // 物点 ±0.45 处出现主峰；另有点源互调产生的鬼峰（0.9 → 折回 0.1）
    expect(demo.peaksFull.some((peak) => Math.abs(peak.x - 0.45) < 0.02)).toBe(true);
    expect(demo.peaksFull.some((peak) => Math.abs(peak.x - 0.1) < 0.02)).toBe(true);
  });

  it("still recovers every peak from a fragment, with loss of resolution", () => {
    const whole = hologramDemo([-0.45, 0, 0.45], 1);
    const part = hologramDemo([-0.45, 0, 0.45], 0.25);
    expect(part.usableFraction).toBeCloseTo(0.25, 2);
    expect(part.resolution).toBeCloseTo(4, 2);
    // 碎片重建覆盖整幅重建的全部峰位（部分含整体）
    for (const peak of whole.peaksFull) {
      expect(part.peaksFragment.some((entry) => Math.abs(entry.x - peak.x) < 0.02)).toBe(true);
    }
    // 主峰幅值按碎片比例下降，且峰变宽（出现相邻峰），相关性与分辨率同时下降
    expect(part.peaksFragment[0].value).toBeGreaterThan(whole.peaksFull[0].value * 0.2);
    expect(part.peaksFragment[0].value).toBeLessThan(whole.peaksFull[0].value * 0.3);
    expect(part.correlation).toBeLessThan(1);
    expect(part.correlation).toBeGreaterThan(0.5);
    expect(hologramDemo([-0.45, 0, 0.45], 0.1).correlation).toBeLessThan(part.correlation);
  });
});

describe("akasha chart", () => {
  it("assembles the report, the presets and the fractal table", () => {
    const chart = buildAkashaChart({ massKg: 5.9722e24, sourceCount: 3, fragment: 0.25 });
    expect(chart.format).toBe("qmdj-akasha-v1");
    expect(chart.holographic.massKg).toBe(5.9722e24);
    expect(chart.holographic.bekensteinBits).toBeGreaterThan(0);
    expect(chart.table).toHaveLength(5);
    expect(chart.fractals).toHaveLength(5);
    expect(chart.demo.sources).toHaveLength(3);
  });

  it("guards against invalid input", () => {
    const chart = buildAkashaChart({ massKg: 0, sourceCount: 3, fragment: 5 });
    expect(chart.holographic.massKg).toBe(1);
    expect(chart.input.fragment).toBe(1);
  });

  it("serializes both forms", () => {
    const chart = buildAkashaChart({ massKg: 1.98847e30, sourceCount: 5, fragment: 0.1 });
    const text = serializeAkashaToStructuredText(chart);
    expect(text).toContain("面积律");
    expect(text).toContain("阿卡西记录");
    const payload = JSON.parse(serializeAkashaToCompactJson(chart)) as { format: string; table: unknown[]; akasha: { concepts: unknown[] } };
    expect(payload.format).toBe("qmdj-akasha-v1");
    expect(payload.table).toHaveLength(5);
    expect(payload.akasha.concepts.length).toBeGreaterThanOrEqual(6);
  });
});
