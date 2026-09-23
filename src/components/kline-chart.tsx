"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarShapeProps, MouseHandlerDataParam } from "recharts";
import { candleBodyWidth, candleGeometry, PEAK_CAPTION_HEADROOM, PEAK_CAPTION_OFFSET } from "@/lib/kline/kline-geometry";
import { KLINE_PALETTE } from "@/lib/kline/kline-palette";
import { DEFAULT_WINDOW_RADIUS, defaultWindow, klineWindow, type LifeKlineRow } from "@/lib/kline/life-kline-reading";

/**
 * Recharts rewrite of `miounet11/life-kline`'s `LifeKLineChart` (Apache-2.0):
 * https://github.com/miounet11/life-kline/blob/main/components/LifeKLineChart.tsx
 *
 * The upstream component is Tailwind + hardcoded `emerald/rose/indigo/amber`.
 * Here the colours come from `paipan.css` instead — but note *how*: everything
 * this file draws itself (candles, peak/trough marks, dividers) carries a class
 * and is painted by CSS, so it follows the workbench tokens automatically. Only
 * the elements Recharts builds internally (grid, axis, brush track, reference
 * fills) need literal colours, and those go through `KLINE_PALETTE`, which has
 * a guard test pinning it to `paipan.css`.
 *
 * Three upstream behaviours were changed on purpose. The first two were live
 * defects in an earlier draft of this file, found by measuring the rendered
 * axis rather than by reading the code:
 *
 * 1. **No `ifOverflow="extendDomain"` on the 大运 bands.** Recharts extends a
 *    numeric axis domain to cover every reference element that asks it to. With
 *    `extendDomain` the axis snapped back to the full 90 years, so a brushed
 *    window of 11 candles was painted into the left 11% of the plot. Bands now
 *    clip instead; `kline-chart.test.tsx` pins the difference.
 * 2. **`tickCount`, not `interval`.** `interval` counts *generated* ticks, not
 *    data points. A numeric axis generates about five, so `interval={8}` left
 *    exactly one year label on screen.
 * 3. **No `yAxis.scale` in the candle shape.** Upstream reads Recharts' internal
 *    scale and falls back to the body rect on failure, which silently erases the
 *    wick. `candleGeometry` recovers the scale from the rect instead.
 *
 * The y axis is pinned to 0–100: the series is a clamped score, so a floating
 * domain would exaggerate small wobbles into apparent rallies.
 */

export type KLineChartVariant = "full" | "compact";

type KLineChartProps = {
  rows: readonly LifeKlineRow[];
  height: number;
  variant?: KLineChartVariant;
  /** Hydration-resolved clock; drives the "今" marker and the opening window. */
  now?: Date;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  onHover?: (row: LifeKlineRow | null) => void;
  ariaLabel: string;
};

const Y_TICKS = [20, 40, 60, 80];

function CandleShape(props: BarShapeProps): ReactElement | null {
  const row = props.payload as LifeKlineRow | undefined;
  if (!row) return null;

  const geometry = candleGeometry({
    y: props.y,
    height: props.height,
    high: row.candleRange[1],
    low: row.candleRange[0],
    open: row.open,
    close: row.close,
  });
  const bodyWidth = candleBodyWidth(props.width);
  const center = props.x + props.width / 2;

  return (
    <g className={`kline-chart__candle ${geometry.up ? "is-up" : "is-down"}`}>
      <line
        className="kline-chart__wick"
        x1={center}
        x2={center}
        y1={geometry.wickTop}
        y2={geometry.wickBottom}
      />
      <rect
        className="kline-chart__body"
        x={center - bodyWidth / 2}
        y={geometry.bodyTop}
        width={bodyWidth}
        height={geometry.bodyHeight}
      />
    </g>
  );
}

/**
 * Golden star on the highest high.
 *
 * Recharts types `shape` as "always returns an element", so the guard lives
 * inside the `<g>` rather than returning `null` — the element renders empty
 * when Recharts has not supplied coordinates yet.
 */
const PeakMark = ({ cx, cy }: { cx?: number; cy?: number }) => (
  <g className="kline-chart__extreme is-peak">
    {typeof cx === "number" && typeof cy === "number" ? (
      <>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" transform={`translate(${cx - 7}, ${cy - PEAK_CAPTION_OFFSET + 4}) scale(0.58)`} />
        <text x={cx} y={cy - PEAK_CAPTION_OFFSET} textAnchor="middle">最高</text>
      </>
    ) : null}
  </g>
);

/**
 * Down arrow on the lowest low, with the label to its right.
 *
 * Upstream centres the label *below* the arrow. That works only while the low
 * has room underneath it, and the window's lowest low by definition sits on the
 * bottom of the scale — measured on the running app, the label landed at y
 * 259–271 while the x-axis tick labels occupy 245–259, so "最低" was drawn in the
 * tick-label band directly under the year it belonged to. Anchoring it above and
 * to the right of the low keeps it inside the plot without the chart having to
 * know where the plot's bottom edge is: the label box then ends ~2px above the
 * plot floor, and no other candle in the window reaches that low, so the space
 * beside the arrow is clear.
 */
