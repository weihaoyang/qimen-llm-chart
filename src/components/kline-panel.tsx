"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { KlineKind, KlinePoint, KlineScale, KlineSeries } from "@/lib/qimen/kline";
import { DEFAULT_WINDOW_RADIUS, defaultSelectedIndex, toLifeKlineRows, type LifeKlineRow } from "@/lib/kline/life-kline-reading";
import { KLineChart, KLineLegend } from "./kline-chart";
import { KLineHud } from "./kline-hud";
import { KLineTextTable } from "./kline-text-table";

type KlinePanelProps = {
  life: KlineSeries;
  relationship: KlineSeries;
  relationshipScales?: Partial<Record<KlineScale, KlineSeries>>;
  aiContent: string;
  aiKind?: KlineKind | null;
  aiError?: string | null;
  loading: boolean;
  onAnalyze: (kind: KlineKind, scale?: KlineScale) => void;
  aiPriceLabel?: string;
  /**
   * Hydration-resolved clock. Omitted until the visitor's real clock is known,
   * so the server render never pins a "今" marker to the placeholder year.
   */
  now?: Date;
};

type KlineMarker = { kind: "rise" | "turn-up" | "turn-down"; label: string; reason: string };

const FULL_CHART_HEIGHT = 340;
const COMPACT_CHART_HEIGHT = 118;

const markerFor = (points: KlinePoint[], index: number): KlineMarker | null => {
  const point = points[index];
  if (!point) return null;
  const previous = points[index - 1];
  const next = points[index + 1];
  if (previous && point.delta >= 8) {
    return { kind: "rise", label: "拉升", reason: `较上一点上升 ${point.delta} 分：${point.evidence.slice(0, 2).join("；")}` };
  }
  if (previous && next && point.close > previous.close && point.close >= next.close && point.close - next.close >= 4) {
    return { kind: "turn-up", label: "上拐", reason: `高位后动能转弱：${point.evidence.slice(0, 2).join("；")}` };
  }
  if (previous && next && point.close < previous.close && point.close <= next.close && next.close - point.close >= 4) {
    return { kind: "turn-down", label: "下拐", reason: `低位后出现修复：${point.evidence.slice(0, 2).join("；")}` };
  }
  return null;
};

