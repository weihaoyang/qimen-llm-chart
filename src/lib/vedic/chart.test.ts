import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { ayanamsa, jdToJDE, meanNodeLongitude } from "./ayanamsa";
import { buildVedicChart, julianDayForProfile, nakshatraOf, rashiOf } from "./chart";
import { NAKSHATRAS, NAKSHATRA_LORDS, RASHIS, VARGA_CODES, VARGA_DEFINITIONS } from "./data";
import { serializeVedicToCompactJson, serializeVedicToStructuredText } from "./serializer";
import { vargaSign } from "./varga";

const profile = (withPlace = true) => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  if (withPlace) input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  else delete input.location;
  return normalizeProfileInput(input);
};

describe("vedic data", () => {
  it("ships the twelve rashis, twenty-seven nakshatras and sixteen vargas", () => {
    expect(RASHIS).toHaveLength(12);
    expect(NAKSHATRAS).toHaveLength(27);
    expect(NAKSHATRA_LORDS).toHaveLength(9);
    expect(VARGA_DEFINITIONS).toHaveLength(16);
    expect(VARGA_CODES).toEqual(["D1", "D2", "D3", "D4", "D7", "D9", "D10", "D12", "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60"]);
  });
});

describe("lahiri ayanamsa", () => {
  it("anchors J2000 near 23.853 degrees", () => {
    expect(ayanamsa(2451545)).toBeCloseTo(23.853064, 3);
    // 1900 应比 J2000 小约 1.39°（每年约 50.3″）
    const diff = ayanamsa(2451545) - ayanamsa(2415020.5);
    expect(diff).toBeGreaterThan(1.3);
    expect(diff).toBeLessThan(1.5);
  });

  it("uses the mean node for Rahu / Ketu", () => {
    const node = meanNodeLongitude(jdToJDE(2451545));
    expect(node).toBeGreaterThanOrEqual(0);
    expect(node).toBeLessThan(360);
  });
});

describe("nakshatra and rashi placement", () => {
  it("maps longitudes to the 27 nakshatras with four padas", () => {
    expect(nakshatraOf(0)).toMatchObject({ index: 1, name: "Ashwini", pada: 1, lord: "Ketu" });
    expect(nakshatraOf(21)).toMatchObject({ index: 2, name: "Bharani", pada: 3, lord: "Venus" });
    expect(nakshatraOf(359.9)).toMatchObject({ index: 27, name: "Revati", pada: 4, lord: "Mercury" });
  });

  it("maps longitudes to the twelve rashis", () => {
    expect(rashiOf(0).rasi).toBe(1);
    expect(rashiOf(0).degreeInRashi).toBeCloseTo(0, 6);
    expect(rashiOf(35).rasi).toBe(2);
    expect(rashiOf(35).degreeInRashi).toBeCloseTo(5, 6);
    expect(rashiOf(359).rasi).toBe(12);
    expect(rashiOf(359).degreeInRashi).toBeCloseTo(29, 6);
  });
});

describe("varga rules (Shodashavarga)", () => {
  it("distributes each 30° sign as the classics prescribe", () => {
    const cases: Array<[string, number, number, number]> = [
      ["D1", 1, 15, 1],
      ["D2", 1, 0, 5],
      ["D2", 1, 20, 4],
      ["D2", 2, 0, 4],
      ["D2", 2, 20, 5],
      ["D3", 1, 0, 1],
      ["D3", 1, 15, 5],
      ["D3", 1, 25, 9],
      ["D4", 1, 0, 1],
      ["D4", 1, 8, 4],
      ["D7", 1, 0, 1],
      ["D7", 1, 5, 2],
      ["D9", 1, 0, 1],
      ["D9", 1, 3.34, 2],
      ["D9", 1, 29.9, 9],
      ["D9", 2, 0, 10],
      ["D9", 3, 0, 7],
      ["D10", 1, 0, 1],
      ["D10", 1, 29, 10],
      ["D12", 1, 0, 1],
      ["D12", 1, 3, 2],
      ["D16", 1, 0, 1],
      ["D16", 2, 0, 5],
      ["D16", 3, 0, 9],
      ["D20", 1, 0, 1],
      ["D20", 2, 0, 9],
      ["D20", 3, 0, 5],
      ["D24", 1, 0, 5],
      ["D24", 2, 0, 4],
      ["D27", 1, 0, 1],
      ["D27", 2, 0, 4],
      ["D27", 3, 0, 7],
      ["D27", 4, 0, 10],
      ["D30", 1, 3, 1],
      ["D30", 1, 12, 9],
      ["D30", 1, 20, 3],
      ["D30", 1, 27, 7],
      ["D30", 2, 3, 2],
      ["D30", 2, 8, 6],
      ["D40", 1, 0, 1],
      ["D40", 2, 0, 7],
      ["D45", 1, 0, 1],
      ["D45", 2, 0, 5],
      ["D60", 1, 0, 1],
      ["D60", 2, 0, 8],
    ];
    for (const [code, rashi, degree, expected] of cases) {
      expect([code, rashi, degree, vargaSign(rashi, degree, code)]).toEqual([code, rashi, degree, expected]);
    }
  });

  it("returns the same sign for unknown codes", () => {
    expect(vargaSign(5, 12, "D99")).toBe(5);
  });
});

