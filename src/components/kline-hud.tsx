"use client";

import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { klineHudModel, type LifeKlineRow } from "@/lib/kline/life-kline-reading";

/**
 * Heads-up readout for one K-line row.
 *
 * Ported from `miounet11/life-kline`'s `components/chart/ChartHUD.tsx`
 * (Apache-2.0), restyled onto the workbench tokens. Upstream calls it an
 * "alternative to traditional tooltip — doesn't obscure chart content": it does
 * not follow the cursor, so it never covers the candle you are pointing at.
 *
 * Two deliberate departures from upstream:
 *
 * - It renders **only while a row is hovered**. Upstream keeps a pinned fallback
 *   so a keyboard user still sees numbers, but this panel already has a real
 *   focusable detail block below the chart carrying the same four values, so a
 *   pinned copy would both duplicate it and float an opaque card over the plot
 *   before the visitor has pointed at anything. The block layout (used by the
 *   relationship grid, which has room for it) is the one place a persistent
 *   readout is kept.
 * - It is marked `aria-hidden`: it duplicates the selected-point detail block,
 *   which is a real focusable region. Announcing both would read every value
 *   twice, and a live region that fires on mouse move is hostile to screen
 *   readers.
 */
export function KLineHud({ row, layout = "float" }: { row: LifeKlineRow | null; layout?: "float" | "block" }) {
  if (!row) return null;
  const block = layout === "block" ? " is-block" : "";

  const model = klineHudModel(row);
  const Trend = model.up ? TrendingUp : TrendingDown;

  return (
    <div className={`kline-hud${block}`} aria-hidden="true">
      <div className="kline-hud__head">
        <strong>{model.title}</strong>
        <span className={`kline-hud__badge ${model.up ? "is-up" : "is-down"}`}>
          <Trend size={13} />
          {model.changePercent >= 0 ? "+" : ""}
          {model.changePercent}%
        </span>
      </div>
      {model.dayun ? <p className="kline-hud__dayun">大运 {model.dayun}</p> : null}
      <dl className="kline-hud__grid">
        <div><dt>开</dt><dd>{row.open}</dd></div>
        <div><dt>高</dt><dd>{row.high}</dd></div>
        <div><dt>低</dt><dd>{row.low}</dd></div>
        <div><dt>收</dt><dd className={model.up ? "is-up" : "is-down"}>{row.close}</dd></div>
      </dl>
      <div className="kline-hud__score">
        <Star size={13} className={row.score >= 70 ? "is-bright" : ""} />
        <span>运势分 {row.score}</span>
        {row.ma5 !== null ? <em>MA5 {row.ma5}</em> : null}
        {row.ma10 !== null ? <em>MA10 {row.ma10}</em> : null}
      </div>
      {model.maRelation ? (
        <p className={`kline-hud__relation is-${model.maRelation}`}>
          {model.maRelation === "above" ? "▲ 高于均线（顺势）" : "▼ 低于均线（逆势）"}
        </p>
      ) : null}
      <p className="kline-hud__reason">{row.point.prediction}</p>
    </div>
  );
}
