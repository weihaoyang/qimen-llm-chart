import type { KlinePoint } from "@/lib/qimen/kline";

/**
 * Reading-layer helpers derived from miounet11/life-kline (Apache-2.0):
 * https://github.com/miounet11/life-kline/blob/main/components/LifeKLineChart.tsx
 *
 * We deliberately reuse only the presentation idea (moving averages, contiguous
 * DaYun bands, peak/trough annotation). The product's Bazi calculation remains
 * owned by this repository's taibu-core based, inspectable rule engine — see
 * `docs/research/open-source-agent-audit-2026-08-17.md`, which scoped this
 * upstream to "可视化/分区层" only.
 *
 * Everything here is pure and deterministic so the chart's geometry can be
 * asserted without a DOM: Recharts owns the painting, this module owns the
 * numbers being painted.
 */

export type LifeKlineBand = {
  label: string;
  startIndex: number;
  endIndex: number;
};

/** A DaYun band expressed in the chart's own x units rather than in indices. */
export type LifeKlineAxisBand = {
  label: string;
  x1: number;
  x2: number;
};

/**
 * Which quantity the x axis carries.
 *
 * `year` is the honest axis for the life series: every point is a calendar year
 * and the candles are a real life timeline. `index` is used by the relationship
 * series, whose points are Qimen charts on four different time scales and have
 * no single shared unit.
 */
export type KlineAxis = "year" | "index";

export type LifeKlineRow = {
  index: number;
  /** The numeric value handed to the chart's `XAxis`. */
  x: number;
  /** What that value should read as on a tick or in a tooltip. */
  xLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  score: number;
  /**
   * `[low, high]` — the range the candle's Bar is drawn over.
   *
   * The full high/low range, not the body range, because the custom shape
   * recovers its y scale from the rect Recharts hands it (see
   * `kline-geometry.ts`). A body-range rect would put the wick's endpoints at
   * the body's edges and quietly lose every shadow.
   */
  candleRange: [number, number];
  ma5: number | null;
  ma10: number | null;
  point: KlinePoint;
};