export function KlinePanel({ life, relationship, relationshipScales, aiContent, aiKind, aiError, loading, onAnalyze, aiPriceLabel = "¥29.90", now }: KlinePanelProps) {
  const [kind, setKind] = useState<KlineKind>("life");
  const [scale, setScale] = useState<KlineScale>("double-hour");
  // `null` means "no explicit pick yet" — not "row 0". The chart opens on a
  // window centred on the clock's year, so a hard-coded index 0 would leave the
  // stat block and the detail card describing a year the chart has scrolled past
  // (with the 1990 default profile: 1996, while the window shows 2016–2036).
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState<LifeKlineRow | null>(null);
  const series = kind === "life" ? life : relationshipScales?.[scale] ?? relationship;
  const visiblePoints = useMemo(() => series.points.slice(0, 120), [series.points]);
  const rows = useMemo(
    () => toLifeKlineRows(visiblePoints, kind === "life" ? "year" : "index"),
    [kind, visiblePoints],
  );
  const selectedIndex = pickedIndex ?? defaultSelectedIndex(rows, now ?? null, DEFAULT_WINDOW_RADIUS);
  const selected = series.points[selectedIndex] ?? series.points.at(-1);
  const markers = useMemo(
    () => visiblePoints.map((point, index) => ({ point, marker: markerFor(visiblePoints, index) })).filter((item): item is { point: KlinePoint; marker: KlineMarker } => Boolean(item.marker)),
    [visiblePoints],
  );
  const relationshipScaleEntries = useMemo(
    () =>
      (["double-hour", "day", "month", "year"] as const).map((value) => {
        const scaleSeries = relationshipScales?.[value] ?? relationship;
        const points = scaleSeries.points.slice(0, 20);
        return {
          value,
          label: value === "double-hour" ? "时辰线" : value === "day" ? "日线" : value === "month" ? "月线" : "年线",
          series: scaleSeries,
          rows: toLifeKlineRows(points, "index", null),
        };
      }),
    [relationship, relationshipScales],
  );
  // The float HUD follows the cursor only (see `KLineHud`): the relationship
  // grid has room for a persistent readout, the life chart does not — a pinned
  // card there would sit on top of the candles it is describing.
  const hudRow = hovered ?? rows[selectedIndex] ?? rows.at(-1) ?? null;

  return (
    <section className="kline-panel" aria-label={kind === "life" ? "八字人生 K 线" : "奇门序列盘感情 K 线"}>
      <div className="kline-panel__header">
        <div>
          <span className="kline-panel__eyebrow">规则版 · 免费 · 条件趋势</span>
          <h2>{series.title}</h2>
          <p>{series.methodology}</p>
        </div>
        <div className="kline-panel__switch" role="tablist" aria-label="K线类型">
          <button type="button" className={kind === "life" ? "is-active" : ""} onClick={() => { setKind("life"); setPickedIndex(null); setHovered(null); }}>人生</button>
          <button type="button" className={kind === "relationship" ? "is-active" : ""} onClick={() => { setKind("relationship"); setPickedIndex(null); setHovered(null); }}>感情</button>
        </div>
      </div>
      {kind === "relationship" ? <div className="kline-panel__scales" role="tablist" aria-label="感情 K 线时间尺度">
        {(["double-hour", "day", "month", "year"] as const).map((value) => <button key={value} type="button" className={scale === value ? "is-active" : ""} onClick={() => { setScale(value); setPickedIndex(null); setHovered(null); }}>{value === "double-hour" ? "时辰线 · 20" : value === "day" ? "日线 · 20" : value === "month" ? "月线 · 20" : "年线 · 20"}</button>)}
      </div> : null}
      {series.points.length < 2 ? (
        <div className="kline-panel__empty">先在“调整盘面”中选择序列，生成至少 2 张盘。</div>
      ) : (
        <>
          <div className="kline-panel__stats"><strong>{selected?.score ?? 0}</strong><span>当前条件分</span><em className={`is-${selected?.phase === "上行" ? "up" : selected?.phase === "下行" ? "down" : "flat"}`}>{selected?.phase}</em><small>{series.sourceCount} 张序列盘</small></div>
          {kind === "relationship" ? (
            <>
              <KLineHud row={hudRow} layout="block" />
              <div className="kline-panel__scale-grid" aria-label="感情 K 线四条时间线">
                {relationshipScaleEntries.map(({ value, label, series: scaleSeries, rows: scaleRows }) => (
                  <article key={value} className={`kline-panel__scale-card ${scale === value ? "is-selected" : ""}`}>
                    <div className="kline-panel__scale-card-head">
                      <strong>{label}</strong>
                      <span>20 点 · {scaleSeries.sourceCount} 张盘</span>
                    </div>
                    <KLineChart
                      rows={scaleRows}
                      height={COMPACT_CHART_HEIGHT}
                      variant="compact"
                      selectedIndex={scale === value ? selectedIndex : undefined}
                      onSelect={(index) => { setScale(value); setPickedIndex(index); }}
                      onHover={setHovered}
                      ariaLabel={`${label}感情 K 线`}
                    />
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="kline-panel__plot-wrap">
                <KLineChart
                  rows={rows}
                  height={FULL_CHART_HEIGHT}
                  variant="full"
                  now={now}
                  selectedIndex={selectedIndex}
                  onSelect={setPickedIndex}
                  onHover={setHovered}
                  ariaLabel="八字人生趋势 OHLC 蜡烛图"
                />
                <KLineHud row={hovered} />
              </div>
              <KLineLegend />
            </>
          )}
          {selected ? <div className="kline-panel__detail"><div><strong>{selected.label}</strong><span>变化 {selected.delta >= 0 ? "+" : ""}{selected.delta} · {selected.keyPoint || "常规点"}</span></div><div className="kline-panel__ohlc" aria-label="所选 K 线开高低收"><span>开 <b>{selected.open}</b></span><span>高 <b>{selected.high}</b></span><span>低 <b>{selected.low}</b></span><span>收 <b>{selected.close}</b></span></div><p>{selected.prediction}</p><div className="kline-panel__evidence">{selected.evidence.map((item) => <span key={item}>{item}</span>)}</div></div> : null}
          {kind === "life" && markers.length ? <div className="kline-panel__markers" aria-label="人生 K 线拐点与拉升说明"><div className="kline-panel__markers-head"><strong>拐点与拉升</strong><span>规则识别 · 原因可复核</span></div>{markers.slice(0, 8).map(({ point, marker }) => <button type="button" key={`marker-${point.index}`} className={`kline-panel__marker-row is-${marker.kind}`} onClick={() => setPickedIndex(point.index)}><b>{marker.label}</b><span>{point.datetime.slice(0, 4)} · {point.label}</span><em>{marker.reason}</em></button>)}</div> : null}
          <div className="kline-panel__keypoints"><strong>关键点</strong>{series.keyPoints.map((point) => <button type="button" key={`${point.datetime}-${point.index}`} onClick={() => setPickedIndex(point.index)}><span>{point.datetime.replace("T", " ")}</span><b>{point.score}</b><em>{point.keyPoint}</em></button>)}</div>
          {kind === "life" ? <KLineTextTable rows={rows} now={now} /> : null}
          <div className="kline-panel__ai"><div><strong>AI 三线取象</strong><span>{kind === "life" ? "从大运、流年与阶段趋势推演上／中／下三档人生世界线" : "从奇门关系结构推演上／中／下三档感情世界线"}</span><small>每条世界线都给出触发条件、时间窗、行动建议与复盘边界。</small></div><button type="button" className="kline-panel__ai-button" onClick={() => onAnalyze(kind, kind === "relationship" ? scale : undefined)} disabled={loading}><Sparkles size={16} />{loading ? "正在生成" : `解锁三条世界线 · ${aiPriceLabel}`}</button></div>
          {aiError ? <p className="kline-panel__error">{aiError}</p> : null}
          {aiContent && aiKind === kind ? <section className="kline-panel__ai-report" aria-label={`${kind === "life" ? "人生" : "感情"} K线 AI 三条世界线报告`}><div><span>AI WORLDLINE REPORT · 上／中／下</span><strong>{kind === "life" ? "人生 K 线 · 三条世界线" : "感情 K 线 · 三条世界线"}</strong></div><pre className="kline-panel__ai-result">{aiContent}</pre></section> : null}
          <p className="kline-panel__disclaimer">{series.disclaimer}</p>
        </>
      )}
    </section>
  );
}
