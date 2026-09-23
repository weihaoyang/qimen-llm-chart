import { describe, expect, it } from "vitest";
import {
  currentYearRow,
  dayunChangeRows,
  DEFAULT_WINDOW_RADIUS,
  defaultSelectedIndex,
  defaultWindow,
  groupLifeKlineBands,
  klineCsv,
  klineHudModel,
  klineYear,
  lifeKlineExtremes,
  movingAverage,
  recentYearWindow,
  toAxisBands,
  toLifeKlineRows,
} from "./life-kline-reading";
import type { KlinePoint } from "@/lib/qimen/kline";

const point = (close: number, evidence: string[]): KlinePoint => ({
  index: close,
  datetime: "2026-01-01T00:00",
  open: close,
  high: close,
  low: close,
  close,
  score: close,
  delta: 0,
  phase: "震荡",
  label: String(close),
  keyPoint: "",
  evidence,
  prediction: "",
});

/** A year-series point with real OHLC, for the row/extreme/window cases. */
const yearPoint = (
  year: number,
  open: number,
  close: number,
  high: number,
  low: number,
  dayun = "甲子（2020 起）",
): KlinePoint => ({
  index: year,
  datetime: `${year}-01-01T00:00`,
  open,
  high,
  low,
  close,
  score: close,
  delta: close - open,
  phase: "震荡",
  label: `${year} · ${year - 1990}岁 · 丙午`,
  keyPoint: "",
  prediction: "等待下一运年与现实反馈再复盘。",
  evidence: [`大运 ${dayun}`, `流年 丙午`],
});

describe("life K-line reading helpers", () => {
  it("calculates a trailing moving average without inventing early values", () => {
    expect(movingAverage([point(40, []), point(50, []), point(70, [])], 2)).toEqual([null, 45, 60]);
  });

  it("groups contiguous dayun evidence into readable bands", () => {
    expect(groupLifeKlineBands([
      point(40, ["大运 甲子（2020 起）"]),
      point(50, ["大运 甲子（2020 起）"]),
      point(70, ["大运 乙丑（2030 起）"]),
    ])).toEqual([
      { label: "甲子（2020 起）", startIndex: 0, endIndex: 1 },
      { label: "乙丑（2030 起）", startIndex: 2, endIndex: 2 },
    ]);
  });
});

describe("life K-line chart rows", () => {
  const points = [
    yearPoint(2020, 50, 55, 60, 45),
    yearPoint(2021, 55, 48, 58, 40),
    yearPoint(2022, 48, 70, 72, 47, "乙丑（2030 起）"),
  ];

  it("puts the calendar year on the x axis and labels it as the year", () => {
    const rows = toLifeKlineRows(points, "year");
    expect(rows.map((row) => row.x)).toEqual([2020, 2021, 2022]);
    expect(rows.map((row) => row.xLabel)).toEqual(["2020", "2021", "2022"]);
  });

  it("carries the full high/low range, not the body range, so the wick survives", () => {
    // This is the assertion that catches the upstream bug: a body-range rect
    // puts the wick's endpoints on the body's edges and loses every shadow.
    expect(toLifeKlineRows(points, "year").map((row) => row.candleRange)).toEqual([
      [45, 60],
      [40, 58],
      [47, 72],
    ]);
  });

  it("uses the row index on the x axis for the relationship series", () => {
    const rows = toLifeKlineRows(points, "index");
    expect(rows.map((row) => row.x)).toEqual([0, 1, 2]);
    expect(rows[0].xLabel).toBe("01-01");
  });

  it("skips the averages when the caller asks for none", () => {
    expect(toLifeKlineRows(points, "year", null).every((row) => row.ma5 === null && row.ma10 === null)).toBe(true);
  });

  it("computes MA5/MA10 from closes and leaves the warm-up window null", () => {
    const rows = toLifeKlineRows(points, "year");
    expect(rows.map((row) => row.ma5)).toEqual([null, null, null]);
    expect(rows.map((row) => row.ma10)).toEqual([null, null, null]);
    expect(rows.map((row) => row.score)).toEqual([55, 48, 70]);
  });

  it("keeps an unparsable datetime visible by falling back to the row index", () => {
    const broken = { ...yearPoint(2020, 50, 55, 60, 45), datetime: "not-a-date" };
    expect(klineYear(broken)).toBeNull();
    const rows = toLifeKlineRows([broken], "year");
    expect(rows[0].x).toBe(0);
    expect(rows).toHaveLength(1);
  });
});

