"use client";

import { LETTERS, SEPHIROT, WORLDS } from "@/lib/qabalah/data";
import type { QabalahReading } from "@/lib/qabalah/chart";
import { ALPHABET, FINAL_TO_BASE } from "@/lib/qabalah/gematria";
import { ProvenanceBlock } from "./provenance-block";

const FINALS = Object.keys(FINAL_TO_BASE);

export function QabalahPanel({
  reading,
  input,
  onInputChange,
  onCopyJson,
  jsonCopied,
}: {
  reading: QabalahReading;
  input: string;
  onInputChange?: (value: string) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const append = (glyph: string) => onInputChange?.(`${input}${glyph}`);

  return (
    <section className="divination-panel divination-panel--qabalah" aria-label="赫尔墨斯卡巴拉">
      <div className="divination-panel__topline">
        <span>HERMETIC QABALAH / 4 WORLDS</span>
        <span className="status status--live">32 PATHS</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">OLAMOT · SEPHIROT · 22 LETTERS</p>
          <h2>赫尔墨斯卡巴拉</h2>
          <p className="divination-panel__subhead">
            四界与二十二字母 · 标准值 {reading.standard} · 数根 {reading.digitalRoot}
            {reading.sephirah ? ` → 第 ${reading.sephirah.number} 辉 ${reading.sephirah.name}（${reading.sephirah.zh}）· 天使 ${reading.sephirah.archangel}` : ""}
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

      <div className="qabalah-input">
        <label>
          希伯来词（字母数术）
          <input
            type="text"
            dir="rtl"
            lang="he"
            value={input}
            placeholder="יהוה"
            onChange={(event) => onInputChange?.(event.target.value)}
          />
        </label>
        <div className="qabalah-palette" role="group" aria-label="字母面板">
          {ALPHABET.map((glyph) => (
            <button key={glyph} type="button" onClick={() => append(glyph)}>{glyph}</button>
          ))}
          {FINALS.map((glyph) => (
            <button key={glyph} type="button" className="is-final" onClick={() => append(glyph)}>{glyph}</button>
          ))}
          <button type="button" className="is-clear" onClick={() => onInputChange?.("")}>清空</button>
        </div>
      </div>

      <div className="divination-section-heading"><span>四界 · OLAMOT</span><small>神名 / 天使 / 天使序</small></div>
      <div className="qabalah-worlds">
        {WORLDS.map((world) => (
          <article className="qabalah-world" key={world.id}>
            <header><b>{world.name}</b><em>{world.hebrew}</em><span>{world.zh}</span></header>
            <div className="qabalah-world__rows">
              <p><span>元素</span>{world.element}</p>
              <p><span>圣名位</span>{world.letter}</p>
              <p><span>神名</span>{world.divineName} <em>{world.divineNameTranslit}</em></p>
              <p><span>天使</span>{world.archangel}</p>
              <p><span>天使序</span>{world.order}</p>
              <p><span>辉位</span>{world.sephirot.join("、")}</p>
              <p><span>灵魂层</span>{world.soul}</p>
            </div>
            <footer>{world.note}</footer>
          </article>
        ))}
      </div>

      <div className="divination-section-heading"><span>生命树十辉 · SEPHIROT</span><small>神名 / 天使 / 天使序</small></div>
      <div className="qabalah-table">
        <div className="qabalah-table__row qabalah-table__row--head">
          <b>#</b><b>辉</b><b>神名</b><b>天使</b><b>天使序</b><b>柱 / 属性</b>
        </div>
        {SEPHIROT.map((sephirah) => (
          <div className={`qabalah-table__row${reading.sephirah?.number === sephirah.number ? " is-active" : ""}`} key={sephirah.number}>
            <b>{sephirah.number}</b>
            <span>{sephirah.name}<small>{sephirah.zh}</small></span>
            <span>{sephirah.divineName}<small>{sephirah.divineNameTranslit}</small></span>
            <span>{sephirah.archangel}</span>
            <span>{sephirah.order}</span>
            <em>{sephirah.pillar} · {sephirah.attribution} · {sephirah.world}</em>
          </div>
        ))}
      </div>

      <div className="divination-section-heading"><span>二十二字母 · 路径 11–32</span><small>数值 / 属性 / 塔罗</small></div>
      <div className="qabalah-letters">
        {LETTERS.map((letter) => (
          <article className={`qabalah-letter qabalah-letter--${letter.kind === "母" ? "mother" : letter.kind === "双" ? "double" : "simple"}${reading.letters.some((hit) => hit.base === letter.glyph) ? " is-active" : ""}`} key={letter.glyph}>
            <header><b>{letter.glyph}</b><em>{letter.value}</em></header>
            <strong>{letter.name}</strong>
            <span>{letter.zh} · {letter.kind}</span>
            <i>{letter.attribution}</i>
            <small>塔罗 {letter.tarot}（{letter.tarotNumber}）· 路径 {letter.path}</small>
          </article>
        ))}
      </div>

      <div className="divination-section-heading"><span>数术 · GEMATRIA</span><small>{reading.letters.length} 字母</small></div>
      <div className="qabalah-math">
        <div className="qabalah-math__col">
          <h4>逐字数值</h4>
          <div className="qabalah-chips">
            {reading.letters.length ? reading.letters.map((letter, index) => (
              <span className="qabalah-chip" key={`${letter.letter}-${index}`}>
                <b>{letter.letter}</b>
                <em>{letter.value}</em>
                <small>{letter.name}</small>
              </span>
            )) : <span className="qabalah-empty">请输入或点选希伯来字母。</span>}
          </div>
          <p className="qabalah-note">标准值合计 <b>{reading.standard}</b> · 数根 <b>{reading.digitalRoot}</b>
            {reading.sameValueLetters.length ? ` · 同值字母：${reading.sameValueLetters.map((letter) => `${letter.glyph}${letter.name}`).join("、")}` : " · 无同值字母"}
          </p>
          <p className="qabalah-note">Atbash：{reading.atbash || "—"} · Albam：{reading.albam || "—"}</p>
        </div>
        <div className="qabalah-math__col">
          <h4>十三法</h4>
          <div className="qabalah-methods">
            {reading.methods.map((method) => (
              <div className={`qabalah-method${method.method === "hechrachi" ? " is-active" : ""}`} key={method.method}>
                <span>{method.label}</span>
                <b>{method.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{reading.disclaimer}</p>
      <ProvenanceBlock system="qabalah" />
    </section>
  );
}
