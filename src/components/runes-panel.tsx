"use client";

import { AETTIR, SPREADS, SPREAD_IDS, type SpreadId } from "@/lib/runes/data";
import type { RuneReading } from "@/lib/runes/draw";
import { NINE_WORLDS } from "@/lib/runes/nine-worlds";
import { ProvenanceBlock } from "./provenance-block";

export function RunesPanel({ reading, onSpreadChange, onRedraw, onCopyJson, jsonCopied }: { reading: RuneReading; onSpreadChange?: (id: SpreadId) => void; onRedraw?: () => void; onCopyJson?: () => void; jsonCopied?: boolean }) {
  return (
    <section className="divination-panel divination-panel--runes" aria-label="卢恩符文">
      <div className="divination-panel__topline"><span>ELDER FUTHARK / 09</span><span className="status status--live">{reading.draws.length} RUNES</span></div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">RUNES &amp; NINE WORLDS</p>
          <h2>卢恩符文 · 北欧九界</h2>
          <p className="divination-panel__subhead">{reading.spread.name} —— {reading.spread.tagline}</p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? <button type="button" className="divination-panel__export" onClick={onCopyJson}>复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span></button> : null}
          {onRedraw ? <button type="button" className="divination-panel__action" onClick={onRedraw}><span>↻</span>重新抽取</button> : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="rune-selector" role="group" aria-label="选择牌阵">
        {SPREAD_IDS.map((id) => (
          <button key={id} type="button" className={id === reading.spreadId ? "is-active" : undefined} aria-pressed={id === reading.spreadId} onClick={() => onSpreadChange?.(id)}>{SPREADS[id].name}<small>{SPREADS[id].short}</small></button>
        ))}
      </div>

      <div className="rune-board" style={{ "--rune-cols": reading.spread.cols } as React.CSSProperties}>
        {reading.draws.map((draw, index) => {
          const position = reading.spread.positions[index];
          return (
            <article className={`rune-card ${draw.orientation === "reversed" ? "is-reversed" : ""}`} key={`${position.name}-${draw.rune.id}`} style={{ gridColumn: position.col, gridRow: position.row }}>
              <div className="rune-card__top"><small>{position.name}</small><em>{AETTIR[draw.rune.aett].name.split("'")[0]}</em></div>
              <svg className="rune-card__glyph" viewBox="0 0 40 64" role="img" aria-label={`${draw.rune.name}（${draw.orientation === "reversed" ? "逆位" : "正位"}）`}>
                <g transform={draw.orientation === "reversed" ? "rotate(180 20 32)" : undefined}>
                  <path d={draw.rune.path} />
                </g>
              </svg>
              <strong>{draw.rune.name} <b>{draw.rune.char}</b></strong>
              <span className="rune-card__meta">{draw.orientation === "reversed" ? "逆位" : "正位"} · 读音 {draw.rune.sound} · {draw.rune.lore}</span>
              <p className="rune-card__keywords">{draw.rune.keywords.join(" · ")}</p>
              <p className="rune-card__meaning">{draw.orientation === "reversed" ? draw.rune.reversed : draw.rune.upright}</p>
              <p className="rune-card__advice">建议：{draw.rune.advice}</p>
            </article>
          );
        })}
      </div>

      <div className="divination-section-heading"><span>九界 · YGGDRASIL</span><small>{NINE_WORLDS.length} 界 / 三层</small></div>
      <div className="nine-worlds">
        {(["上", "中", "下"] as const).map((level) => (
          <div className="nine-worlds__level" key={level}>
            <b>{level}</b>
            <div>
              {NINE_WORLDS.filter((world) => world.level === level).map((world) => (
                <span key={world.id}><i>{world.nameZh}</i><small>{world.name} · {world.residents}</small></span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>符文与九界属神话与象征体系（符文数据移植自 MIT 项目 evoluteur/rune-reading）；抽符为反思提示，不是预测，也不作医疗、心理或现实裁决。</p>
      <ProvenanceBlock system="runes" />
    </section>
  );
}
