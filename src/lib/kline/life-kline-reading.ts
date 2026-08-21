import type { KlinePoint } from "@/lib/qimen/kline";

/**
 * Reading-layer helpers derived from miounet11/life-kline (Apache-2.0):
 * https://github.com/miounet11/life-kline/blob/main/components/LifeKLineChart.tsx
 *
 * We deliberately reuse only the presentation idea (moving averages and
 * contiguous DaYun bands). The product's Bazi calculation remains owned by
 * this repository's taibu-core based, inspectable rule engine.
 */

export type LifeKlineBand = {
  label: string;
  startIndex: number;
  endIndex: number;
};

export const movingAverage = (points: readonly KlinePoint[], period: number): Array<number | null> =>
  points.map((_, index) => {
    if (period < 1 || index < period - 1) return null;
    const window = points.slice(index - period + 1, index + 1);
    return Math.round((window.reduce((sum, point) => sum + point.close, 0) / period) * 10) / 10;
  });

const dayunLabel = (point: KlinePoint) =>
  point.evidence.find((entry) => entry.startsWith("大运 "))?.replace(/^大运\s+/, "").trim() || "未标注大运";

export const groupLifeKlineBands = (points: readonly KlinePoint[]): LifeKlineBand[] => {
  if (points.length === 0) return [];

  const bands: LifeKlineBand[] = [];
  let label = dayunLabel(points[0]);
  let startIndex = 0;

  for (let index = 1; index <= points.length; index += 1) {
    const nextLabel = index < points.length ? dayunLabel(points[index]) : "";
    if (index !== points.length && nextLabel === label) continue;
    bands.push({ label, startIndex, endIndex: index - 1 });
    label = nextLabel;
    startIndex = index;
  }

  return bands;
};
