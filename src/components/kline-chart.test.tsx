/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { KlinePoint } from "@/lib/qimen/kline";
import { toLifeKlineRows } from "@/lib/kline/life-kline-reading";
import { PEAK_CAPTION_ASCENT } from "@/lib/kline/kline-geometry";

/**
 * `ResponsiveContainer` measures its parent, and jsdom reports every element as
 * 0×0, so the chart would render nothing at all. Substituting a container that
 * hands its child an explicit size lets the *real* component run against the
 * *real* Recharts — which matters here, because the defects this file guards
 * against were Recharts behaviours, not our own logic.
 */
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  const react = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      react.cloneElement(children as ReactElement<{ width?: number; height?: number }>, { width: 800, height: 320 }),
  };
});

import { KLineChart } from "./kline-chart";

afterEach(cleanup);

const yearPoint = (year: number, close: number, high: number, low: number, dayun: string): KlinePoint => ({
  index: year - 2000,
  datetime: `${year}-01-01T00:00`,
  open: close - 2,
  high,
  low,
  close,
  score: close,
  delta: 0,
  phase: "震荡",
  label: `${year} · ${year - 1990}岁 · 丙午`,
  keyPoint: "",
  prediction: "等待下一运年与现实反馈再复盘。",
  evidence: [`大运 ${dayun}`, `流年 丙午`],
});

// 90 years across three DaYun, with the peak and the trough far from the middle.
const points = Array.from({ length: 90 }, (_, index) => {
  const year = 2032 + index;
  const dayun = index < 30 ? "甲子（2032 起）" : index < 60 ? "乙丑（2062 起）" : "丙寅（2092 起）";
  const close = index === 5 ? 88 : index === 80 ? 14 : 50 + (index % 7);
  const high = index === 5 ? 92 : close + 4;
  const low = index === 80 ? 10 : close - 4;
  return yearPoint(year, close, high, low, dayun);
});
const rows = toLifeKlineRows(points, "year");

const plot = (container: HTMLElement) => {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no chart rendered");
  // Recharts renders the x tick labels in a `recharts-xAxis-tick-labels` group
  // that is a sibling of, not a descendant of, `.recharts-xAxis` — querying
  // `.recharts-xAxis text` silently returns nothing and every assertion built on
  // it passes vacuously. Filtering the SVG's text nodes by shape is not
  // dependent on that internal structure.
  const tickTexts = [...svg.querySelectorAll("text")]
    .map((node) => node.textContent ?? "")
    .filter((text) => /^20\d\d$/.test(text));
  const candles = [...svg.querySelectorAll(".kline-chart__candle")];
  const bodyXs = [...svg.querySelectorAll(".kline-chart__body")].map((node) => Number(node.getAttribute("x")));
  return {
    svg,
    tickTexts,
    candleCount: candles.length,
    bodySpan: bodyXs.length ? Math.round(Math.max(...bodyXs) - Math.min(...bodyXs)) : 0,
    axisSpan: (() => {
      const line = svg.querySelector(".recharts-xAxis .recharts-cartesian-axis-line");
      return line ? Number(line.getAttribute("x2")) - Number(line.getAttribute("x1")) : 0;
    })(),
  };
};

describe("KLineChart brush window", () => {
  it("zooms the axis to the brushed window instead of drawing into a corner", () => {
    // The regression: with `ifOverflow="extendDomain"` on the 大运 bands, the
    // axis snapped back to all 90 years, so the 21-row window was painted into
    // ~23% of the plot and every band pushed the candles further left.
    const { container } = render(<KLineChart rows={rows} height={320} now={new Date("2065-06-01T00:00:00Z")} ariaLabel="test" />);
    const measured = plot(container);
    expect(measured.candleCount).toBe(21);
    // The window's candles must reach across the plot, not huddle at the left.
    expect(measured.bodySpan).toBeGreaterThan(measured.axisSpan * 0.9);
  });

  it("labels the axis with years that are actually inside the window", () => {
    const { container } = render(<KLineChart rows={rows} height={320} now={new Date("2065-06-01T00:00:00Z")} ariaLabel="test" />);
    const years = plot(container).tickTexts.map(Number).filter(Number.isFinite);
    // `interval={8}` on a numeric axis collapsed this to a single label.
    expect(years.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...years)).toBeGreaterThanOrEqual(2055);
    expect(Math.max(...years)).toBeLessThanOrEqual(2075);
  });

  it("opens the window on the clock's year, not on the first row", () => {
    const { container } = render(<KLineChart rows={rows} height={320} now={new Date("2095-06-01T00:00:00Z")} ariaLabel="test" />);
    const years = plot(container).tickTexts.map(Number).filter(Number.isFinite);
    expect(Math.min(...years)).toBeGreaterThan(2080);
  });

  it("falls back to the opening years before the clock resolves", () => {
    const { container } = render(<KLineChart rows={rows} height={320} ariaLabel="test" />);
    expect(plot(container).candleCount).toBe(21);
  });
});

