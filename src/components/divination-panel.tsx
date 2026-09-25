"use client";

import type { AstroChart } from "@/lib/astro/types";
import type { HumanDesignChart } from "@/lib/human-design/types";
import type { TarotReading } from "@/lib/tarot/types";

type Props =
  | { kind: "astro"; value: AstroChart }
  | { kind: "human-design"; value: HumanDesignChart }
  | { kind: "tarot"; value: TarotReading; onRedraw?: () => void };

export function DivinationPanel(props: Props) {
  const { kind, value } = props;
  if (kind === "astro") {
    return <section className="divination-panel" aria-label="星盘">
      <header className="divination-panel__header"><span>ASTRO / NATAL</span><h2>星盘</h2><p>{value.complete ? "天文引擎计算 · 研究性结果" : "等待出生地经纬度"}</p></header>
      <div className="divination-panel__hero-grid">
        <div className="divination-panel__hero-cell"><small>太阳</small><strong>{value.sun.degree === null ? "待补资料" : value.sun.sign + " " + value.sun.degree + "°"}</strong><span>{value.sun.house === null ? "未计算宫位" : "第" + value.sun.house + "宫"}</span></div>
        <div className="divination-panel__hero-cell"><small>月亮</small><strong>{value.moon.degree === null ? "待补资料" : value.moon.sign + " " + value.moon.degree + "°"}</strong><span>{value.moon.house === null ? "未计算宫位" : "第" + value.moon.house + "宫"}</span></div>
        <div className="divination-panel__hero-cell"><small>上升</small><strong>{value.ascendant.degree === null ? "待补资料" : value.ascendant.sign + " " + value.ascendant.degree + "°"}</strong><span>{value.ascendant.house === null ? "需出生地" : "第" + value.ascendant.house + "宫"}</span></div>
      </div>
      <div className="divination-panel__table">{value.points.map((point) => <div className="divination-panel__row" key={point.name}><b>{point.name}</b><span>{point.sign}</span><span>{point.degree}°</span><span>第{point.house}宫</span></div>)}</div>
      <p className="divination-panel__note">{value.disclaimer}</p>
    </section>;
  }
  if (kind === "human-design") {
    return <section className="divination-panel" aria-label="人类图">
      <header className="divination-panel__header"><span>HUMAN DESIGN / BODYGRAPH</span><h2>人类图</h2><p>人格 / 设计激活 · 研究性结果</p></header>
      <div className="divination-panel__hero-grid"><div className="divination-panel__hero-cell"><small>类型</small><strong>待独立推导</strong><span>不作猜测</span></div><div className="divination-panel__hero-cell"><small>内在权威</small><strong>待独立推导</strong><span>人生角色待推导</span></div><div className="divination-panel__hero-cell"><small>人生主题</small><strong>待独立推导</strong><span>{value.complete ? "闸门数据已计算" : "需出生地经纬度"}</span></div></div>
      <div className="divination-panel__center-grid">{Object.entries(value.activations).map(([name, activation]) => <div className="divination-panel__center" key={name}><b>{name}</b><span>人格 {activation.personality.gate}.{activation.personality.line}</span><small>设计 {activation.design.gate}.{activation.design.line}</small></div>)}</div>
      <p className="divination-panel__note">{value.disclaimer}</p>
    </section>;
  }
  return <section className="divination-panel" aria-label="塔罗牌">
      <header className="divination-panel__header"><span>TAROT / THREE CARD SPREAD</span><h2>塔罗牌</h2><p>{value.spread}</p>{props.onRedraw ? <button type="button" className="divination-panel__action" onClick={props.onRedraw}>重新抽牌</button> : null}</header>
    <div className="tarot-cards">{value.cards.map((card, index) => <article className={`tarot-card ${card.orientation === "逆位" ? "is-reversed" : ""}`} key={`${card.name}-${index}`}><small>{["当前主题", "阻力", "下一步"][index]}</small><strong>{card.name}</strong><span>{card.orientation} · {card.keyword}</span><p>{card.meaning}</p><em>{String(card.number).padStart(2, "0")}</em></article>)}</div>
    <p className="divination-panel__note">{value.disclaimer}</p>
  </section>;
}