export type LifeKlineExtremes = {
  maxHigh: number;
  minLow: number;
  /** First row reaching `maxHigh`; `null` only when there are no rows. */
  peak: LifeKlineRow | null;
  trough: LifeKlineRow | null;
  /**
   * How many rows sit exactly on the global high / low.
   *
   * The upstream chart renders a star for *every* point whose value equals the
   * maximum, so a flat run of equal highs gets a row of stars. We render one
   * marker instead and report the tie count so the caller can say so out loud
   * rather than silently picking a winner.
   */
  peakTies: number;
  troughTies: number;
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

/** The calendar year a point stands for, or `null` if its datetime is unusable. */
export const klineYear = (point: KlinePoint): number | null => {
  const match = point.datetime.match(/^(\d{4})-/);
  return match ? Number(match[1]) : null;
};

const axisValueFor = (point: KlinePoint, index: number, axis: KlineAxis) => {
  if (axis === "index") return index;
  const year = klineYear(point);
  // A year-series point whose datetime cannot be parsed still has to land
  // somewhere. Using the index keeps the candle visible and keeps the row
  // ordering intact, rather than collapsing it onto year 0 or dropping it.
  return year ?? index;
};

/**
 * Build the rows the chart consumes.
 *
 * `maPeriods` is passed in rather than fixed so the mini relationship charts can
 * skip the averages they have no room for, while the full life chart keeps the
 * MA5/MA10 pair the upstream component draws.
 */
export const toLifeKlineRows = (
  points: readonly KlinePoint[],
  axis: KlineAxis,
  maPeriods: readonly [number, number] | null = [5, 10],
): LifeKlineRow[] => {
  const [shortPeriod, longPeriod] = maPeriods ?? [0, 0];
  const ma5 = maPeriods ? movingAverage(points, shortPeriod) : [];
  const ma10 = maPeriods ? movingAverage(points, longPeriod) : [];

  return points.map((point, index) => {
    const open = point.open;
    const close = point.close;
    return {
      index,
      x: axisValueFor(point, index, axis),
      xLabel: axis === "year" ? String(klineYear(point) ?? point.datetime.slice(0, 4)) : point.datetime.slice(5, 10),
      open,
      high: point.high,
      low: point.low,
      close,
      score: point.score,
      candleRange: [point.low, point.high],
      ma5: ma5[index] ?? null,
      ma10: ma10[index] ?? null,
      point,
    };
  });
};

export const lifeKlineExtremes = (rows: readonly LifeKlineRow[]): LifeKlineExtremes => {
  if (rows.length === 0) return { maxHigh: 0, minLow: 0, peak: null, trough: null, peakTies: 0, troughTies: 0 };

  const maxHigh = Math.max(...rows.map((row) => row.high));
  const minLow = Math.min(...rows.map((row) => row.low));
  return {
    maxHigh,
    minLow,
    peak: rows.find((row) => row.high === maxHigh) ?? null,
    trough: rows.find((row) => row.low === minLow) ?? null,
    peakTies: rows.filter((row) => row.high === maxHigh).length,
    troughTies: rows.filter((row) => row.low === minLow).length,
  };
};

/** DaYun bands in axis units, so they can be handed straight to `ReferenceArea`. */
export const toAxisBands = (rows: readonly LifeKlineRow[]): LifeKlineAxisBand[] =>
  groupLifeKlineBands(rows.map((row) => row.point)).map((band) => ({
    label: band.label,
    x1: rows[band.startIndex].x,
    x2: rows[band.endIndex].x,
  }));

/** The first row that belongs to each DaYun — where a divider line is drawn. */
export const dayunChangeRows = (rows: readonly LifeKlineRow[]): LifeKlineRow[] =>
  rows.filter((row, index) => index === 0 || dayunLabel(row.point) !== dayunLabel(rows[index - 1].point));

/**
 * The slice of the series the chart is currently showing.
 *
 * Recharts' Brush decides this internally, but the chart also needs it for
 * things the Brush does not know about: which bands and dividers are worth
 * rendering, whether "今" is on screen, and what "highest" means. Deriving all
 * of that from one explicit window keeps those answers consistent with what the
 * reader can actually see — a "全局最高" marker pinned to a year the brush has
 * zoomed away from is a marker nobody will ever see.
 */
export type KlineWindow = {
  startIndex: number;
  endIndex: number;
  rows: LifeKlineRow[];
  extremes: LifeKlineExtremes;
  bands: LifeKlineAxisBand[];
  dividers: LifeKlineRow[];
  today: LifeKlineRow | null;
};

/**
 * Years shown either side of today when the chart first opens.
 *
 * Exported because the panel and the chart must agree on it: the panel's default
 * selection has to land inside the window the chart opens on, or the stat block
 * and the detail card describe a year that is not on screen.
 */
export const DEFAULT_WINDOW_RADIUS = 10;

/** Where the window should open: `radius` years either side of today, else the first screenful. */
export const defaultWindow = (rows: readonly LifeKlineRow[], now: Date | null, radius = DEFAULT_WINDOW_RADIUS): { startIndex: number; endIndex: number } => {
  if (rows.length === 0) return { startIndex: 0, endIndex: 0 };
  const lastIndex = rows.length - 1;
  const anchor = now ? currentYearRow(rows, now) : null;
  // No row for today (a newborn's series starts at 起运, years from now). Opening
  // on a window of the same width is better than opening on one year.
  if (!anchor) return { startIndex: 0, endIndex: Math.min(lastIndex, radius * 2) };
  return {
    startIndex: Math.max(0, anchor.index - radius),
    endIndex: Math.min(lastIndex, anchor.index + radius),
  };
};

/**
 * Which row the panel should have selected before the visitor clicks anything.
 *
 * Today when the series covers it — "当前条件分" then means what it says — and
 * otherwise the first year of the window the chart opens on, so the stat block
 * and the detail card never describe a year the chart has scrolled past. The
 * caller keeps this as a fallback rather than seeding `useState`, because the
 * clock resolves after mount and the answer changes when it does.
 */
export const defaultSelectedIndex = (
  rows: readonly LifeKlineRow[],
  now: Date | null,
  radius = DEFAULT_WINDOW_RADIUS,
): number => {
  if (rows.length === 0) return 0;
  const anchor = now ? currentYearRow(rows, now) : null;
  return anchor?.index ?? defaultWindow(rows, now, radius).startIndex;
};

export const klineWindow = (
  rows: readonly LifeKlineRow[],
  startIndex: number,
  endIndex: number,
  now?: Date | null,
): KlineWindow => {
  const start = Math.max(0, Math.min(startIndex, Math.max(0, rows.length - 1)));
  const end = Math.max(start, Math.min(endIndex, rows.length - 1));
  const visible = rows.slice(start, end + 1);
  const x1 = visible[0]?.x ?? 0;
  const x2 = visible[visible.length - 1]?.x ?? 0;

  return {
    startIndex: start,
    endIndex: end,
    rows: visible,
    extremes: lifeKlineExtremes(visible),
    // A band that ends before the window or starts after it contributes nothing
    // once Recharts clips it, and passing it anyway is what made the axis stop
    // zooming in the first place (see the `ifOverflow` note in kline-chart.tsx).
    bands: toAxisBands(rows).filter((band) => band.x2 >= x1 && band.x1 <= x2),
    dividers: dayunChangeRows(rows).filter((row) => row.x >= x1 && row.x <= x2),
    today: now ? currentYearRow(visible, now) : null,
  };
};

/**
 * Where "today" sits on a year axis.
 *
 * Returns `null` when the series does not cover that year, so the marker simply
 * does not render instead of pinning itself to the nearest candle — a "今" line
 * on the wrong year would be a factual error, not a cosmetic one.
 */
export const currentYearRow = (rows: readonly LifeKlineRow[], now: Date): LifeKlineRow | null => {
  const year = now.getFullYear();
  return rows.find((row) => row.x === year) ?? null;
};

export type KlineHudModel = {
  title: string;
  dayun: string | null;
  up: boolean;
  change: number;
  changePercent: number;
  maRelation: "above" | "below" | null;
};

/**
 * The numbers the heads-up panel shows for one row.
 *
 * `changePercent` is guarded against a zero open: the life series starts its
 * first candle at the previous close (50), but a caller could hand us a series
 * whose open is 0, and `Infinity`/`NaN` in a percentage is worse than `0.0`.
 */
export const klineHudModel = (row: LifeKlineRow): KlineHudModel => {
  const change = row.close - row.open;
  return {
    title: row.point.label,
    dayun: row.point.evidence.find((entry) => entry.startsWith("大运 "))?.replace(/^大运\s+/, "").trim() ?? null,
    up: row.close >= row.open,
    change,
    changePercent: row.open > 0 ? Math.round((change / row.open) * 1000) / 10 : 0,
    maRelation: row.ma5 === null ? null : row.score > row.ma5 ? "above" : "below",
  };
};

/**
 * The window of rows the text table shows when it is collapsed.
 *
 * Upstream hard-codes `±5` around the current year. We keep the same span but
 * derive it from the caller's clock rather than `new Date()`, because this
 * repository renders on the server first and a `new Date()` read during render
 * is a hydration mismatch waiting to happen (see `src/lib/hydration-clock.ts`).
 */
export const recentYearWindow = (
  rows: readonly LifeKlineRow[],
  now: Date | null,
  radius = 5,
): { rows: LifeKlineRow[]; collapsed: boolean } => {
  if (rows.length === 0) return { rows: [], collapsed: false };
  // `radius` years either side of the current one, inclusive: 2 * radius + 1
  // rows. Upstream sliced `current - 5 … current + 5` half-open, which shows
  // five years before but only four after.
  const span = radius * 2 + 1;
  // Before the clock resolves there is no honest "current year" to centre on.
  // Showing the opening years is a visibly provisional default; centring on the
  // hydration-safe placeholder year would put the window on the wrong decade
  // without saying so.
  const current = now ? currentYearRow(rows, now) : null;
  if (!current) return { rows: rows.slice(0, span), collapsed: true };

  const start = Math.max(0, current.index - radius);
  const end = Math.min(rows.length, current.index + radius + 1);
  return { rows: rows.slice(start, end), collapsed: true };
};

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV body (no BOM) for the text table's export button. */
export const klineCsv = (rows: readonly LifeKlineRow[]): string => {
  const header = ["年份", "标签", "大运", "开盘", "最高", "最低", "收盘", "运势分", "方向"];
  const body = rows.map((row) => [
    row.xLabel,
    row.point.label,
    klineHudModel(row).dayun ?? "",
    row.open,
    row.high,
    row.low,
    row.close,
    row.score,
    row.close >= row.open ? "上涨" : "下跌",
  ].map(csvCell).join(","));
  return [header.join(","), ...body].join("\n");
};
