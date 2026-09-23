"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, TrendingDown, TrendingUp } from "lucide-react";
import { klineCsv, klineHudModel, recentYearWindow, type LifeKlineRow } from "@/lib/kline/life-kline-reading";

/**
 * The K-line as a table, ported from `miounet11/life-kline`'s
 * `components/KLineTextTable.tsx` (Apache-2.0).
 *
 * This is the chart's accessible twin, not a decoration: Recharts paints the
 * candles as unlabelled SVG, so a screen reader gets nothing from the plot.
 * Every value the chart encodes is readable here, and the CSV export makes the
 * whole series usable outside the page.
 *
 * Two upstream behaviours were changed on purpose:
 *
 * 1. `new Date().getFullYear()` during render → the caller's hydration-resolved
 *    clock. This repository renders on the server first; reading the wall clock
 *    mid-render is the exact mismatch `src/lib/hydration-clock.ts` exists to
 *    prevent.
 * 2. The export filename used `new Date().getTime()`. It is derived from the
 *    series instead, so two exports of the same data produce the same name and
 *    a test can assert it.
 */
export function KLineTextTable({ rows, now }: { rows: readonly LifeKlineRow[]; now?: Date }) {
  const [expanded, setExpanded] = useState(false);
  const window = useMemo(() => recentYearWindow(rows, now ?? null), [now, rows]);
  const visible = expanded ? rows : window.rows;

  if (rows.length === 0) return null;

  const exportCsv = () => {
    const csv = `\uFEFF${klineCsv(rows)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `人生K线_流年详批_${rows[0].xLabel}-${rows[rows.length - 1].xLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="kline-table" aria-label="人生 K 线流年详批表">
      <div className="kline-table__head">
        <div>
          <strong>流年详批</strong>
          <span>{expanded ? `全部 ${rows.length} 年` : `近 ${visible.length} 年`}</span>
        </div>
        <button type="button" onClick={exportCsv}>
          <Download size={14} />导出 CSV
        </button>
      </div>
      <div className="kline-table__scroll">
        <table>
          <caption className="kline-table__caption">
            每一行是一个流年点。开高低收来自大运与流年的结构加权，不是行情价格。
          </caption>
          <thead>
            <tr>
              <th scope="col">年份</th>
              <th scope="col">大运</th>
              <th scope="col">开 / 高 / 低 / 收</th>
              <th scope="col">运势分</th>
              <th scope="col">方向</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const model = klineHudModel(row);
              const Trend = model.up ? TrendingUp : TrendingDown;
              return (
                <tr key={`${row.x}-${row.index}`} className={model.up ? "is-up" : "is-down"}>
                  <th scope="row">{row.point.label}</th>
                  <td>{model.dayun ?? "—"}</td>
                  <td className="kline-table__ohlc">
                    {row.open} / {row.high} / {row.low} / {row.close}
                  </td>
                  <td className="kline-table__score">{row.score}</td>
                  <td>
                    <span className={`kline-table__trend ${model.up ? "is-up" : "is-down"}`}>
                      <Trend size={13} />
                      {model.up ? "上涨" : "下跌"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="kline-table__toggle" onClick={() => setExpanded((value) => !value)}>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "收起，只看当前窗口" : `展开全部 ${rows.length} 年`}
      </button>
    </section>
  );
}
