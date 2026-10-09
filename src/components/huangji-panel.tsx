"use client";

import { EPOCH_BCE_YEAR, type HuangjiChronology } from "@/lib/huangji/chronology";

export function HuangjiPanel({ value, yearInput, yearError, onYearChange, onCopyJson, jsonCopied }: { value: HuangjiChronology; yearInput: string; yearError?: boolean; onYearChange?: (value: string) => void; onCopyJson?: () => void; jsonCopied?: boolean }) {
  const blocks = [
    { key: "yuan", label: "元", main: `第 ${value.yuan.number} 元`, sub: `${value.yuan.stem} · 元内第 ${value.yuan.year} 年` },
    { key: "hui", label: "会", main: `第 ${value.hui.number} 会`, sub: `${value.hui.branch} · 会内第 ${value.hui.year} 年` },
    { key: "yun", label: "运", main: `第 ${value.yun.number} 运`, sub: `${value.yun.stem} · 会内第 ${value.yun.numberWithinHui}` },
    { key: "shi", label: "世", main: `第 ${value.shi.number} 世`, sub: `${value.shi.branch} · 运内第 ${value.shi.numberWithinYun} · 世内第 ${value.shi.year} 年` },
  ];
  return (
    <section className="divination-panel divination-panel--huangji" aria-label="皇极经世">
      <div className="divination-panel__topline"><span>HUANGJI JINGSHI / 06</span><span className="status status--live">{value.sexagenaryYear.name}</span></div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">SHAO YONG / YUAN-HUI-YUN-SHI</p>
          <h2>皇极经世</h2>
          <p className="divination-panel__subhead">一元 = 12 会 = 360 运 = 4320 世 = 129600 年；纪元取公元前 {EPOCH_BCE_YEAR} 年为甲子。</p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? <button type="button" className="divination-panel__export" onClick={onCopyJson}>复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span></button> : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="huangji-year">
        <label>目标年份<input value={yearInput} onChange={(event) => onYearChange?.(event.target.value)} aria-label="皇极经世目标年份" placeholder="如 2026 或 前87年" aria-invalid={yearError ? "true" : undefined} /></label>
        {yearError ? <span className="huangji-year__error">无法识别该年份，显示的是上一个有效结果。</span> : <span>公元纪年、无公元 0 年；可写「2026」「前87年」「-87」。</span>}
      </div>

      <div className="huangji-grid">
        {blocks.map((block, index) => (
          <div className="huangji-cell" key={block.key} style={{ "--item-index": index } as React.CSSProperties}>
            <small>{block.label}</small>
            <strong>{block.main}</strong>
            <span>{block.sub}</span>
          </div>
        ))}
      </div>

      <div className="divination-section-heading"><span>POSITION</span><small>距纪元第 {value.ordinalFromEpoch} 年 · 天文纪年 {value.astronomicalYear}</small></div>
      <div className="huangji-detail">
        <div><b>年干支</b><span>{value.sexagenaryYear.name}（六十甲子第 {value.sexagenaryYear.index}）</span></div>
        <div><b>元干</b><span>{value.yuan.stem}</span></div>
        <div><b>会支</b><span>{value.hui.branch}</span></div>
        <div><b>运干</b><span>{value.yun.stem}</span></div>
        <div><b>世支</b><span>{value.shi.branch}</span></div>
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{value.disclaimer}</p>
    </section>
  );
}
