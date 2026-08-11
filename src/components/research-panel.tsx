"use client";

import { useMemo, useState } from "react";
import Tabs from "@douyinfe/semi-ui/lib/es/tabs";
import type { ResearchTool, ResearchWorkspaceData, LifeTrendPoint, VerificationStatus } from "@/lib/research/types";

type ResearchPanelProps = {
  data: ResearchWorkspaceData | null;
  tool: ResearchTool;
  onToolChange: (tool: ResearchTool) => void;
};

const TOOL_OPTIONS: Array<{ value: ResearchTool; label: string; hint: string }> = [
  { value: "trend", label: "人生趋势", hint: "大运与流年的结构波动" },
  { value: "verification", label: "算法核验", hint: "主引擎与参考引擎逐字段对照" },
  { value: "daliuren", label: "大六壬", hint: "天地盘 · 四课 · 三传" },
  { value: "taiyi", label: "太乙", hint: "日盘九星与判断锚点" },
];

const statusLabel: Record<VerificationStatus, string> = {
  match: "一致",
  difference: "差异",
  unavailable: "待提供",
};

function TrendChart({ points }: { points: LifeTrendPoint[] }) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const visible = useMemo(() => {
    if (points.length <= 42) return points;
    const current = new Date().getFullYear();
    const index = Math.max(0, points.findIndex((point) => point.year >= current));
    return points.slice(Math.max(0, index - 18), Math.min(points.length, index + 24));
  }, [points]);
  const selected = visible.find((point) => point.year === selectedYear) ?? visible[Math.floor(visible.length / 2)];
  const width = 900;
  const height = 300;
  const x = (index: number) => (visible.length <= 1 ? width / 2 : (index / (visible.length - 1)) * (width - 36) + 18);
  const y = (value: number) => height - 24 - (value / 100) * (height - 42);

  return (
    <div className="research-trend">
      <div className="research-trend__legend">
        <div><strong>结构波动指数</strong><span>不是财富、健康或事件概率</span></div>
        <span>{visible.length} 个运年点 · 点击 K 线查看证据</span>
      </div>
      <div className="research-trend__chart-wrap">
        <svg className="research-trend__chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="人生趋势结构波动 K 线">
          {[20, 40, 60, 80].map((value) => <line key={value} x1="18" x2={width - 18} y1={y(value)} y2={y(value)} className="research-trend__grid" />)}
          {visible.map((point, index) => {
            const selectedPoint = selected?.year === point.year;
            const rising = point.close >= point.open;
            return <g key={`${point.year}-${point.ganZhi}`} className={selectedPoint ? "is-selected" : ""} onClick={() => setSelectedYear(point.year)}>
              <line x1={x(index)} x2={x(index)} y1={y(point.high)} y2={y(point.low)} className={rising ? "research-trend__wick is-up" : "research-trend__wick is-down"} />
              <rect x={x(index) - 4} y={Math.min(y(point.open), y(point.close))} width="8" height={Math.max(4, Math.abs(y(point.close) - y(point.open)))} rx="1" className={rising ? "research-trend__candle is-up" : "research-trend__candle is-down"} />
              {index % Math.max(1, Math.floor(visible.length / 10)) === 0 ? <text x={x(index)} y={height - 5} textAnchor="middle" className="research-trend__axis">{point.year}</text> : null}
            </g>;
          })}
        </svg>
      </div>
      {selected ? <div className="research-trend__detail">
        <div className="research-trend__detail-head"><strong>{selected.year} · {selected.age}岁 · {selected.ganZhi}</strong><span>大运 {selected.dayunGanZhi}（{selected.dayunStartYear} 起）</span></div>
        <div className="research-trend__ohlc"><span>开 {selected.open}</span><span>高 {selected.high}</span><span>低 {selected.low}</span><span>收 {selected.close}</span></div>
        <div className="research-trend__signals">{selected.signals.map((signal) => <span key={signal.text} className={signal.kind === "support" ? "is-support" : "is-review"}>{signal.kind === "support" ? "支持" : "待核"} · {signal.text}</span>)}</div>
      </div> : null}
    </div>
  );
}

function JsonDisclosure({ value }: { value: unknown }) {
  return <details className="research-raw"><summary>查看原始 JSON</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
}

export function ResearchPanel({ data, tool, onToolChange }: ResearchPanelProps) {
  if (!data) return <section className="research-panel empty-panel">研究资料暂未生成，请先检查输入的日期时间与地点。</section>;
  return <section className="research-panel" aria-label="术数研究工具">
    <div className="research-panel__header"><div><span className="research-panel__eyebrow">研究工作台 · 可复核输出</span><h2>把盘面变成可检查的证据</h2></div><span className="research-panel__scope">不替代现实决策</span></div>
    <Tabs type="card" activeKey={tool} onChange={(key) => onToolChange(key as ResearchTool)} className="research-panel__tabs">
      {TOOL_OPTIONS.map((option) => <Tabs.TabPane key={option.value} itemKey={option.value} tab={<span>{option.label}</span>} />)}
    </Tabs>
    <div className="research-panel__hint">{TOOL_OPTIONS.find((option) => option.value === tool)?.hint}</div>
    {tool === "trend" ? <TrendChart points={data.trend.points} /> : null}
    {tool === "verification" ? <div className="research-verification"><div className="research-verification__note">{data.verification.disclaimer}</div><div className="research-verification__table" role="table"><div className="research-verification__row is-head" role="row"><span>系统 / 字段</span><span>主引擎</span><span>参考引擎</span><span>状态</span></div>{data.verification.rows.map((row) => <div className="research-verification__row" role="row" key={`${row.system}-${row.field}`}><span><strong>{row.system}</strong><small>{row.field}</small></span><span>{row.primary}</span><span>{row.reference}</span><span className={`status-${row.status}`}>{statusLabel[row.status]}</span><div className="research-verification__note-cell">{row.note}</div></div>)}</div></div> : null}
    {tool === "daliuren" ? <div className="research-classic"><div className="research-classic__grid">{Object.entries(data.daliuren?.json as Record<string, unknown> ?? {}).slice(0, 3).map(([key, value]) => <article key={key}><h3>{key}</h3><pre>{JSON.stringify(value, null, 2)}</pre></article>)}</div><JsonDisclosure value={data.daliuren?.json} /></div> : null}
    {tool === "taiyi" ? <div className="research-classic"><div className="research-classic__grid">{Object.entries(data.taiyi?.json as Record<string, unknown> ?? {}).map(([key, value]) => <article key={key}><h3>{key}</h3><pre>{JSON.stringify(value, null, 2)}</pre></article>)}</div><JsonDisclosure value={data.taiyi?.json} /></div> : null}
  </section>;
}