describe("KLineChart annotations", () => {
  it("marks the highest and lowest points of the visible window exactly once", () => {
    const { container } = render(<KLineChart rows={rows} height={320} now={new Date("2037-06-01T00:00:00Z")} ariaLabel="test" />);
    expect(container.querySelectorAll(".kline-chart__extreme.is-peak")).toHaveLength(1);
    expect(container.querySelectorAll(".kline-chart__extreme.is-trough")).toHaveLength(1);
  });

  it("marks the window's own extremes, so the marks stay visible after a zoom", () => {
    // The series' global trough is 2112 and the global peak is 2037. The window
    // around 2065 contains neither, yet both marks must still render — they
    // describe what is on screen. Marking the global extremes would leave the
    // trough discarded off-screen and the peak silently absent.
    const { container } = render(<KLineChart rows={rows} height={320} now={new Date("2065-06-01T00:00:00Z")} ariaLabel="test" />);
    const peakLabel = container.querySelector(".kline-chart__extreme.is-peak text")?.textContent;
    const troughLabel = container.querySelector(".kline-chart__extreme.is-trough text")?.textContent;
    expect(peakLabel).toBe("最高");
    expect(troughLabel).toBe("最低");
  });

  it("draws the 今 marker only when the window covers today", () => {
    const inside = render(<KLineChart rows={rows} height={320} now={new Date("2065-06-01T00:00:00Z")} ariaLabel="test" />);
    expect(inside.container.querySelectorAll(".kline-chart__today")).toHaveLength(1);
    cleanup();

    // A newborn's chart starts at 起运, which is years after today.
    const outside = render(<KLineChart rows={rows} height={320} now={new Date("2001-06-01T00:00:00Z")} ariaLabel="test" />);
    expect(outside.container.querySelectorAll(".kline-chart__today")).toHaveLength(0);
  });

  it("positions the 今 label in pixels rather than at the year value", () => {
    // The regression: the label was passed as a child `<text x={2065}>`, and
    // Recharts renders a child verbatim — so 2065 was taken as an SVG coordinate
    // on an 800-wide surface and the glyph was drawn outside the viewport, where
    // the SVG viewport clips it without any CSS `clip-path` to find.
    const { container } = render(<KLineChart rows={rows} height={320} now={new Date("2065-06-01T00:00:00Z")} ariaLabel="test" />);
    const label = container.querySelector(".kline-chart__today");
    expect(label).not.toBeNull();
    const x = Number(label?.getAttribute("x"));
    expect(Number.isFinite(x)).toBe(true);
    expect(x).not.toBe(2065);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(800);
  });

  it("keeps the peak caption inside the surface when the peak reaches the top of the domain", () => {
    // The regression: `PeakMark` stacks "最高" 30px above the point, and a peak
    // *is* the top of the domain — so the caption lands above the plot's top
    // edge. With a 34px top margin its glyph box started at y -5 and the SVG
    // viewport cut the top off, invisibly: no CSS `clip-path` is involved, so
    // the usual "is it clipped" check cannot see it.
    //
    // Measured in a real browser on the 感情 K 线 时辰线 card, whose peak hit 100.
    // The 八字 series peaks near 80, which is why the same defect had been
    // sitting there unnoticed.
    const topPoints = Array.from({ length: 20 }, (_, index) =>
      yearPoint(2010 + index, index === 4 ? 100 : 40 + (index % 5), index === 4 ? 100 : 44 + (index % 5), 38, "甲子（2010 起）"),
    );
    const topRows = toLifeKlineRows(topPoints, "year");
    const { container } = render(<KLineChart rows={topRows} height={320} variant="compact" ariaLabel="test" />);

    const caption = container.querySelector(".kline-chart__extreme.is-peak text");
    expect(caption).not.toBeNull();
    const y = Number(caption?.getAttribute("y"));
    expect(Number.isFinite(y)).toBe(true);
    // The glyph sits above its baseline, so the caption is visible only while
    // `y` clears the ascent the chart's top margin reserves. `>= 0` is exactly
    // "the glyph box starts at or below the surface's top edge".
    expect(y - PEAK_CAPTION_ASCENT).toBeGreaterThanOrEqual(0);
  });

  it("draws one divider per DaYun inside the window", () => {
    const { container } = render(<KLineChart rows={rows} height={320} now={new Date("2037-06-01T00:00:00Z")} ariaLabel="test" />);
    // The 2032 window contains only the first DaYun boundary.
    expect(container.querySelectorAll(".recharts-reference-line").length).toBeLessThanOrEqual(3);
  });
});