describe("vedic chart", () => {
  it("computes the nine grahas, the lagna and all sixteen vargas", () => {
    const chart = buildVedicChart(profile());
    expect(chart.format).toBe("qmdj-vedic-v1");
    expect(chart.grahas).toHaveLength(9);
    expect(chart.vargas).toHaveLength(16);
    expect(chart.lagna).not.toBeNull();
    expect(chart.ayanamsa).toBeGreaterThan(23.5);
    expect(chart.ayanamsa).toBeLessThan(24.5);

    for (const graha of chart.grahas) {
      expect(graha.longitude).toBeGreaterThanOrEqual(0);
      expect(graha.longitude).toBeLessThan(360);
      // D1 即本命宫，各曜的 D1 必须等于其所在宫
      expect(graha.vargas.D1).toBe(graha.rasi);
      expect(graha.nakshatra.index).toBeGreaterThanOrEqual(1);
      expect(graha.nakshatra.index).toBeLessThanOrEqual(27);
      expect(graha.nakshatra.pada).toBeGreaterThanOrEqual(1);
      expect(graha.nakshatra.pada).toBeLessThanOrEqual(4);
    }

    for (const varga of chart.vargas) {
      expect(Object.keys(varga.positions)).toHaveLength(9);
      if (varga.code === "D1") {
        expect(varga.lagnaRashi).toBe(chart.lagna?.rasi ?? null);
      }
      for (const rasi of Object.values(varga.positions)) {
        expect(rasi).toBeGreaterThanOrEqual(1);
        expect(rasi).toBeLessThanOrEqual(12);
      }
    }

    const ketu = chart.grahas.find((graha) => graha.id === "Ketu");
    const rahu = chart.grahas.find((graha) => graha.id === "Rahu");
    expect((rahu!.longitude + 180) % 360).toBeCloseTo(ketu!.longitude, 3);
  });

  it("skips the lagna when there is no birth place", () => {
    const chart = buildVedicChart(profile(false));
    expect(chart.input.hasPlace).toBe(false);
    expect(chart.lagna).toBeNull();
    expect(chart.vargas.every((varga) => varga.lagnaRashi === null)).toBe(true);
    expect(chart.grahas).toHaveLength(9);
  });

  it("serializes the positions and the varga matrix", () => {
    const chart = buildVedicChart(profile());
    const text = serializeVedicToStructuredText(chart);
    expect(text).toContain("吠陀占星");
    expect(text).toContain("D60");
    expect(text).toContain("罗睺");
    const payload = JSON.parse(serializeVedicToCompactJson(chart)) as { format: string; grahas: unknown[]; vargas: unknown[] };
    expect(payload.format).toBe("qmdj-vedic-v1");
    expect(payload.grahas).toHaveLength(9);
    expect(payload.vargas).toHaveLength(16);
  });

  it("stays deterministic for the same profile", () => {
    const first = buildVedicChart(profile());
    const second = buildVedicChart(profile());
    expect(second.grahas).toEqual(first.grahas);
    expect(julianDayForProfile("1990-05-20T08:30", "Asia/Shanghai")).toBeGreaterThan(2448000);
  });
});