describe("life K-line extremes", () => {
  it("picks the first row on each extreme and reports how many tie", () => {
    const rows = toLifeKlineRows([
      yearPoint(2020, 50, 55, 60, 45),
      yearPoint(2021, 55, 48, 60, 40),
      yearPoint(2022, 48, 70, 72, 40),
    ], "year");
    const extremes = lifeKlineExtremes(rows);
    expect(extremes.maxHigh).toBe(72);
    expect(extremes.minLow).toBe(40);
    expect(extremes.peak?.x).toBe(2022);
    expect(extremes.trough?.x).toBe(2021);
    expect(extremes.peakTies).toBe(1);
    expect(extremes.troughTies).toBe(2);
  });

  it("returns an empty result for an empty series instead of Math.max() on nothing", () => {
    expect(lifeKlineExtremes([])).toEqual({ maxHigh: 0, minLow: 0, peak: null, trough: null, peakTies: 0, troughTies: 0 });
  });
});

describe("life K-line bands in axis units", () => {
  it("translates index bands into the years the axis actually uses", () => {
    const rows = toLifeKlineRows([
      yearPoint(2020, 50, 55, 60, 45),
      yearPoint(2021, 55, 48, 58, 40),
      yearPoint(2030, 48, 70, 72, 47, "乙丑（2030 起）"),
    ], "year");
    expect(toAxisBands(rows)).toEqual([
      { label: "甲子（2020 起）", x1: 2020, x2: 2021 },
      { label: "乙丑（2030 起）", x1: 2030, x2: 2030 },
    ]);
    expect(dayunChangeRows(rows).map((row) => row.x)).toEqual([2020, 2030]);
  });
});

describe("life K-line current-year marker", () => {
  const rows = toLifeKlineRows([
    yearPoint(2020, 50, 55, 60, 45),
    yearPoint(2021, 55, 48, 58, 40),
  ], "year");

  it("finds the row for the clock's year", () => {
    expect(currentYearRow(rows, new Date("2021-06-01T00:00:00Z"))?.x).toBe(2021);
  });

  it("returns null rather than snapping to the nearest year when the series does not cover today", () => {
    // A "今" line on the wrong year is a factual error, not a cosmetic one.
    expect(currentYearRow(rows, new Date("2040-06-01T00:00:00Z"))).toBeNull();
  });
});

describe("life K-line heads-up model", () => {
  it("reports direction, change and moving-average position", () => {
    const rows = toLifeKlineRows([
      yearPoint(2020, 50, 55, 60, 45),
      yearPoint(2021, 55, 48, 58, 40),
      yearPoint(2022, 48, 70, 72, 47),
      yearPoint(2023, 70, 74, 76, 69),
      yearPoint(2024, 74, 78, 80, 73),
      yearPoint(2025, 78, 80, 82, 77),
    ], "year");
    const rising = klineHudModel(rows[5]);
    expect(rising.up).toBe(true);
    expect(rising.change).toBe(2);
    expect(rising.dayun).toBe("甲子（2020 起）");
    expect(rising.maRelation).toBe("above");

    const falling = klineHudModel(rows[1]);
    expect(falling.up).toBe(false);
    expect(falling.change).toBe(-7);
    expect(falling.changePercent).toBeCloseTo(-12.7, 5);
  });

  it("reports no moving-average relation while the average is still warming up", () => {
    const rows = toLifeKlineRows([yearPoint(2020, 50, 55, 60, 45)], "year");
    expect(klineHudModel(rows[0]).maRelation).toBeNull();
  });

  it("never emits a non-finite percentage when open is zero", () => {
    const rows = toLifeKlineRows([{ ...yearPoint(2020, 0, 55, 60, 0), open: 0 }], "year");
    expect(klineHudModel(rows[0]).changePercent).toBe(0);
  });
});

