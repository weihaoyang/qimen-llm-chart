"use client";

import type { AkashaChart } from "@/lib/akasha/chart";
import { AKASHA_CONCEPTS, AKASHA_ETHICS, AKASHA_PROTOCOL, AKASHA_TIMELINE, ANALOGY_NOTES, HOLOGRAM_CONCEPTS, MASS_PRESETS } from "@/lib/akasha/data";
import { ProvenanceBlock } from "./provenance-block";

const sci = (value: number, digits = 3) => value.toExponential(digits);

function Bars({ values, label, note }: { values: number[]; label: string; note: string }) {
  const max = Math.max(...values.map((value) => Math.abs(value)), 1e-9);
  return (
    <div className="akasha-bars">
      <div className="akasha-bars__head"><b>{label}</b><em>{note}</em></div>
      <div className="akasha-bars__row">
        {values.map((value, index) => (
          <span key={index} style={{ height: `${Math.max(1, (Math.abs(value) / max) * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function AkashaPanel({
  chart,
  massInput,
  onMassChange,
  sourceCount,
  onSourceCountChange,
  fragment,
  onFragmentChange,
  onCopyJson,
  jsonCopied,
}: {
  chart: AkashaChart;
  massInput: string;
  onMassChange?: (value: string) => void;
  sourceCount: number;
  onSourceCountChange?: (value: number) => void;
  fragment: number;
  onFragmentChange?: (value: number) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const h = chart.holographic;
  const d = chart.demo;

  return (
    <section className="divination-panel divination-panel--akasha" aria-label="阿卡西记录与全息宇宙">
      <div className="divination-panel__topline">
        <span>AKASHIC RECORDS / HOLOGRAPHIC UNIVERSE</span>
        <span className="status status--live">AREA LAW 1/4 ℓP²</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">可算物理 · 知识条目 · 边界</p>
          <h2>阿卡西记录 · 全息宇宙</h2>
          <p className="divination-panel__subhead">
            面积律 {sci(h.bits)} 比特 · 史瓦西半径 {sci(h.schwarzschildRadiusM)} m · 碎片重建相关系数 {d.correlation}（分辨率 ≈ ×{d.resolution}）
          </p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? (
            <button type="button" className="divination-panel__export" onClick={onCopyJson}>
              复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span>
            </button>
          ) : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="akasha-controls">
        <label>质量（kg）<input type="text" value={massInput} onChange={(event) => onMassChange?.(event.target.value)} /></label>
        <div className="rune-selector" role="group" aria-label="质量预设">
          {MASS_PRESETS.map((preset) => (
            <button key={preset.label} type="button" onClick={() => onMassChange?.(String(preset.massKg))}>{preset.label}</button>
          ))}
        </div>
        <label>点源数
          <div className="rune-selector">
            {[1, 2, 3, 5, 9].map((value) => (
              <button key={value} type="button" className={value === sourceCount ? "is-active" : undefined} aria-pressed={value === sourceCount} onClick={() => onSourceCountChange?.(value)}>{value}</button>
            ))}
          </div>
        </label>
        <label>碎片比例
          <div className="rune-selector">
            {[0.05, 0.1, 0.25, 0.5, 1].map((value) => (
              <button key={value} type="button" className={value === fragment ? "is-active" : undefined} aria-pressed={value === fragment} onClick={() => onFragmentChange?.(value)}>{value === 1 ? "整幅" : `${Math.round(value * 100)}%`}</button>
            ))}
          </div>
        </label>
      </div>

      <div className="divination-section-heading"><span>全息物理 · 可算</span><small>标准式，可复核</small></div>
      <div className="akasha-facts">
        <div><span>史瓦西半径</span><b>{sci(h.schwarzschildRadiusM)} m</b><em>r_s = 2GM/c²</em></div>
        <div><span>视界面积</span><b>{sci(h.horizonAreaM2)} m²</b><em>A = 4πr_s²</em></div>
        <div><span>面积律信息量</span><b>{sci(h.bits)} 比特</b><em>S = k_B·A/(4ℓ_P²)</em></div>
        <div><span>熵</span><b>{sci(h.entropyJK)} J/K</b><em>只由面积决定</em></div>
        <div><span>体积律对照</span><b>{sci(h.volumeBits)} 比特</b><em>1 比特 / 普朗克体积</em></div>
        <div><span>面积律小多少倍</span><b>{sci(h.areaVsVolume)}</b><em>体积律 ÷ 面积律</em></div>
        <div><span>贝肯斯坦界</span><b>{h.bekensteinBits ? `${sci(h.bekensteinBits)} 比特` : "—"}</b><em>S ≤ 2πk_BRE/(ħc)，R=1 m、E=mc²（比特 = nats / ln2）</em></div>
        <div><span>普朗克尺度</span><b>ℓ_P = {sci(1.616255e-35)} m</b><em>1 比特 = 4ℓ_P²</em></div>
      </div>

      <div className="divination-section-heading"><span>典型质量对照</span><small>面积律信息量</small></div>
      <div className="akasha-table">
        <div className="akasha-table__row akasha-table__row--head"><b>对象</b><b>质量 kg</b><b>r_s m</b><b>信息量 比特</b><b>熵 J/K</b></div>
        {chart.table.map((row) => (
          <div className="akasha-table__row" key={row.label}>
            <span>{row.label}</span>
            <span>{sci(row.massKg, 2)}</span>
            <span>{sci(row.schwarzschildRadiusM, 2)}</span>
            <span>{sci(row.bits, 3)}</span>
            <span>{sci(row.entropyJK, 2)}</span>
          </div>
        ))}
      </div>

      <div className="divination-section-heading"><span>全息碎片重建 · 傅里叶演示</span><small>点源 {chart.input.sourceCount} · 碎片 {Math.round(d.usableFraction * 100)}%</small></div>
      <div className="akasha-demo">
        <Bars values={d.hologram} label="① 全息图（干涉强度 H(u)）" note="由点源生成" />
        <Bars values={d.full} label="② 整幅重建" note={`峰：${d.peaksFull.map((peak) => peak.x).join("、") || "—"}`} />
        <Bars values={d.fragment} label="③ 碎片重建" note={`峰：${d.peaksFragment.map((peak) => peak.x).join("、") || "—"}`} />
        <p className="akasha-note">
          碎片只保留全息图的 {Math.round(d.usableFraction * 100)}%，重建的**峰位与整幅一致**（全部物点都在），但主峰幅值按碎片比例下降、峰变宽——
          分辨率受碎片大小限制（≈ ×{d.resolution}），相关系数 {d.correlation}。整幅与碎片都会出现源间互调产生的鬼峰（参考光越强越弱）。
          这就是「部分含整体」在全息记录上的确切含义：可重建，但不是无损，也不是「读取一切」。
        </p>
      </div>

      <div className="divination-section-heading"><span>自相似 · 分形维数</span><small>D = log(份数)/log(比例)</small></div>
      <div className="akasha-table">
        <div className="akasha-table__row akasha-table__row--head"><b>分形</b><b>份数</b><b>比例</b><b>D</b></div>
        {chart.fractals.map((row) => (
          <div className="akasha-table__row" key={row.zh}>
            <span>{row.zh}</span>
            <span>{row.copies}</span>
            <span>1/{row.ratio}</span>
            <span>{row.dimension}</span>
          </div>
        ))}
      </div>

      <div className="divination-section-heading"><span>阿卡西记录 · 知识条目</span><small>本仓不提供任何「读取」</small></div>
      <div className="akasha-concepts">
        {AKASHA_CONCEPTS.map((entry) => (
          <article className="akasha-concept" key={entry.term}>
            <header><b>{entry.zh}</b><em>{entry.term}</em></header>
            <span>{entry.tradition} · {entry.period}</span>
            <p>{entry.note}</p>
          </article>
        ))}
      </div>

      <div className="akasha-two">
        <div>
          <div className="divination-section-heading"><span>被记载的实践步骤</span><small>描述性</small></div>
          <ol className="akasha-steps">
            {AKASHA_PROTOCOL.map((step) => (
              <li key={step.step}><b>{step.step}</b><span>{step.note}</span></li>
            ))}
          </ol>
        </div>
        <div>
          <div className="divination-section-heading"><span>时间线</span><small>来源与分期</small></div>
          <div className="akasha-timeline">
            {AKASHA_TIMELINE.map(([year, note]) => (
              <div key={year}><b>{year}</b><span>{note}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="divination-section-heading"><span>全息宇宙概念 · 可算性</span><small>物理 / 哲学 / 假说</small></div>
      <div className="akasha-table">
        <div className="akasha-table__row akasha-table__row--head"><b>概念</b><b>时期</b><b>可算性</b><b>要点</b></div>
        {HOLOGRAM_CONCEPTS.map((entry) => (
          <div className="akasha-table__row akasha-table__row--wide" key={entry.term}>
            <span>{entry.zh}<small>{entry.term}</small></span>
            <span>{entry.period}</span>
            <span>{entry.computed}</span>
            <span>{entry.note}</span>
          </div>
        ))}
      </div>

      <div className="akasha-ethics">
        <div className="divination-section-heading"><span>伦理与边界</span><small>硬约束</small></div>
        <ul>{AKASHA_ETHICS.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        <div className="akasha-analogy">{ANALOGY_NOTES.map((entry) => <p key={entry}>{entry}</p>)}</div>
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{chart.disclaimer}</p>

      <ProvenanceBlock system="akasha" />
    </section>
  );
}
