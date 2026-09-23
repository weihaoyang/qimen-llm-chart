/**
 * Chart colours for the K-line surface.
 *
 * Recharts paints into SVG attributes (`stroke`, `fill`) on elements it builds
 * itself, so the palette cannot come from CSS classes the way the rest of the
 * workbench does.  `currentColor` is not usable either: one chart needs several
 * colours at once.
 *
 * So the values are duplicated here as literals — but not silently.  Every
 * entry names the CSS custom property (or rule) it mirrors, and
 * `kline-palette.test.ts` parses `src/app/paipan/paipan.css` and fails if any
 * value drifts.  A hex that no longer matches the workbench is a style bug the
 * compiler cannot see, and this is the cheapest way to make it visible.
 */
export const KLINE_PALETTE = {
  /** `--paipan-ink` — candle outlines, wicks, axis text. */
  ink: "#121214",
  /** `--paipan-paper` — chart surface. */
  paper: "#ffffff",
  /** `--paipan-ground` — plot background behind the candles. */
  ground: "#f4f1ea",
  /** `--paipan-red` — rising candles (up = 朱红, the workbench's auspicious colour). */
  rise: "#e63946",
  /** `.kline-panel__candle.is-down` fill — falling candles. */
  fall: "#196b58",
  /** `--paipan-yellow` — the "today" marker and the peak annotation. */
  accent: "#ffbe1a",
  /** `--paipan-violet` — secondary labels. */
  violet: "#475569",
  /** `--paipan-slate` — tertiary text. */
  slate: "#71717a",
  /** `--paipan-slate-light` — brush track, grid. */
  slateLight: "#e4e4e7",
  /** `.kline-panel__grid` stroke — dashed grid lines. */
  grid: "#d9d0c2",
  /** Body copy under the chart (`#655d53` in `paipan.css`). */
  muted: "#655d53",
} as const;

/**
 * Palette keys with no shared workbench token, and why.
 *
 * Listed explicitly so `kline-palette.test.ts` can require every *other* key to
 * trace back to a real declaration in `paipan.css`. Adding a colour forces a
 * decision: point it at a token, or say here why it is chart-local.
 */
export const KLINE_PALETTE_LOCAL = {
  /** The grid is tuned to the workbench's warm paper; the nearest token (`--paipan-slate-light`) is a cool grey. */
  grid: "warm grid, no token counterpart",
} as const;

export type KlinePalette = typeof KLINE_PALETTE;
