"use client";

import type { AstroChart } from "@/lib/astro/types";
import type { HumanDesignChart } from "@/lib/human-design/types";
import type { TarotReading } from "@/lib/tarot/types";

type Props =
  | { kind: "astro"; value: AstroChart }
  | { kind: "human-design"; value: HumanDesignChart }
  | { kind: "tarot"; value: TarotReading };

export function DivinationPanel({ kind, value }: Props) {
  if (kind === "astro") {
    return <section className="divination-panel" aria-label="星盘">
      <header className="divination-panel__header"><span>ASTRO / NATAL</span><h2>星盘</h2><p>平均轨道位置 · 研究性近似</p></header>
      <div className="divination-panel__hero-grid">
        <div className="divination-panel__hero-cell"><small>太阳</small><strong>{value.sun.sign} {value.sun.degree}°</strong><span>第{value.sun.house}宫</span></div>
        <div className="divination-panel__hero-cell"><small>月亮</small><strong>{value.moon.sign} {value.moon.degree}°</strong><span>第{value.moon.house}宫</span></div>
        <div className="divination-panel__hero-cell"><small>上升</small><strong>{value.ascendant.sign} {value.ascendant.degree}°</strong><span>第{value.ascendant.house}宫</span></div>
      </div>
      <div className="divination-panel__table">{value.points.map((point) => <div className="divination-panel__row" key={point.name}><b>{point.name}</b><span>{point.sign}</span><span>{point.degree}°</span><span>第{point.house}宫</span></div>)}</div>
      <p className="divination-panel__note">{value.disclaimer}</p>
    </section>;
  }
  if (kind === "human-design") {
    return <section className="divination-panel" aria-label="人类图">
      <header className="divination-panel__header"><span>HUMAN DESIGN / BODYGRAPH</span><h2>人类图</h2><p>结构化中心与策略 · 研究性 MVP</p></header>
      <div className="divination-panel__hero-grid"><div className="divination-panel__hero-cell"><small>类型</small><strong>{value.type}</strong><span>{value.strategy}</span></div><div className="divination-panel__hero-cell"><small>内在权威</small><strong>{value.authority}</strong><span>人生角色 {value.profile}</span></div><div className="divination-panel__hero-cell"><small>人生主题</small><strong>{value.incarnationCross}</strong><span>不作确定性结论</span></div></div>
      <div className="divination-panel__center-grid">{value.centers.map((center) => <div className={`divination-panel__center ${center.defined ? "is-defined" : ""}`} key={center.name}><b>{center.name}</b><span>{center.defined ? "定义" : "开放"}</span><small>闸门 {center.gate}</small></div>)}</div>
      <p className="divination-panel__note">{value.disclaimer}</p>
    </section>;
  }
  return <section className="divination-panel" aria-label="塔罗牌">
    <header className="divination-panel__header"><span>TAROT / THREE CARD SPREAD</span><h2>塔罗牌</h2><p>{value.spread}</p></header>
    <div className="tarot-cards">{value.cards.map((card, index) => <article className={`tarot-card ${card.orientation === "逆位" ? "is-reversed" : ""}`} key={`${card.name}-${index}`}><small>{["当前主题", "阻力", "下一步"][index]}</small><strong>{card.name}</strong><span>{card.orientation} · {card.keyword}</span><p>{card.meaning}</p><em>{String(card.number).padStart(2, "0")}</em></article>)}</div>
    <p className="divination-panel__note">{value.disclaimer}</p>
  </section>;
}
