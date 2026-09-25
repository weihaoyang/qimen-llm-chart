"use client";

import type { AstroChart } from "@/lib/astro/types";
import type { HumanDesignChart } from "@/lib/human-design/types";
import type { TarotReading, TarotSpreadId } from "@/lib/tarot/types";
import { AstroWheel } from "./astro-wheel";
import { HumanDesignBodygraph } from "./human-design-bodygraph";

type Props =
  | { kind: "astro"; value: AstroChart; onCopyJson?: () => void; jsonCopied?: boolean }
  | { kind: "human-design"; value: HumanDesignChart; onCopyJson?: () => void; jsonCopied?: boolean }
  | { kind: "tarot"; value: TarotReading; onRedraw?: () => void; onCopyJson?: () => void; jsonCopied?: boolean; onSpreadChange?: (spreadId: TarotSpreadId) => void };

const astroStats = [["太阳", "sun"], ["月亮", "moon"], ["上升", "ascendant"]] as const;
const displayPoint = (point: AstroChart["sun"]) => point.degree === null ? "待补资料" : point.sign + " " + point.degree + "°";
const planetLabels: Record<string, string> = { sun: "太阳", earth: "地球", moon: "月亮", north_node: "北交点", south_node: "南交点", mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星", saturn: "土星", uranus: "天王星", neptune: "海王星", pluto: "冥王星" };

export function DivinationPanel(props: Props) {
  const { kind, value } = props;
  if (kind === "astro") {
    return <section className="divination-panel divination-panel--astro" aria-label="星盘">
      <div className="divination-panel__topline"><span>OBSERVATORY / 01</span><span className={value.complete ? "status status--live" : "status"}>{value.complete ? "CALCULATED" : "INPUT REQUIRED"}</span></div>
      <header className="divination-panel__header"><div><p className="divination-panel__kicker">ASTRO / NATAL CHART</p><h2>星盘</h2><p className="divination-panel__subhead">把出生时刻转换成可检视的天文坐标。</p></div><div className="divination-panel__header-actions">{props.onCopyJson ? <button type="button" className="divination-panel__export" onClick={props.onCopyJson}>复制 JSON <span>{props.jsonCopied ? "✓" : "⧉"}</span></button> : null}<div className="astro-orbit" aria-hidden="true"><i /><i /><i /><b /></div></div></header>
      <div className="divination-panel__rule" />
      <AstroWheel chart={value} />
      <div className="divination-panel__stat-grid">{astroStats.map(([label, key], index) => { const point = value[key]; return <div className="divination-stat" key={key} style={{ "--item-index": index } as React.CSSProperties}><span className="divination-stat__index">0{index + 1}</span><small>{label}</small><strong>{displayPoint(point)}</strong><em>{point.house === null ? "未计算宫位" : "第" + point.house + "宫"}</em></div>; })}</div>
      <div className="divination-section-heading"><span>PLANETARY POSITIONS</span><small>{value.points.length || 0} POINTS / TROPICAL</small></div>
      <div className="astro-table">{value.points.map((point, index) => <div className="astro-row" key={point.name} style={{ "--item-index": index } as React.CSSProperties}><span className="astro-row__marker" /><b>{point.name}</b><span>{point.sign}</span><strong>{point.degree === null ? "—" : point.degree + "°"}</strong><small>{point.house === null ? "—" : "H" + point.house}</small></div>)}{!value.points.length ? <div className="empty-state"><b>还差一项输入</b><span>补充城市或经纬度后，才会计算上升点与宫位。</span></div> : null}</div>
      <div className="astro-detail-grid"><div><div className="divination-section-heading"><span>AXES</span><small>ASC / MC / DSC / IC</small></div>{Object.values(value.angles).map((point) => <div className="detail-line" key={point.name}><b>{point.name}</b><span>{displayPoint(point)}</span></div>)}</div><div><div className="divination-section-heading"><span>ASPECTS</span><small>{value.aspects.length} FOUND</small></div>{value.aspects.slice(0, 5).map((aspect) => <div className="detail-line" key={aspect.body1 + aspect.body2 + aspect.type}><b>{aspect.symbol} {aspect.body1} / {aspect.body2}</b><span>{aspect.strength}%</span></div>)}{!value.aspects.length ? <div className="detail-line"><span>缺少输入</span></div> : null}</div></div>
      <p className="divination-panel__note"><span>METHOD NOTE</span>{value.disclaimer}</p>
    </section>;
  }
  if (kind === "human-design") {
    return <section className="divination-panel divination-panel--human" aria-label="人类图">
      <div className="divination-panel__topline"><span>BODYGRAPH / 02</span><span className={value.complete ? "status status--live" : "status"}>{value.complete ? "SIGNALS READY" : "INPUT REQUIRED"}</span></div>
      <header className="divination-panel__header"><div><p className="divination-panel__kicker">HUMAN DESIGN / ACTIVATION MAP</p><h2>人类图</h2><p className="divination-panel__subhead">看见人格与设计两侧的激活信号，不替你下人格结论。</p></div><div className="divination-panel__header-actions">{props.onCopyJson ? <button type="button" className="divination-panel__export" onClick={props.onCopyJson}>复制 JSON <span>{props.jsonCopied ? "✓" : "⧉"}</span></button> : null}<div className="hd-glyph" aria-hidden="true"><span /><span /><span /><span /><b /></div></div></header>
      <div className="divination-panel__rule" />
      <HumanDesignBodygraph chart={value} />
      <div className="hd-summary"><div><small>TYPE</small><strong>{value.type ?? "待推导"}</strong><span>{value.strategy ?? "不作猜测"}</span></div><div><small>AUTHORITY</small><strong>{value.authority ?? "—"}</strong><span>Profile {value.profile ?? "待推导"}</span></div><div><small>PRECISION</small><strong>{value.precision?.gate ?? "—"}</strong><span>{value.channels.length} channels / 13 bodies</span></div></div>
      <div className="divination-section-heading"><span>DEFINED CENTERS / CHANNELS</span><small>{value.centers.filter((center) => center.defined).length} CENTERS · {value.channels.length} CHANNELS</small></div>
      <div className="hd-chip-row">{value.centers.filter((center) => center.defined).map((center) => <span key={center.name}>{center.name}</span>)}{value.channels.slice(0, 8).map((channel) => <span key={channel.name}>{channel.gates.join("-")}</span>)}</div>
      <div className="divination-section-heading"><span>BODY ACTIVATIONS</span><small>{Object.keys(value.activations).length} BODIES / DUAL SIDES</small></div>
      <div className="hd-grid">{Object.entries(value.activations).map(([name, activation], index) => <div className="hd-cell" key={name} style={{ "--item-index": index } as React.CSSProperties}><span className="hd-cell__number">{String(index + 1).padStart(2, "0")}</span><b>{planetLabels[name] ?? name}</b><span className="hd-cell__side"><i />人格 {activation.personality.gate}.{activation.personality.line}</span><span className="hd-cell__side hd-cell__side--design"><i />设计 {activation.design.gate}.{activation.design.line}</span></div>)}{!Object.keys(value.activations).length ? <div className="empty-state"><b>还差一项输入</b><span>补充城市或经纬度后，才会计算两侧激活。</span></div> : null}</div>
      <p className="divination-panel__note"><span>BOUNDARY</span>{value.disclaimer}</p>
    </section>;
  }
  return <section className="divination-panel divination-panel--tarot" aria-label="塔罗牌">
    <div className="divination-panel__topline"><span>REFLECTION DECK / 03</span><span className="status status--live">3 CARD SPREAD</span></div>
    <header className="divination-panel__header"><div><p className="divination-panel__kicker">TAROT / REFLECTION DRAW</p><h2>塔罗牌</h2><p className="divination-panel__subhead">把问题摊开，给下一步留出可验证的空间。</p></div><div className="divination-panel__header-actions">{props.onSpreadChange ? <select className="divination-panel__spread-select" aria-label="选择塔罗牌阵" value={value.spreadId} onChange={(event) => props.onSpreadChange?.(event.target.value as TarotSpreadId)}><option value="three-card">当前主题</option><option value="decision">决策三牌</option><option value="relationship">关系三牌</option></select> : null}{props.onCopyJson ? <button type="button" className="divination-panel__export" onClick={props.onCopyJson}>复制 JSON <span>{props.jsonCopied ? "✓" : "⧉"}</span></button> : null}{props.onRedraw ? <button type="button" className="divination-panel__action" onClick={props.onRedraw}><span>↻</span>重新抽牌</button> : null}</div></header>
    <div className="divination-panel__rule" />
    <div className="tarot-spread">{value.cards.map((card, index) => <article className={"tarot-card " + (card.orientation === "逆位" ? "is-reversed" : "")} key={card.id} style={{ "--item-index": index } as React.CSSProperties}><div className="tarot-card__top"><small>0{index + 1} / {value.positions[index]}</small><em>{String(card.number).padStart(2, "0")}</em></div><div className="tarot-card__sigil" aria-hidden="true">{index === 0 ? "✦" : index === 1 ? "◈" : "✳"}</div><strong>{card.name}</strong><span>{card.orientation} <i /> {card.keyword}</span><p>{card.meaning}</p><div className="tarot-card__footer">{card.arcana === "major" ? "MAJOR ARCANA" : "MINOR ARCANA"}<b>↗</b></div></article>)}</div>
    <p className="divination-panel__note"><span>REFLECTION NOTE</span>{value.disclaimer}</p>
  </section>;
}
