/**
 * Candle geometry, kept out of the component so it can be asserted directly.
 *
 * The upstream chart maps `high`/`low` to pixels through Recharts' internal
 * `yAxis.scale` and wraps the call in a `try/catch` that silently falls back to
 * the body rect when the scale is unavailable. That fallback produces a candle
 * with no wick at all, which is indistinguishable from "this year's high equals
 * its close" — a real reading, and therefore a silent wrong answer.
 *
 * The shape Recharts hands a custom `Bar` is already the rect spanning
 * `low` (bottom) to `high` (top), so the scale is recoverable from the rect
 * itself: within one candle the axis is linear, so
 * `pixel(v) = y + height * (high - v) / (high - low)`. No internal API, no
 * fallback, and the arithmetic is testable.
 */

export type CandleBox = {
  /** Rect Recharts gives the shape: spans `low` at the bottom to `high` at the top. */
  y: number;
  height: number;
  high: number;
  low: number;
  open: number;
  close: number;
};

export type CandleGeometry = {
  /** Top of the wick, in pixels. */
  wickTop: number;
  /** Bottom of the wick, in pixels. */
  wickBottom: number;
  /** Top of the body, in pixels. */
  bodyTop: number;
  /** Body height in pixels, never below `minBody`. */
  bodyHeight: number;
  up: boolean;
};

/**
 * `minBody` keeps a doji (open === close) visible. Upstream uses a flat 2px;
 * we keep the same value so a flat year still reads as a candle rather than a
 * gap, and so the number is reviewable in one place.
 */
export const candleGeometry = (box: CandleBox, minBody = 2): CandleGeometry => {
  const { y, height, high, low, open, close } = box;
  const span = high - low;
  const up = close >= open;

  // A perfectly flat candle has no span to interpolate over. Its open, close,
  // high and low are all the same value, so every pixel position is `y`.
  if (!Number.isFinite(span) || span <= 0) {
    return { wickTop: y, wickBottom: y, bodyTop: y, bodyHeight: minBody, up };
  }

  const pixel = (value: number) => y + (height * (high - value)) / span;
  const bodyTop = pixel(Math.max(open, close));
  const bodyBottom = pixel(Math.min(open, close));
  return {
    wickTop: y,
    wickBottom: y + height,
    bodyTop,
    bodyHeight: Math.max(minBody, bodyBottom - bodyTop),
    up,
  };
};

/**
 * The body is drawn narrower than its slot so consecutive candles stay visually
 * separate. Upstream lets Recharts pick the bar width; we set it from the slot
 * width instead, so the ratio is a number we control and can test.
 */
export const candleBodyWidth = (slotWidth: number, ratio = 0.62) =>
  Math.max(2, Math.round(slotWidth * ratio));

/**
 * Distance from the peak point up to the "最高" caption's baseline.
 *
 * Lives here, next to `PEAK_CAPTION_HEADROOM`, because the two have to agree:
 * the caption is drawn by `PeakMark` and the room for it is reserved by the
 * chart's top margin, and nothing in the type system connects them.
 */
export const PEAK_CAPTION_OFFSET = 30;

/**
 * Glyph ascent to reserve for that caption, in pixels.
 *
 * Measured in a real browser, not estimated: the caption box for the 11px label
 * sat 9px above its baseline (box 12px tall, baseline at +4 from the top).
 * Rounded up so a font-metric wobble does not reintroduce the clip.
 */
export const PEAK_CAPTION_ASCENT = 12;

/**
 * Top margin the chart must reserve so the peak caption is never clipped.
 *
 * `PeakMark` stacks the caption `PEAK_CAPTION_OFFSET` above the point, and the
 * point itself can sit as high as the plot's top edge — that is exactly what a
 * peak is. Anything less than this and the top of the text falls outside the
 * `<svg>` viewport and is silently cut off by SVG viewport clipping, which no
 * `clip-path` check can see.
 *
 * Measured: with a 34px top margin the 感情 K 线 时辰线 card lost 5px off the top
 * of "最高" (glyph box y -5..7 against a surface starting at 0), because its peak
 * reached the top of the 0-100 domain. The 八字 series peaks around 80, so the
 * same defect had been present but invisible there all along.
 */
export const PEAK_CAPTION_HEADROOM = PEAK_CAPTION_OFFSET + PEAK_CAPTION_ASCENT;
