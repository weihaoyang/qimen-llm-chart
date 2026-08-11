import { describe, expect, it } from "vitest";
import { buildQimenKline } from "./kline";
import type { ChartSequenceItem } from "./sequence";

const chart = (overrides: Record<string, unknown> = {}) => ({
  engine: "3meta",
  input: { datetime: "2026-08-01T10:00", timeZone: "Asia/Shanghai" },
  interpretedDateTime: "2026-08-01T10:00",
  hiddenStemsByPalace: {},
  palaceMap: {},
  raw: {
    timeInfo: { solarTerm: "大暑" },
    palaces: [
      { position: 1, trigram: "坎", gate: "生门", deity: "六合", isZhiFu: true, isZhiShi: false, isPostHorse: false, voidness: { hasVoidness: false }, gatePressure: "无", status: { gate: "旺", star: "相" } },
      { position: 2, trigram: "坤", gate: "死门", deity: "白虎", isZhiFu: false, isZhiShi: true, isPostHorse: true, voidness: { hasVoidness: true }, gatePressure: "门迫", status: { gate: "囚", star: "死" } },
    ],
    ...overrides,
  },
}) as unknown as ChartSequenceItem["chart"];

describe("buildQimenKline", () => {
  it("is deterministic and preserves evidence/prediction for every sequence point", () => {
    const sequence = [0, 1, 2].map((index) => ({ index, input: { datetime: `2026-08-0${index + 1}T10:00`, timeZone: "Asia/Shanghai" }, chart: chart() })) as ChartSequenceItem[];
    const first = buildQimenKline(sequence, "life");
    const second = buildQimenKline(sequence, "life");
    expect(first).toEqual(second);
    expect(first.points).toHaveLength(3);
    expect(first.points.every((point) => point.evidence.length > 0 && point.prediction.length > 0)).toBe(true);
    first.points.forEach((point, index) => {
      expect(point.low).toBeLessThanOrEqual(Math.min(point.open, point.close));
      expect(point.high).toBeGreaterThanOrEqual(Math.max(point.open, point.close));
      expect(point.low).toBeGreaterThanOrEqual(0);
      expect(point.high).toBeLessThanOrEqual(100);
      expect(point.open).toBe(index === 0 ? 50 : first.points[index - 1].close);
    });
  });

  it("requires at least two charts", () => {
    expect(buildQimenKline([], "relationship").points).toEqual([]);
  });
});
