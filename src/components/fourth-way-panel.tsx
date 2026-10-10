"use client";

import type { FourthWayContent } from "@/lib/fourth-way/content";
import { EnneagramDiagram } from "./enneagram-diagram";
import { ProvenanceBlock } from "./provenance-block";

export function FourthWayPanel({ content, onCopyJson, jsonCopied }: { content: FourthWayContent; onCopyJson?: () => void; jsonCopied?: boolean }) {
  return (
    <section className="divination-panel divination-panel--fourth-way" aria-label="第四道">
      <div className="divination-panel__topline"><span>FOURTH WAY / 04</span><span className="status status--live">STUDY NOTES</span></div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">GURDJIEFF / COSMIC LAWS</p>
          <h2>{content.title}</h2>
          <p className="divination-panel__subhead">{content.intro}</p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? <button type="button" className="divination-panel__export" onClick={onCopyJson}>复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span></button> : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="bodygraph-layout">
        <div className="bodygraph-stage"><EnneagramDiagram /></div>
        <aside className="bodygraph-inspector">
          <span className="visual-kicker">ENNEAGRAM</span>
          <h3>两条法则，同一张图</h3>
          <p className="visual-copy">九型图不是符号的偶然堆叠：内三角 3-6-9 画的是三律（主动 / 被动 / 中和三力），1-4-2-8-5-7 的六角画的是七律（1/7 = 0.142857… 的循环，八度中的两个断点）。</p>
          <div className="visual-aspects">
            <div><b>3-6-9</b><span>三律 · 三力相遇才产生新现象</span></div>
            <div><b>1-4-2-8-5-7</b><span>七律 · 过程按八度展开</span></div>
          </div>
        </aside>
      </div>

      <div className="fourth-way-sections">
        {content.sections.map((section, index) => (
          <article className="fourth-way-section" key={section.id} style={{ "--item-index": index } as React.CSSProperties}>
            <header><span className="fourth-way-section__index">{String(index + 1).padStart(2, "0")}</span><h3>{section.title}</h3></header>
            <p className="fourth-way-section__summary">{section.summary}</p>
            <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </article>
        ))}
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{content.disclaimer}</p>
      <ProvenanceBlock system="fourth-way" />
    </section>
  );
}
