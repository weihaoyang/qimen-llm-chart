import { describe, expect, it } from "vitest";
import { calculateChart } from "celestine";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildAstroChart, offsetMinutes } from "./chart";
import { serializeAstroToCompactJson, serializeAstroToStructuredText } from "./serializer";

describe("astro chart", () => {
  it.each([
    [66, "Placidus"],
    [66.1, "Placidus"],
    [66.56, "Placidus"],
    [66.57, "Porphyry"],
    [-70, "Porphyry"],
    [89.95, "Whole Sign"],
  ])("reports the computed house system at latitude %s", (latitude, system) => {
    const input = getDefaultProfileInput(new Date("2000-01-01T12:00:00Z"), "UTC");
    input.location = { city: "Test", timeZone: "UTC", latitude, longitude: 0 };
    const chart = buildAstroChart(normalizeProfileInput(input));
    expect(chart.houseSystem).toBe(system);
    expect(chart.houses).toHaveLength(12);
  });

  it.each([
    [66.1, "Placidus", [88.523588, 92.142847, 95.510865, 99.611088, 106.117945, 122.588073, 268.523588, 272.142847, 275.510865, 279.611088, 286.117945, 302.588073]],
    [66.55, "Placidus", [94.629786, 95.647858, 97.146870, 99.611088, 104.503226, 119.328594, 274.629786, 275.647858, 277.146870, 279.611088, 284.503226, 299.328594]],
    [-66.1, "Placidus", [5.758360, 26.414451, 55.585422, 99.611088, 140.201903, 167.140250, 185.758360, 206.414451, 235.585422, 279.611088, 320.201903, 347.140250]],
    [66.57, "Porphyry", [94.904862, 96.473604, 98.042346, 99.611088, 158.042346, 216.473604, 274.904862, 276.473604, 278.042346, 279.611088, 338.042346, 36.473604]],
  ] as const)("uses the date-specific Placidus polar limit at latitude %s", (latitude, system, expected) => {
    const input = getDefaultProfileInput(new Date("2000-01-01T12:00:00Z"), "UTC");
    input.location = { timeZone: "UTC", latitude, longitude: 0 };
    const chart = buildAstroChart(normalizeProfileInput(input));
    expect(chart.houseSystem).toBe(system);
    chart.houses.forEach((house, i) => {
      expect(Math.abs(((house.longitude - expected[i] + 540) % 360) - 180)).toBeLessThan(0.04);
    });
  });

  it("labels a Placidus convergence failure as Porphyry", () => {
    const input = getDefaultProfileInput(new Date("2000-01-01T00:00:00Z"), "UTC");
    input.location = { timeZone: "UTC", latitude: 66.5607088, longitude: 0 };
    const chart = buildAstroChart(normalizeProfileInput(input));
    expect(chart.houseSystem).toBe("Porphyry");
    expect(chart.houses).toHaveLength(12);
    expect(chart.houses.every(house => Number.isFinite(house.longitude))).toBe(true);
  });

  it.each([
    [31.2304, 121.4737, [138.948703, 163.288770, 191.934360, 224.391800, 257.924749, 289.754747, 318.948703, 343.288770, 11.934360, 44.391800, 77.924749, 109.754747]],
    [70, 0, [316.394811, 4.133570, 51.872329, 99.611088, 111.872329, 124.133570, 136.394811, 184.133570, 231.872329, 279.611088, 291.872329, 304.133570]],
    [89.95, 0, [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300]],
  ] as const)("matches Swiss Ephemeris house cusps at latitude %s", (latitude, longitude, cusps) => {
    const input = getDefaultProfileInput(new Date("2000-01-01T12:00:00Z"), "UTC");
    input.location = { city: "Test", timeZone: "UTC", latitude, longitude };
    const chart = buildAstroChart(normalizeProfileInput(input));
    expect(chart.houses).toHaveLength(cusps.length);
    chart.houses.forEach((cusp, index) => {
      expect(Math.abs(cusp.longitude - cusps[index]), `cusp ${cusp.house}`).toBeLessThan(0.02);
    });
  });

  it.each([
    ["2000-01-01T12:00:00Z", 60, 0, "Placidus", [40.390859, 71.994842, 86.918494, 99.611088, 114.451658, 139.768619, 220.390859, 251.994842, 266.918494, 279.611088, 294.451658, 319.768619]],
    ["1980-06-01T12:00:00Z", -70, 0, "Porphyry", [235.914581, 241.159138, 246.403694, 251.648251, 306.403694, 1.159138, 55.914581, 61.159138, 66.403694, 71.648251, 126.403694, 181.159138]],
    ["2050-01-01T12:00:00Z", 70, 0, "Porphyry", [314.448471, 3.108312, 51.768152, 100.427992, 111.768152, 123.108312, 134.448471, 183.108312, 231.768152, 280.427992, 291.768152, 303.108312]],
    ["2050-10-01T12:00:00Z", -89.95, 121.47, "Whole Sign", [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]],
  ] as const)("compares all twelve house cusps against Swiss at %s, %s, %s", (at, latitude, longitude, system, expected) => {
    const input = getDefaultProfileInput(new Date(at), "UTC");
    input.location = { timeZone: "UTC", latitude, longitude };
    const chart = buildAstroChart(normalizeProfileInput(input));
    expect(chart.houseSystem).toBe(system);
    expect(chart.houses).toHaveLength(12);
    chart.houses.forEach((house, i) => {
      const difference = Math.abs(((house.longitude - expected[i] + 540) % 360) - 180);
      expect(difference, `cusp ${i + 1}`).toBeLessThan(0.02);
    });
  });

  it.each([
    ["2000-01-01T12:00:00Z", "夜"],
    ["2000-06-21T00:00:00Z", "昼"],
  ])("determines polar sect from the horizon at %s", (date, sect) => {
    const input = getDefaultProfileInput(new Date(date), "UTC");
    input.location = { city: "Test", timeZone: "UTC", latitude: 70, longitude: 0 };
    const chart = buildAstroChart(normalizeProfileInput(input));
    expect(chart.angles.ascendant.longitude).toBe(chart.houses[0].longitude);
    expect(chart.lots.length).toBeGreaterThan(0);
    expect(chart.lots.every((lot) => lot.sect === sect)).toBe(true);
  });

  it.each([90, -90])("retains the geocentric chart at the exact pole %s", (latitude) => {
    const input = getDefaultProfileInput(new Date("2000-01-01T12:00:00Z"), "UTC");
    input.location = { city: "Test", timeZone: "UTC", latitude, longitude: 0 };
    const chart = buildAstroChart(normalizeProfileInput(input));
    expect(chart.input.latitude).toBe(latitude);
    expect(chart.sun.longitude).toEqual(expect.any(Number));
    expect(chart.angles.ascendant.longitude).toBeNull();
    expect(chart.houses).toEqual([]);
    expect(chart.lots).toEqual([]);
    expect(chart.houseSystem).toContain("地理极点");
  });

  it("evaluates the historical Moon in terrestrial time", () => {
    const input = getDefaultProfileInput(new Date("1600-01-01T12:00:00Z"), "UTC");
    const { moon } = buildAstroChart(normalizeProfileInput(input));
    expect(Math.abs((moon.longitude ?? 0) - 111.380261)).toBeLessThan(0.005);
  });

  it("interprets historical ISO input in the proleptic Gregorian calendar", () => {
    const input = getDefaultProfileInput(new Date("1500-01-01T12:00:00Z"), "UTC");
    const { moon } = buildAstroChart(normalizeProfileInput(input));
    expect(Math.abs((moon.longitude ?? 0) - 164.782962)).toBeLessThan(0.02);
  });
  it("places Pluto in the ecliptic of date before computing chart geometry", () => {
    // JD 2460000 UT; Swiss Ephemeris/Moshier apparent geocentric longitude.
    const input = getDefaultProfileInput(new Date("2023-02-24T12:00:00Z"), "UTC");
    const chart = buildAstroChart(normalizeProfileInput(input));
    const pluto = chart.points.find(({ name }) => name === "冥王");
    expect(Math.abs((pluto?.longitude ?? 0) - 299.373319)).toBeLessThan(0.01);
  });
  it("is deterministic and exposes the three core points", () => {
    const input = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const profile = normalizeProfileInput(input);
    const first = buildAstroChart(profile);
    expect(buildAstroChart(profile)).toEqual(first);
    expect(first.sun.sign).toBeTruthy();
    expect(first.complete).toBe(true);
    expect(first.points).toHaveLength(18); // 10 行星 + 5 小行星/凯龙 + 2 交点 + 莉莉丝
    expect(first.lots.map((lot) => lot.key)).toEqual(["fortune", "spirit"]);
    expect(first.lots.map((lot) => lot.name)).toEqual(["福点", "精神点"]);
    for (const lot of first.lots) {
      expect(lot.longitude).toBeGreaterThanOrEqual(0);
      expect(lot.longitude).toBeLessThan(360);
      expect(["昼", "夜"]).toContain(lot.sect);
      expect(lot.formula).toBeTruthy();
      expect(lot.house).toBeGreaterThanOrEqual(1);
    }
    expect(first.angles.midheaven.longitude).not.toBeNull();
    expect(first.houses).toHaveLength(12);
    expect(first.aspects).toEqual(expect.any(Array));
    expect(first.aspectSummary).toEqual(expect.any(Object));
    expect(first.patterns).toEqual(expect.any(Array));
    expect(first.sun.longitude).toBeGreaterThan(279);
    expect(first.sun.longitude).toBeLessThan(281);
    expect(first.moon.house).toBeGreaterThanOrEqual(1);
    expect(serializeAstroToStructuredText(first)).toContain("上升");
    expect(serializeAstroToStructuredText(first)).toContain("阿拉伯点");
    expect(serializeAstroToStructuredText(first)).toContain("福点");
    expect(JSON.parse(serializeAstroToCompactJson(first)).format).toBe("qmdj-astro-chart-v1");
  });

  it("switches the Arab lot formulas by sect (celestine's day/night rule)", () => {
    const located = (iso: string) => {
      const input = getDefaultProfileInput(new Date(iso), "Asia/Shanghai");
      input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
      return buildAstroChart(normalizeProfileInput(input));
    };
    const day = located("1990-05-12T14:30:00+08:00");
    const night = located("1990-05-12T02:30:00+08:00");

    expect(day.lots).toHaveLength(2);
    expect(day.lots[0].sect).toBe("昼");
    expect(day.lots[0].formula).toBe("ASC + Moon - Sun");
    expect(day.lots[1].formula).toBe("ASC + Sun - Moon");
    expect(night.lots[0].sect).toBe("夜");
    expect(night.lots[0].formula).toBe("ASC + Sun - Moon");
    // 福点与精神点互为反式：按昼夜各用一套公式，与 celestine 的输出一致。
    const mod = (value: number) => ((value % 360) + 360) % 360;
    for (const chart of [day, night]) {
      const ascLon = chart.ascendant.longitude as number;
      const sun = chart.sun.longitude as number;
      const moon = chart.moon.longitude as number;
      const isDay = chart.lots[0].sect === "昼";
      expect(chart.lots[0].longitude).toBeCloseTo(isDay ? mod(ascLon + moon - sun) : mod(ascLon + sun - moon), 4);
      expect(chart.lots[1].longitude).toBeCloseTo(isDay ? mod(ascLon + sun - moon) : mod(ascLon + moon - sun), 4);
    }
  });

  it("computes planets without a birth place but leaves the angles open", () => {
    const input = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    delete input.location;
    const profile = normalizeProfileInput(input);
    const chart = buildAstroChart(profile);

    // Planets and aspects are geocentric, so they still resolve.
    expect(chart.complete).toBe(false);
    expect(chart.points).toHaveLength(18);
    expect(chart.sun.longitude).toBeGreaterThan(279);
    expect(chart.sun.longitude).toBeLessThan(281);
    expect(chart.sun.house).toBeNull();
    expect(chart.aspects.length).toBeGreaterThan(0);

    // Place-dependent parts stay absent.
    expect(chart.ascendant.longitude).toBeNull();
    expect(chart.angles.midheaven.longitude).toBeNull();
    expect(chart.houses).toHaveLength(0);
    expect(chart.lots).toHaveLength(0); // 阿拉伯点依赖上升点，故一并缺席

    // Located and unlocated charts agree on the planets.
    const locatedInput = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    locatedInput.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const located = buildAstroChart(normalizeProfileInput(locatedInput));
    expect(chart.points.map((point) => point.longitude)).toEqual(located.points.map((point) => point.longitude));

    const text = serializeAstroToStructuredText(chart);
    expect(text).toContain("宫位未计算");
    expect(text).toContain("行星与相位按地心坐标计算");
  });
});