describe("life K-line default window and selection", () => {
  // 60 years starting at 起运 1996 — the shape a 1990-born profile produces
  // (起运 at 7). Long enough that today's window is not clipped by the series end.
  const rows = toLifeKlineRows(Array.from({ length: 60 }, (_, index) => yearPoint(1996 + index, 50, 55, 60, 45)), "year");

  it("opens a full-width window around the clock's year", () => {
    const window = defaultWindow(rows, new Date("2026-06-01T00:00:00Z"));
    expect(rows[window.startIndex].x).toBe(2016);
    expect(rows[window.endIndex].x).toBe(2036);
    expect(window.endIndex - window.startIndex + 1).toBe(DEFAULT_WINDOW_RADIUS * 2 + 1);
  });

  it("opens on the first screenful before the clock resolves", () => {
    expect(defaultWindow(rows, null)).toEqual({ startIndex: 0, endIndex: DEFAULT_WINDOW_RADIUS * 2 });
  });

  it("selects today when the series covers it", () => {
    const index = defaultSelectedIndex(rows, new Date("2026-06-01T00:00:00Z"));
    expect(rows[index].x).toBe(2026);
  });

  it("never selects a year outside the window the chart opens on", () => {
    // The regression: with a default of index 0 the stat block and the detail
    // card described 1996 while the chart showed 2016–2036.
    const now = new Date("2026-06-01T00:00:00Z");
    const window = defaultWindow(rows, now);
    const index = defaultSelectedIndex(rows, now);
    expect(index).toBeGreaterThanOrEqual(window.startIndex);
    expect(index).toBeLessThanOrEqual(window.endIndex);
  });

  it("falls back inside the window when the series starts after today", () => {
    // A newborn's series begins at 起运, years after today, so there is no row
    // for "now" — the fallback still has to be a year that is on screen.
    const newborn = toLifeKlineRows(Array.from({ length: 40 }, (_, index) => yearPoint(2032 + index, 50, 55, 60, 45)), "year");
    const now = new Date("2026-06-01T00:00:00Z");
    expect(defaultSelectedIndex(newborn, now)).toBe(0);
    expect(defaultSelectedIndex(newborn, null)).toBe(0);
  });

  it("returns index 0 for an empty series", () => {
    expect(defaultSelectedIndex([], new Date("2026-06-01T00:00:00Z"))).toBe(0);
  });
});

describe("life K-line text table window", () => {
  const rows = toLifeKlineRows(Array.from({ length: 20 }, (_, index) => yearPoint(2010 + index, 50, 50 + index, 60 + index, 40)), "year");

  it("centres on the clock's year, inclusive of both ends", () => {
    const window = recentYearWindow(rows, new Date("2020-06-01T00:00:00Z"));
    expect(window.rows[0].x).toBe(2015);
    expect(window.rows.at(-1)?.x).toBe(2025);
    expect(window.rows).toHaveLength(11);
  });

  it("clamps at the series start rather than slicing past it", () => {
    const window = recentYearWindow(rows, new Date("2011-06-01T00:00:00Z"));
    expect(window.rows[0].x).toBe(2010);
    expect(window.rows).toHaveLength(7);
  });

  it("falls back to the opening years when the clock has not resolved", () => {
    // Showing the first window is visibly provisional; centring on the
    // hydration placeholder year would silently show the wrong decade.
    const window = recentYearWindow(rows, null);
    expect(window.rows.map((row) => row.x)).toEqual([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]);
    expect(window.collapsed).toBe(true);
  });

  it("returns nothing for an empty series", () => {
    expect(recentYearWindow([], null)).toEqual({ rows: [], collapsed: false });
  });
});

describe("life K-line CSV export", () => {
  it("writes a header plus one row per point", () => {
    const rows = toLifeKlineRows([
      yearPoint(2020, 50, 55, 60, 45),
      yearPoint(2021, 55, 48, 58, 40),
    ], "year");
    const lines = klineCsv(rows).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("年份,标签,大运,开盘,最高,最低,收盘,运势分,方向");
    expect(lines[1]).toBe("2020,2020 · 30岁 · 丙午,甲子（2020 起）,50,60,45,55,55,上涨");
    expect(lines[2].endsWith(",下跌")).toBe(true);
  });

  it("quotes cells that contain a comma so the column count survives", () => {
    const rows = toLifeKlineRows([yearPoint(2020, 50, 55, 60, 45, "甲子,乙丑")], "year");
    const line = klineCsv(rows).split("\n")[1];
    expect(line).toContain('"甲子,乙丑"');
  });
});