const TroughMark = ({ cx, cy }: { cx?: number; cy?: number }) => (
  <g className="kline-chart__extreme is-trough">
    {typeof cx === "number" && typeof cy === "number" ? (
      <>
        <path d="M12 22l-6-6h4V8h4v8h4z" transform={`translate(${cx - 7}, ${cy + 5}) scale(0.58)`} />
        <text x={cx + 8} y={cy - 4} textAnchor="start">最低</text>
      </>
    ) : null}
  </g>
);

/** Recharts reports the hovered index as `string | number | null`; only an integer row index is usable. */
const rowIndexFrom = (state: MouseHandlerDataParam | null): number | null => {
  const raw = state?.activeTooltipIndex;
  const index = typeof raw === "string" ? Number(raw) : raw;
  return typeof index === "number" && Number.isInteger(index) ? index : null;
};

/** Recharts' own `<Legend>` cannot be styled with the workbench classes, so the key is plain HTML. */
export function KLineLegend({ compact = false }: { compact?: boolean }) {
  return (
    <ul className="kline-legend" aria-label="K 线图例">
      <li className="is-up">上涨（收 ≥ 开）</li>
      <li className="is-down">下跌（收 &lt; 开）</li>
      <li className="is-ma5">MA5</li>
      {compact ? null : <li className="is-ma10">MA10</li>}
      {compact ? null : <li className="is-peak">窗口内最高</li>}
      {compact ? null : <li className="is-trough">窗口内最低</li>}
    </ul>
  );
}