it("uses the civil offset on the correct side of a DST transition", () => {
  expect(offsetMinutes("2024-03-10T01:59", "America/New_York")).toBe(-300);
  expect(() => offsetMinutes("2024-03-10T02:30", "America/New_York")).toThrow();
  expect(offsetMinutes("2024-03-10T03:00", "America/New_York")).toBe(-240);
});
it("keeps the astronomical chart fixed when switching the traditional clock", () => {
  const input = getDefaultProfileInput(new Date("2024-02-09T16:15:00Z"), "Asia/Shanghai");
  input.location = { longitude: 105, latitude: 30 };
  const civil = normalizeProfileInput(input);
  const apparent = normalizeProfileInput({ ...input, timeBasis: "true-solar" });
  expect(apparent.normalized.datetime).not.toBe(civil.normalized.datetime);
  expect(buildAstroChart(apparent)).toEqual(buildAstroChart(civil));
});

it("keeps the same astronomical instant when the traditional clock is true solar", () => {
  const input = getDefaultProfileInput(new Date("2024-03-10T04:30:00Z"), "Asia/Shanghai");
  input.location = { city: "乌鲁木齐", timeZone: "Asia/Shanghai", latitude: 43.83, longitude: 87.62 };
  const civil = normalizeProfileInput(input);
  const solar = normalizeProfileInput({ ...input, timeBasis: "true-solar" });

  expect(solar.normalized.datetime).not.toBe(civil.normalized.datetime);
  expect(buildAstroChart(solar)).toEqual(buildAstroChart(civil));
});

