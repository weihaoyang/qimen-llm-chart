"use client";

import type { QizhengChart, QizhengStar } from "@/lib/qizheng/chart";

const StarTable = ({ title, stars }: { title: string; stars: QizhengStar[] }) => (
  <>
    <div className="divination-section-heading"><span>{title}</span><small>{stars.length} 曜</small></div>
    <div className="qizheng-table">
      {stars.map((star, index) => (
        <div className="qizheng-row" key={star.name} style={{ "--item-index": index } as React.CSSProperties}>
          <b>{star.name}</b>
          <span>{star.longitude}°</span>
          <span>{star.palaceName}({star.branch})</span>
          <span>宿{star.mansion}</span>
          <span className={`qizheng-row__dignity is-${star.dignity === "庙" || star.dignity === "旺" ? "good" : star.dignity === "陷" ? "bad" : "flat"}`}>{star.dignity}</span>
          <span>{star.element} · {star.fortune}</span>
        </div>
      ))}
    </div>
  </>
);

export function QizhengPanel({ value, onCopyJson, jsonCopied }: { value: QizhengChart; onCopyJson?: () => void; jsonCopied?: boolean }) {
  return (
    <section className="divination-panel divination-panel--qizheng" aria-label="七政四余">
      <div className="divination-panel__topline"><span>QIZHENG SIYU / 07</span><span className={value.complete ? "status status--live" : "status"}>命宫 {value.mingPalace.branch}</span></div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">SEVEN LUMINARIES / FOUR REMNANTS</p>
          <h2>七政四余</h2>
          <p className="divination-panel__subhead">七政＝日月与水金火木土五星；四余＝罗睺、计都、月孛、紫气。黄经取本仓真星历，四余按经典定义换算。</p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? <button type="button" className="divination-panel__export" onClick={onCopyJson}>复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span></button> : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="divination-section-heading"><span>十二宫</span><small>命宫 {value.mingPalace.branch}宫起</small></div>
      <div className="qizheng-palaces">
        {value.palaces.map((palace) => (
          <span key={palace.name} className={palace.name === "命宫" ? "is-ming" : undefined}>{palace.name}<b>{palace.branch}</b></span>
        ))}
      </div>

      <StarTable title="七政落宫" stars={value.stars.filter((star) => star.kind === "七政")} />
      <StarTable title="四余落宫" stars={value.stars.filter((star) => star.kind === "四余")} />

      <p className="divination-panel__note"><span>BOUNDARY</span>{value.disclaimer}</p>
    </section>
  );
}
