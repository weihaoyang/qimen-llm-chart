import { afterEach, expect, it, vi } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildAstroChart } from "@/lib/astro/chart";
import { buildQizhengChart } from "./chart";
import { serializeQizhengToStructuredText, serializeQizhengToCompactJson } from "./serializer";

vi.mock("@/lib/astro/chart", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/astro/chart")>();
  return { ...actual, buildAstroChart: vi.fn(actual.buildAstroChart) };
});

afterEach(() => vi.restoreAllMocks());

it("does not invent the sun palace when its ephemeris is missing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/astro/chart")>("@/lib/astro/chart");
  vi.mocked(buildAstroChart).mockImplementationOnce((input) => {
    const chart = actual.buildAstroChart(input);
    return { ...chart, points: chart.points.filter((point) => point.name !== "太阳") };
  });
  const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "UTC"));
  expect(() => buildQizhengChart(profile)).toThrow("星历缺少有效的太阳位置");
});


it.each([null, Number.NaN])("marks non-solar missing longitude %s as a partial chart", async (invalid) => {
  const actual = await vi.importActual<typeof import("@/lib/astro/chart")>("@/lib/astro/chart");
  vi.mocked(buildAstroChart).mockImplementationOnce((input) => {
    const chart = actual.buildAstroChart(input);
    return { ...chart, points: chart.points.map((point) => point.name === "火星" ? { ...point, longitude: invalid } : point) };
  });
  const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "UTC"));
  const chart = buildQizhengChart(profile);
  expect(chart.complete).toBe(false);
  expect(chart.missingStars).toEqual(["火星"]);
  expect(chart.stars.some((star) => star.name === "火星")).toBe(false);
  expect(chart.stars).toHaveLength(10);
  expect(serializeQizhengToStructuredText(chart)).toContain("部分排盘（缺少：火星）");
  expect(JSON.parse(serializeQizhengToCompactJson(chart)).missingStars).toEqual(["火星"]);
});
