import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { ayanamsa, deltaSeconds, jdToJDE, meanNodeLongitude, nodeLongitude, trueNodeLongitude } from "./ayanamsa";
import { formatRashiDegree } from "./format";
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
  it("anchors J2000 to the mean Lahiri equinox", () => {
    expect(ayanamsa(2451545)).toBeCloseTo(23.8570923254552, 6);
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

  it("matches independent osculating node reference longitudes", () => {
    const jde = jdToJDE(2451545);
    const mean = meanNodeLongitude(jde);
    const trueNode = trueNodeLongitude(jde);
    // Swiss Ephemeris 2.10.3.2, Moshier, apparent geocentric true node.
    expect(Math.abs(trueNode - 123.952895)).toBeLessThan(0.01);
    expect(Math.abs(trueNodeLongitude(jdToJDE(2460004)) - 35.862212)).toBeLessThan(0.01);
    expect(Math.abs(trueNodeLongitude(jdToJDE(2460096)) - 33.616889)).toBeLessThan(0.01);
    // nodeLongitude 默认平交点，可切真交点。
    expect(nodeLongitude(jde)).toBeCloseTo(mean, 9);
    expect(nodeLongitude(jde, "true")).toBeCloseTo(trueNode, 9);
  });
});

describe("nakshatra and rashi placement", () => {
  it("assigns all 108 pada boundaries to the new interval", () => {
    for (let quarter = 0; quarter < 108; quarter += 1) {
      const degrees = (quarter * 360) / 108;
      const previous = (quarter + 107) % 108;
      expect(nakshatraOf(degrees)).toMatchObject({ index: Math.floor(quarter / 4) + 1, pada: quarter % 4 + 1 });
      expect(nakshatraOf(degrees - 1e-10)).toMatchObject({ index: Math.floor(previous / 4) + 1, pada: previous % 4 + 1 });
    }
    expect(nakshatraOf(360)).toEqual(nakshatraOf(0));
  });

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
      ["D60", 2, 0, 2],
      ["D60", 10, 13 + 25 / 60, 12],
    ];
    for (const [code, rashi, degree, expected] of cases) {
      expect([code, rashi, degree, vargaSign(rashi, degree, code)]).toEqual([code, rashi, degree, expected]);
    }
  });

  it("returns the same sign for unknown codes", () => {
    expect(vargaSign(5, 12, "D99")).toBe(5);
  });

  it("assigns the exact 23°20′ boundary to the next division", () => {
    const boundary = 23 + 20 / 60;
    expect(vargaSign(1, boundary - 1e-8, "D9")).toBe(7);
    expect(vargaSign(1, boundary, "D9")).toBe(8);
    expect(vargaSign(1, boundary - 1e-8, "D27")).toBe(9);
    expect(vargaSign(1, boundary, "D27")).toBe(10);
  });
});