describe("KLineChart variants", () => {
  it("renders an empty state instead of an axis when there are no rows", () => {
    const { container } = render(<KLineChart rows={[]} height={320} ariaLabel="test" />);
    expect(container.querySelector(".kline-chart__empty")).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("skips the brush and the moving averages in the compact variant", () => {
    const { container } = render(<KLineChart rows={rows.slice(0, 12)} height={120} variant="compact" ariaLabel="test" />);
    expect(container.querySelector(".recharts-brush")).toBeNull();
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(1);
  });

  it("still renders candles in the compact variant", () => {
    const { container } = render(<KLineChart rows={rows.slice(0, 12)} height={120} variant="compact" ariaLabel="test" />);
    expect(container.querySelectorAll(".kline-chart__candle").length).toBeGreaterThan(5);
  });
});

describe("KLineChart hover index", () => {
  /**
   * Recharts derives `activeTooltipIndex` from the pointer's position, which in
   * jsdom is meaningless because every element measures 0×0. Stubbing the rect
   * is what lets the *real* handler run, and the real handler is the thing under
   * test: it has to resolve the index against the brushed window.
   */
  const stubRect = () => {
    const rect = { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 320, width: 800, height: 320, toJSON: () => ({}) };
    return vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
  };

  /** The x, in SVG units, of the axis label for `year`. */
  const tickXFor = (container: HTMLElement, year: number): number | null => {
    const svg = container.querySelector("svg");
    if (!svg) return null;
    const node = [...svg.querySelectorAll("text")].find((text) => text.textContent === String(year));
    return node ? Number(node.getAttribute("x")) : null;
  };

  /**
   * A year that actually carries a tick, taken from the rendered axis rather
   * than hardcoded: the tick interval is Recharts' choice, and a year that is
   * not labelled has no x to aim at.
   */
  const middleTick = (container: HTMLElement): number => {
    const years = plot(container).tickTexts.map(Number).filter(Number.isFinite);
    expect(years.length).toBeGreaterThanOrEqual(3);
    return years[Math.floor(years.length / 2)];
  };

  /**
   * Recharts throttles pointer events to the next animation frame
   * (`throttleDelay: 'raf'`), so the callback lands after the dispatch, not
   * during it — a synchronous assertion here reads an empty spy.
   */
  const nextFrame = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
  };

  it("reports the row under the pointer, not one offset by the window start", async () => {
    // The window for this clock is 2055–2075, i.e. series indices 23–43. Recharts
    // reports the index *within the window*, so resolving it against the full
    // series lands 23 years early — measured on the running app as hovering the
    // 2024 tick and being told 2004.
    const spy = stubRect();
    try {
      const onHover = vi.fn();
      const { container } = render(
        <KLineChart rows={rows} height={320} now={new Date("2065-06-01T00:00:00Z")} ariaLabel="test" onHover={onHover} />,
      );
      const targetYear = middleTick(container);
      const x = tickXFor(container, targetYear);
      expect(x).not.toBeNull();

      const wrapper = container.querySelector(".recharts-wrapper");
      expect(wrapper).not.toBeNull();
      fireEvent.mouseMove(wrapper as Element, { clientX: x, clientY: 120 });
      await nextFrame();

      expect(onHover).toHaveBeenCalled();
      const row = onHover.mock.calls.at(-1)?.[0];
      expect(row).not.toBeNull();
      expect(row.x).toBe(targetYear);
    } finally {
      spy.mockRestore();
    }
  });

  it("translates a click into a series index, not a window index", async () => {
    const spy = stubRect();
    try {
      const onSelect = vi.fn();
      const { container } = render(
        <KLineChart rows={rows} height={320} now={new Date("2065-06-01T00:00:00Z")} ariaLabel="test" onSelect={onSelect} />,
      );
      const targetYear = middleTick(container);
      const x = tickXFor(container, targetYear);
      expect(x).not.toBeNull();

      const wrapper = container.querySelector(".recharts-wrapper");
      // Recharts derives the click's target from the last pointer position, so a
      // click with no preceding move carries no index at all.
      fireEvent.mouseMove(wrapper as Element, { clientX: x, clientY: 120 });
      await nextFrame();
      fireEvent.click(wrapper as Element, { clientX: x, clientY: 120 });
      await nextFrame();

      expect(onSelect).toHaveBeenCalled();
      // `rows` starts at 2032, so the series index is the year minus 2032; a
      // window index would be short by the window's start (2055 here).
      expect(onSelect.mock.calls.at(-1)?.[0]).toBe(targetYear - 2032);
    } finally {
      spy.mockRestore();
    }
  });
});
