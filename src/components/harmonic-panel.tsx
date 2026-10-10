"use client";

import type { HarmonicChart } from "@/lib/harmonic/chart";
import { HarmonicWheel } from "./harmonic-wheel";
import { ProvenanceBlock } from "./provenance-block";

const PRESETS = [1, 4, 5, 7, 9, 16, 24, 36];

export function HarmonicPanel({ value, onHarmonicChange, onCopyJson, jsonCopied }: { value: HarmonicChart; onHarmonicChange?: (value: number) => void; onCopyJson?: () => void; jsonCopied?: boolean }) {
  const all = [...value.points, ...value.angles];
  return (
    <section className="divination-panel divination-panel--harmonic" aria-label="谐波占星">
      <div className="divination-panel__topline"><span>HARMONICS / 05</span><span className={value.complete ? "status status--live" : "status"}>H{value.harmonic}</span></div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">HARMONIC / OVERTONE CHART</p>
          <h2>泛音星盘</h2>
          <p className="divination-panel__subhead">h = (黄经 × {value.harmonic}) mod 360：把母盘中相隔 360°/{value.harmonic}（≈{(360 / value.harmonic).toFixed(2)}°）的点拉直成合相。</p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? <button type="button" className="divination-panel__export" onClick={onCopyJson}>复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span></button> : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="harmonic-selector" role="group" aria-label="选择谐波数">
        {PRESETS.map((harmonic) => (
          <button key={harmonic} type="button" className={harmonic === value.harmonic ? "is-active" : undefined} aria-pressed={harmonic === value.harmonic} onClick={() => onHarmonicChange?.(harmonic)}>H{harmonic}</button>
        ))}
        <label className="harmonic-selector__custom">自定义<input type="number" min={1} max={36} value={value.harmonic} onChange={(event) => onHarmonicChange?.(Number(event.target.value))} aria-label="自定义谐波数" /></label>
      </div>

      <div className="bodygraph-layout">
        <div className="bodygraph-stage"><HarmonicWheel harmonic={value.harmonic} points={all} /></div>
        <aside className="bodygraph-inspector">
          <span className="visual-kicker">HARMONIC READOUT</span>
          <h3>第 {value.harmonic} 谐波</h3>
          <p className="visual-copy">在 H{value.harmonic} 里，母盘相隔 {Number((360 / value.harmonic).toFixed(3))}° 及其倍数的两点会叠成合相；这是把 quintile / septile 这类次要相位拉直来看的方法。</p>
          <div className="visual-aspects">
            {value.conjunctions.slice(0, 8).map((item) => (
              <div key={`${item.a}-${item.b}`}><b>{item.a} / {item.b}</b><span>{item.harmonicOrb}° · 母盘 {item.natalAngle}° ±{item.natalOrb}°</span></div>
            ))}
            {!value.conjunctions.length ? <div><b>无叠合</b><span>容许度 {value.orb}° 内没有合相</span></div> : null}
          </div>
        </aside>
      </div>

      <div className="divination-section-heading"><span>POSITIONS</span><small>母盘黄经 → 第 {value.harmonic} 谐波</small></div>
      <div className="harmonic-table">
        {all.map((point, index) => (
          <div className="harmonic-row" key={point.name} style={{ "--item-index": index } as React.CSSProperties}>
            <b>{point.name}</b>
            <span>{point.natalLongitude.toFixed(2)}°</span>
            <strong>{point.sign} {point.degree}°</strong>
          </div>
        ))}
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{value.disclaimer}</p>
      <ProvenanceBlock system="harmonic" />
    </section>
  );
}