export function KLineChart({
  rows,
  height,
  variant = "full",
  now,
  selectedIndex,
  onSelect,
  onHover,
  ariaLabel,
}: KLineChartProps) {
  const compact = variant === "compact";
  // The compact sparkline has no Brush, so its visible range is the whole series.
  const initial = useMemo(
    () => (compact ? { startIndex: 0, endIndex: Math.max(0, rows.length - 1) } : defaultWindow(rows, now ?? null, DEFAULT_WINDOW_RADIUS)),
    [compact, now, rows],
  );
  // Holds the hovered *row*, not an index: `activeTooltipIndex` counts from the
  // start of the brushed window while `range` counts from the start of the full
  // series, so an index stored here would need translating before every use.
  const [hoveredRow, setHoveredRow] = useState<LifeKlineRow | null>(null);
  // The Brush is driven by this state rather than by Recharts' internal window,
  // because the same window also decides which bands, dividers and extremes are
  // worth drawing. One source of truth for "what is on screen".
  //
  // Note the indices are positions in the *full* series, and the chart's `data`
  // is the full series too — Recharts' Brush indexes into the data it is given,
  // so handing it a pre-sliced array makes every index past the slice invalid
  // and the plot renders empty.
  const [range, setRange] = useState(initial);
  // `rows` is rebuilt whenever the series changes (product switch, new profile).
  // Reset the window then, or the chart keeps a slice of the old series.
  const [rangeKey, setRangeKey] = useState(rows);
  if (rangeKey !== rows) {
    setRangeKey(rows);
    setRange(initial);
  }

  const view = useMemo(
    () => klineWindow(rows, range.startIndex, range.endIndex, now ?? null),
    [now, range.endIndex, range.startIndex, rows],
  );

  // `activeTooltipIndex` is relative to the brushed window, *not* to the series
  // handed to `ComposedChart`. Measured on the running app: hovering the tick
  // labelled 2024 (window 2016–2036) reports index 8, and `rows[8]` is 2004 —
  // off by exactly the window's start. Resolve against `view.rows` and convert
  // back with the row's own series index.
  const rowAt = useCallback(
    (state: MouseHandlerDataParam | null): LifeKlineRow | null => {
      const index = rowIndexFrom(state);
      return index === null ? null : view.rows[index] ?? null;
    },
    [view.rows],
  );

  const handleMove = useCallback(
    (state: MouseHandlerDataParam | null) => {
      if (!onHover) return;
      const row = rowAt(state);
      setHoveredRow((current) => (current === row ? current : row));
      onHover(row);
    },
    [onHover, rowAt],
  );

  if (rows.length === 0) {
    return <div className="kline-chart__empty">暂无足够的序列点生成 K 线。</div>;
  }

  const firstX = view.rows[0]?.x ?? 0;
  const lastX = view.rows[view.rows.length - 1]?.x ?? 0;
  const selected = selectedIndex === undefined ? null : rows[selectedIndex] ?? null;
  // A selection made before the brush moved would otherwise draw its crosshair
  // outside the plot area.
  const cursorRow = [hoveredRow, selected].find((row) => row !== null && row.x >= firstX && row.x <= lastX) ?? null;
  const canBrush = !compact && rows.length > DEFAULT_WINDOW_RADIUS * 2 + 1;

  return (
    <div className={`kline-chart ${compact ? "is-compact" : "is-full"}`}>
      <div className="kline-chart__frame" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={rows as LifeKlineRow[]}
            // `PEAK_CAPTION_HEADROOM`, not a hand-picked number: the peak caption
            // is drawn 30px above a point that can sit on the plot's top edge, so
            // the top margin has to cover the offset plus the glyph. At 34px the
            // caption was clipped by the SVG viewport whenever the peak reached
            // the top of the domain (see the note on the constant).
            margin={{ top: PEAK_CAPTION_HEADROOM, right: 16, left: 0, bottom: canBrush ? 44 : 6 }}
            onMouseMove={handleMove}
            onMouseLeave={() => handleMove(null)}
            onClick={(state) => {
              const row = rowAt(state);
              if (row) onSelect?.(row.index);
            }}
            role="img"
            aria-label={ariaLabel}
          >
            {view.bands.map((band, index) => (
              <ReferenceArea
                key={`band-${band.label}-${band.x1}`}
                x1={band.x1}
                x2={band.x2}
                fill={index % 2 === 0 ? KLINE_PALETTE.accent : KLINE_PALETTE.violet}
                fillOpacity={index % 2 === 0 ? 0.14 : 0.08}
                stroke="none"
                ifOverflow="hidden"
              />
            ))}

            <CartesianGrid strokeDasharray="4 5" vertical={false} stroke={KLINE_PALETTE.grid} />

            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickCount={compact ? 3 : 6}
              tick={{ fontSize: 11, fill: KLINE_PALETTE.muted }}
              tickLine={false}
              axisLine={{ stroke: KLINE_PALETTE.grid }}
              tickFormatter={(value: number) => rows.find((row) => row.x === value)?.xLabel ?? String(value)}
              allowDecimals={false}
            />

            <YAxis
              domain={[0, 100]}
              ticks={compact ? [] : Y_TICKS}
              tick={{ fontSize: 11, fill: KLINE_PALETTE.muted }}
              tickLine={false}
              axisLine={false}
              width={compact ? 26 : 34}
            />

            {compact ? null : (
              <Tooltip
                cursor={{ stroke: KLINE_PALETTE.slate, strokeDasharray: "4 4", strokeWidth: 1 }}
                content={() => null}
                isAnimationActive={false}
              />
            )}

            {view.dividers.map((row, index) => (
              <ReferenceLine key={`divider-${row.x}-${index}`} x={row.x} stroke={KLINE_PALETTE.slate} strokeDasharray="3 3" />
            ))}

            {view.today ? (
              // The label goes through Recharts' `label` prop rather than as a
              // child `<text>`. A child is rendered verbatim, so `x={2026}`
              // became an *SVG* coordinate 2026 on an 849-wide surface — the
              // glyph landed at page x 2067 in a 1406-wide window, off screen.
              // Only `label` gets positioned against the line.
              <ReferenceLine
                x={view.today.x}
                stroke={KLINE_PALETTE.accent}
                strokeWidth={2}
                label={{ value: "今", position: "top", offset: 8, className: "kline-chart__today" }}
              />
            ) : null}

            {cursorRow ? (
              <ReferenceLine y={cursorRow.close} stroke={KLINE_PALETTE.slate} strokeDasharray="4 4" strokeWidth={1} />
            ) : null}

            {compact ? null : (
              <Line type="monotone" dataKey="ma10" stroke={KLINE_PALETTE.violet} strokeDasharray="5 4" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
            )}
            <Line type="monotone" dataKey="ma5" stroke={KLINE_PALETTE.ink} dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />

            <Bar dataKey="candleRange" shape={CandleShape} isAnimationActive={false} maxBarSize={compact ? 10 : 18} />

            {view.extremes.peak ? <ReferenceDot x={view.extremes.peak.x} y={view.extremes.peak.high} shape={PeakMark} /> : null}
            {view.extremes.trough ? <ReferenceDot x={view.extremes.trough.x} y={view.extremes.trough.low} shape={TroughMark} /> : null}

            {canBrush ? (
              <Brush
                dataKey="x"
                height={26}
                travellerWidth={9}
                stroke={KLINE_PALETTE.ink}
                fill={KLINE_PALETTE.ground}
                startIndex={view.startIndex}
                endIndex={view.endIndex}
                tickFormatter={() => ""}
                onChange={(next) => {
                  if (typeof next?.startIndex === "number" && typeof next?.endIndex === "number") {
                    setRange({ startIndex: next.startIndex, endIndex: next.endIndex });
                  }
                }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
