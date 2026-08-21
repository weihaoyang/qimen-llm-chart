"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { KlineKind, KlinePoint, KlineScale, KlineSeries } from "@/lib/qimen/kline";
import { groupLifeKlineBands, movingAverage } from "@/lib/kline/life-kline-reading";

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
};

const width = 920;
const height = 270;
const xFor = (index: number, count: number) => (count <= 1 ? width / 2 : 22 + index * ((width - 44) / (count - 1)));
const yFor = (score: number) => height - 28 - (score / 100) * (height - 55);
const candleWidthFor = (count: number) => Math.max(3, Math.min(18, ((width - 44) / Math.max(count, 1)) * 0.62));

const pathFor = (values: readonly (number | null)[], count: number) => values
  .map((value, index) => value === null ? null : `${index === 0 || values[index - 1] === null ? "M" : "L"} ${xFor(index, count)} ${yFor(value)}`)
  .filter(Boolean)
  .join(" ");

function TrendPlot({ points, onSelect, life = false }: { points: KlinePoint[]; onSelect: (point: KlinePoint) => void; life?: boolean }) {
  const candleWidth = candleWidthFor(points.length);
  const ma5 = useMemo(() => movingAverage(points, 5), [points]);
  const ma10 = useMemo(() => movingAverage(points, 10), [points]);
  const bands = useMemo(() => life ? groupLifeKlineBands(points) : [], [life, points]);
  return (
    <div className="kline-panel__plot-wrap">
      <svg className="kline-panel__plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={life ? "八字人生趋势 OHLC 蜡烛图" : "奇门序列盘感情 OHLC 蜡烛图"}>
        {bands.map((band, index) => {
          const start = xFor(band.startIndex, points.length);
          const end = xFor(band.endIndex, points.length);
          return <g key={`${band.label}-${band.startIndex}`}>
            <rect x={Math.max(22, start - candleWidth)} y="18" width={Math.max(candleWidth * 2, end - start + candleWidth * 2)} height={height - 46} className={`kline-panel__dayun-band is-${index % 2}`} />
            <text x={start + Math.max(candleWidth, (end - start) / 2)} y="15" textAnchor="middle" className="kline-panel__dayun-label">{band.label}</text>
          </g>;
        })}
        {[20, 40, 60, 80].map((score) => <line key={score} x1="22" x2={width - 22} y1={yFor(score)} y2={yFor(score)} className="kline-panel__grid" />)}
        {life ? <><path d={pathFor(ma10, points.length)} className="kline-panel__ma kline-panel__ma--10" /><path d={pathFor(ma5, points.length)} className="kline-panel__ma kline-panel__ma--5" /></> : null}
        {points.map((point, index) => (
          <g key={`${point.datetime}-${index}`} className={`kline-panel__candle ${point.close >= point.open ? "is-up" : "is-down"}`} role="button" tabIndex={0} aria-label={`${point.datetime}：开 ${point.open}，高 ${point.high}，低 ${point.low}，收 ${point.close}`} onClick={() => onSelect(point)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect(point)}>
            <line x1={xFor(index, points.length)} x2={xFor(index, points.length)} y1={yFor(point.high)} y2={yFor(point.low)} className="kline-panel__candle-wick" />
            <rect x={xFor(index, points.length) - candleWidth / 2} y={Math.min(yFor(point.open), yFor(point.close))} width={candleWidth} height={Math.max(2, Math.abs(yFor(point.open) - yFor(point.close)))} className="kline-panel__candle-body" />
            {index % Math.max(1, Math.ceil(points.length / 8)) === 0 ? <text x={xFor(index, points.length)} y={height - 7} textAnchor="middle" className="kline-panel__axis">{point.datetime.slice(5, 10)}</text> : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function KlinePanel({ life, relationship, relationshipScales, aiContent, aiKind, aiError, loading, onAnalyze, aiPriceLabel = "¥29.90" }: KlinePanelProps) {
  const [kind, setKind] = useState<KlineKind>("life");
  const [scale, setScale] = useState<KlineScale>("double-hour");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const series = kind === "life" ? life : relationshipScales?.[scale] ?? relationship;
  const selected = series.points[selectedIndex] ?? series.points.at(-1);
  const visiblePoints = useMemo(() => series.points.slice(0, 120), [series.points]);
  const relationshipScaleEntries = useMemo(
    () =>
      (["double-hour", "day", "month", "year"] as const).map((value) => ({
        value,
        label: value === "double-hour" ? "时辰线" : value === "day" ? "日线" : value === "month" ? "月线" : "年线",
        series: relationshipScales?.[value] ?? relationship,
      })),
    [relationship, relationshipScales],
  );

  return (
    <section className="kline-panel" aria-label={kind === "life" ? "八字人生 K 线" : "奇门序列盘感情 K 线"}>
      <div className="kline-panel__header">
        <div>
          <span className="kline-panel__eyebrow">规则版 · 免费 · 条件趋势</span>
          <h2>{series.title}</h2>
          <p>{series.methodology}</p>
        </div>
        <div className="kline-panel__switch" role="tablist" aria-label="K线类型">
          <button type="button" className={kind === "life" ? "is-active" : ""} onClick={() => { setKind("life"); setSelectedIndex(0); }}>人生</button>
          <button type="button" className={kind === "relationship" ? "is-active" : ""} onClick={() => { setKind("relationship"); setSelectedIndex(0); }}>感情</button>
        </div>
      </div>
      {kind === "relationship" ? <div className="kline-panel__scales" role="tablist" aria-label="感情 K 线时间尺度">
        {(["double-hour", "day", "month", "year"] as const).map((value) => <button key={value} type="button" className={scale === value ? "is-active" : ""} onClick={() => { setScale(value); setSelectedIndex(0); }}>{value === "double-hour" ? "时辰线 · 20" : value === "day" ? "日线 · 20" : value === "month" ? "月线 · 20" : "年线 · 20"}</button>)}
      </div> : null}
      {series.points.length < 2 ? (
        <div className="kline-panel__empty">先在“调整盘面”中选择序列，生成至少 2 张盘。</div>
      ) : (
        <>
          <div className="kline-panel__stats"><strong>{selected?.score ?? 0}</strong><span>当前条件分</span><em className={`is-${selected?.phase === "上行" ? "up" : selected?.phase === "下行" ? "down" : "flat"}`}>{selected?.phase}</em><small>{series.sourceCount} 张序列盘</small></div>
          {kind === "relationship" ? (
            <div className="kline-panel__scale-grid" aria-label="感情 K 线四条时间线">
              {relationshipScaleEntries.map(({ value, label, series: scaleSeries }) => (
                <article key={value} className={`kline-panel__scale-card ${scale === value ? "is-selected" : ""}`}>
                  <div className="kline-panel__scale-card-head">
                    <strong>{label}</strong>
                    <span>20 点 · {scaleSeries.sourceCount} 张盘</span>
                  </div>
                  <TrendPlot points={scaleSeries.points.slice(0, 20)} onSelect={(point) => { setScale(value); setSelectedIndex(point.index); }} />
                </article>
              ))}
            </div>
          ) : <TrendPlot points={visiblePoints} life onSelect={(point) => setSelectedIndex(point.index)} />}
          {selected ? <div className="kline-panel__detail"><div><strong>{selected.label}</strong><span>变化 {selected.delta >= 0 ? "+" : ""}{selected.delta} · {selected.keyPoint || "常规点"}</span></div><div className="kline-panel__ohlc" aria-label="所选 K 线开高低收"><span>开 <b>{selected.open}</b></span><span>高 <b>{selected.high}</b></span><span>低 <b>{selected.low}</b></span><span>收 <b>{selected.close}</b></span></div><p>{selected.prediction}</p><div className="kline-panel__evidence">{selected.evidence.map((item) => <span key={item}>{item}</span>)}</div></div> : null}
          <div className="kline-panel__keypoints"><strong>关键点</strong>{series.keyPoints.map((point) => <button type="button" key={`${point.datetime}-${point.index}`} onClick={() => setSelectedIndex(point.index)}><span>{point.datetime.replace("T", " ")}</span><b>{point.score}</b><em>{point.keyPoint}</em></button>)}</div>
          <div className="kline-panel__ai"><div><strong>AI 三线取象</strong><span>{kind === "life" ? "从大运、流年与阶段趋势推演上／中／下三档人生世界线" : "从奇门关系结构推演上／中／下三档感情世界线"}</span><small>每条世界线都给出触发条件、时间窗、行动建议与复盘边界。</small></div><button type="button" className="kline-panel__ai-button" onClick={() => onAnalyze(kind, kind === "relationship" ? scale : undefined)} disabled={loading}><Sparkles size={16} />{loading ? "正在生成" : `解锁三条世界线 · ${aiPriceLabel}`}</button></div>
          {aiError ? <p className="kline-panel__error">{aiError}</p> : null}
          {aiContent && aiKind === kind ? <section className="kline-panel__ai-report" aria-label={`${kind === "life" ? "人生" : "感情"} K线 AI 三条世界线报告`}><div><span>AI WORLDLINE REPORT · 上／中／下</span><strong>{kind === "life" ? "人生 K 线 · 三条世界线" : "感情 K 线 · 三条世界线"}</strong></div><pre className="kline-panel__ai-result">{aiContent}</pre></section> : null}
          <p className="kline-panel__disclaimer">{series.disclaimer}</p>
        </>
      )}
    </section>
  );
}
