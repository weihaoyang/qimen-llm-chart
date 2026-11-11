import { afterEach, expect, it, vi } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { calculateChart, ephemeris } from "celestine";
import { buildVedicChart } from "./chart";

vi.mock("celestine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("celestine")>();
  return { ...actual, calculateChart: vi.fn(actual.calculateChart), ephemeris: { ...actual.ephemeris, getTrueNode: vi.fn(actual.ephemeris.getTrueNode) } };
});

afterEach(() => vi.restoreAllMocks());

it("does not fabricate a zero-degree planet when the ephemeris omits it", async () => {
  const actual = await vi.importActual<typeof import("celestine")>("celestine");
  vi.mocked(calculateChart).mockImplementationOnce((input) => {
    const chart = actual.calculateChart(input);
    return { ...chart, planets: chart.planets.filter((planet) => planet.name !== "Mars") };
  });
  const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "UTC"));
  expect(() => buildVedicChart(profile)).toThrow("星历缺少有效的火星位置或逆行状态");
});

it("does not silently substitute a mean node for an invalid true node", () => {
  vi.mocked(ephemeris.getTrueNode).mockReturnValueOnce({ northNode: Number.NaN, isRetrograde: true } as ReturnType<typeof ephemeris.getTrueNode>);
  const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "UTC"));
  expect(() => buildVedicChart(profile, { nodeMode: "true" })).toThrow("星历缺少有效的真交点位置或逆行状态");
});

it("accepts an actual zero-degree position", async () => {
  const actual = await vi.importActual<typeof import("celestine")>("celestine");
  vi.mocked(calculateChart).mockImplementationOnce((input) => {
    const chart = actual.calculateChart(input);
    return { ...chart, planets: chart.planets.map((planet) => planet.name === "Mars" ? { ...planet, longitude: 0 } : planet) };
  });
  const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "UTC"));
  expect(buildVedicChart(profile).grahas.find((planet) => planet.id === "Mars")?.longitude).toBeGreaterThan(330);
});