describe("vedic chart", () => {
  it("distinguishes a brief direct true node from the retrograde mean node", () => {
    const input = getDefaultProfileInput(new Date("2023-05-31T12:00:00Z"), "UTC");
    const { nodes } = buildVedicChart(normalizeProfileInput(input));
    expect(nodes.true.rahu.retrograde).toBe(false);
    expect(nodes.true.ketu.retrograde).toBe(false);
    expect(nodes.mean.rahu.retrograde).toBe(true);
    expect(nodes.mean.ketu.retrograde).toBe(true);
  });
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

  it("exposes both node modes and lets the caller pick one", () => {
    const meanChart = buildVedicChart(profile());
    expect(meanChart.nodeMode).toBe("mean");
    const rahuMean = meanChart.grahas.find((graha) => graha.id === "Rahu")!;
    expect(rahuMean.longitude).toBeCloseTo(meanChart.nodes.mean.rahu.longitude, 9);
    expect((meanChart.nodes.true.rahu.longitude + 180) % 360).toBeCloseTo(meanChart.nodes.true.ketu.longitude, 6);
    expect(meanChart.nodes.true.rahu.longitude).not.toBeCloseTo(rahuMean.longitude, 3);

    const trueChart = buildVedicChart(profile(), { nodeMode: "true" });
    expect(trueChart.nodeMode).toBe("true");
    expect(trueChart.grahas.find((graha) => graha.id === "Rahu")!.longitude).toBeCloseTo(trueChart.nodes.true.rahu.longitude, 9);
    // 其余行星不受口径影响。
    expect(trueChart.grahas.filter((graha) => graha.id !== "Rahu" && graha.id !== "Ketu")).toEqual(meanChart.grahas.filter((graha) => graha.id !== "Rahu" && graha.id !== "Ketu"));
  });

  it("skips the lagna when there is no birth place", () => {
    const chart = buildVedicChart(profile(false));
    expect(chart.input.hasPlace).toBe(false);
    expect(chart.lagna).toBeNull();
    expect(chart.vargas.every((varga) => varga.lagnaRashi === null)).toBe(true);
    expect(chart.grahas).toHaveLength(9);
  });

  it.each([90, -90])("omits undefined ascendant at geographic pole %s while preserving grahas", (latitude) => {
    const input = getDefaultProfileInput(new Date("2000-01-01T12:00:00Z"), "UTC");
    input.location = { city: "Pole", timeZone: "UTC", latitude, longitude: 45 };
    const chart = buildVedicChart(normalizeProfileInput(input));
    expect(chart.input.locationIssue).toBe("pole");
    expect(chart.lagna).toBeNull();
    expect(chart.vargas.every((varga) => varga.lagnaRashi === null)).toBe(true);
    expect(chart.grahas).toHaveLength(9);
    expect(serializeVedicToStructuredText(chart)).toContain("未计算（地理极点）");
    expect(JSON.parse(serializeVedicToCompactJson(chart)).input.locationIssue).toBe("pole");
    const ordinary = getDefaultProfileInput(new Date("2000-01-01T12:00:00Z"), "UTC");
    expect(chart.grahas).toEqual(buildVedicChart(normalizeProfileInput(ordinary)).grahas);
  });

  it("serializes the positions and the varga matrix", () => {
    const chart = buildVedicChart(profile());
    const text = serializeVedicToStructuredText(chart);
    expect(text).toContain("吠陀占星");
    expect(text).toContain("D60");
    expect(text).toContain("罗睺");
    const payload = JSON.parse(serializeVedicToCompactJson(chart)) as { format: string; grahas: unknown[]; vargas: unknown[]; nodeMode: string; nodeLongitudes: { mean: number; true: number } };
    expect(payload.format).toBe("qmdj-vedic-v1");
    expect(payload.nodeMode).toBe("mean");
    expect(payload.nodeLongitudes.true).not.toBeCloseTo(payload.nodeLongitudes.mean, 3);
    expect(text).toContain("平交点（Mean Node）");
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

it("uses the published Espenak–Meeus historical Delta T segments", () => {
  const year = (y: number) => 2451545 + (y - 2000) * 365.25;
  expect(deltaSeconds(year(1700))).toBeCloseTo(8.83, 2);
  expect(deltaSeconds(year(1800))).toBeCloseTo(13.72, 2);
  expect(deltaSeconds(year(1860))).toBeCloseTo(7.62, 2);
  expect(deltaSeconds(year(1960))).toBeCloseTo(33.103, 3);
});
it('retains the historical year in the Julian day conversion', () => {
  expect(julianDayForProfile('0099-01-01T00:00', 'UTC')).toBe(1757219.5);
});

it("matches the BPHS chapter 6 D30, D40 and D45 assignments", () => {
  // D30 reverses both the lord order and the widths for an even sign.
  expect([0, 5, 10, 18, 25].map((degree) => vargaSign(1, degree, "D30"))).toEqual([1, 11, 9, 3, 7]);
  expect([0, 5, 12, 20, 25].map((degree) => vargaSign(2, degree, "D30"))).toEqual([2, 6, 12, 10, 8]);
  expect([1, 2].map((sign) => vargaSign(sign, 0.75, "D40"))).toEqual([2, 8]);
  expect([1, 2, 3].map((sign) => vargaSign(sign, 2 / 3, "D45"))).toEqual([2, 6, 10]);
});

it("keeps D24 sign progression distinct from the reversed even-sign deity list", () => {
  expect([0, 1.25, 15].map((degree) => vargaSign(1, degree, "D24"))).toEqual([5, 6, 5]);
  expect([0, 1.25, 15].map((degree) => vargaSign(2, degree, "D24"))).toEqual([4, 5, 4]);
});

it("distinguishes the D16 and D20 modality starts in BPHS chapter 6", () => {
  const signs = [1, 2, 3]; // Movable, fixed, dual.
  expect(signs.map((sign) => vargaSign(sign, 0, "D16"))).toEqual([1, 5, 9]);
  expect(signs.map((sign) => vargaSign(sign, 1.875, "D16"))).toEqual([2, 6, 10]);
  expect(signs.map((sign) => vargaSign(sign, 0, "D20"))).toEqual([1, 9, 5]);
  expect(signs.map((sign) => vargaSign(sign, 1.5, "D20"))).toEqual([2, 10, 6]);
});

it("matches the lower divisions in BPHS chapter 6", () => {
  const cases = [
    ["D1", 2, 15, 2],
    ["D2", 1, 14.99, 5], ["D2", 1, 15, 4], ["D2", 2, 15, 5],
    ["D3", 2, 10, 6], ["D3", 2, 20, 10],
    ["D4", 2, 7.5, 5], ["D4", 2, 22.5, 11],
    ["D7", 1, 30 / 7, 2], ["D7", 2, 30 / 7, 9],
    ["D9", 1, 0, 1], ["D9", 2, 0, 10], ["D9", 3, 0, 7],
    ["D10", 1, 3, 2], ["D10", 2, 3, 11],
    ["D12", 2, 2.5, 3], ["D12", 2, 27.5, 1],
  ] as const;
  for (const [code, sign, degrees, expected] of cases) {
    expect(vargaSign(sign, degrees, code), `${code} ${sign} ${degrees}`).toBe(expected);
  }
});

it("preserves seconds in civil birth inputs", () => {
  const input = getDefaultProfileInput(new Date("2026-03-03T12:01:00Z"), "UTC");
  const moon = (seconds: string) => {
    const result = buildVedicChart(normalizeProfileInput({ ...input, datetime: `2026-03-03T12:01:${seconds}` }));
    return result.grahas.find((graha) => graha.id === "Moon")!.longitude!;
  };
  expect(moon("59") - moon("00")).toBeGreaterThan(0.005);
});


it("exports full precision and keeps displayed degrees inside their sign", () => {
  expect(formatRashiDegree(29.99999)).toBe("29°59′");
  expect(formatRashiDegree(12.999)).toBe("13°00′");
  let example: ReturnType<typeof buildVedicChart> | undefined;
  for (let hour = 0; hour < 366 * 24 && !example; hour++) {
    const date = new Date(Date.UTC(2026, 0, 1, hour));
    const chart = buildVedicChart(normalizeProfileInput(getDefaultProfileInput(date, "UTC")));
    if (chart.grahas.some((graha) => graha.degreeInRashi >= 29 + 59.5 / 60)) example = chart;
  }
  expect(example).toBeDefined();
  const chart = example!;
  const crossing = chart.grahas.find((graha) => graha.degreeInRashi >= 29 + 59.5 / 60)!;
  expect(formatRashiDegree(crossing.degreeInRashi)).toBe("29°59′");
  const json = JSON.parse(serializeVedicToCompactJson(chart));
  const row = json.grahas.find((item: [string, ...unknown[]]) => item[0] === crossing.id);
  expect(row[1]).toBe(crossing.longitude);
  expect(row[3]).toBe(crossing.degreeInRashi);
  expect(rashiOf(row[1]).rasi).toBe(row[2]);
  expect(nakshatraOf(row[1]).index).toBe(row[4]);
  expect(nakshatraOf(row[1]).pada).toBe(row[5]);
  expect(json.nodeLongitudes.mean).toBe(chart.nodes.mean.rahu.longitude);
  expect(serializeVedicToStructuredText(chart)).toContain(`${crossing.rashi.zh}29°59′`);
});