it("preserves seconds in civil birth inputs", () => {
  const input = getDefaultProfileInput(new Date("2026-03-03T12:01:00Z"), "UTC");
  const moon = (seconds: string) => {
    const result = buildAstroChart(normalizeProfileInput({ ...input, datetime: `2026-03-03T12:01:${seconds}` }));
    return result.moon.longitude!;
  };
  expect(moon("59") - moon("00")).toBeGreaterThan(0.005);
  const datetime = "2026-03-03T12:01:59";
  const apparentSolar = normalizeProfileInput({
    ...input,
    datetime,
    timeBasis: "true-solar",
    location: { city: "London", timeZone: "UTC", latitude: 51.5, longitude: 0 },
  });
  expect(buildAstroChart(apparentSolar).moon.longitude).toBe(moon("59"));

});

it("keeps a late Pisces Sun below 30 degrees within its actual sign", () => {
  const input = getDefaultProfileInput(new Date("2026-03-20T14:36:05Z"), "UTC");
  const chart = buildAstroChart(normalizeProfileInput({ ...input, datetime: "2026-03-20T14:36:05" }));
  expect(chart.sun.sign).toBe("双鱼");
  expect(chart.sun.degree).toBe(29.99);
});


it("preserves the computed longitude at an ascendant sign boundary", () => {
  const rawAt = (longitude: number) => calculateChart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0, timezone: 0, latitude: 0, longitude }).angles.ascendant.longitude;
  let interval: [number, number] | undefined;
  for (let longitude = -180; longitude < 180; longitude++) {
    if (rawAt(longitude) < 180 && rawAt(longitude + 1) >= 180 && rawAt(longitude + 1) < 181.5) {
      interval = [longitude, longitude + 1];
      break;
    }
  }
  expect(interval).toBeDefined();
  let [left, right] = interval!;
  for (let i = 0; i < 45; i++) {
    const middle = (left + right) / 2;
    if (rawAt(middle) < 179.9999998) left = middle;
    else right = middle;
  }
  const longitude = (left + right) / 2;
  const raw = rawAt(longitude);
  expect(raw).toBeLessThan(180);
  expect(Number(raw.toFixed(6))).toBe(180); // old export crossed the boundary
  const input = getDefaultProfileInput(new Date("2000-01-01T12:00:00Z"), "UTC");
  input.location = { city: "Boundary", timeZone: "UTC", latitude: 0, longitude };
  const chart = buildAstroChart(normalizeProfileInput(input));
  expect(chart.ascendant.sign).toBe("处女");
  expect(chart.ascendant.longitude).toBe(raw);
  expect(chart.ascendant.longitude).toBeLessThan(180);
  const engine = calculateChart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0, timezone: 0, latitude: 0, longitude });
  expect(chart.sun.longitude).toBe(engine.planets.find((planet) => planet.name === "Sun")!.longitude);
  expect(chart.houses.map((house) => house.longitude)).toEqual(engine.houses.cusps.map((cusp) => cusp.longitude));
  for (const lot of chart.lots) expect(lot.longitude).toBe(engine.lots.find((item) => item.name === lot.latin)!.longitude);
  expect(JSON.parse(serializeAstroToCompactJson(chart)).ascendant.longitude).toBe(raw);
});
