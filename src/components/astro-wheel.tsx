"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { AstroChart, AstroPoint } from "@/lib/astro/types";

const SIGNS = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
const SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_SYMBOLS: Record<string, string> = { 太阳: "☉", 月亮: "☽", 水星: "☿", 金星: "♀", 火星: "♂", 木星: "♃", 土星: "♄", 天王: "♅", 海王: "♆", 冥王: "♇" };
const cx = 310;
const point = (longitude: number, radius: number) => { const radians = ((longitude - 90) * Math.PI) / 180; return { x: cx + Math.cos(radians) * radius, y: cx + Math.sin(radians) * radius }; };
const pointFor = (item: AstroPoint, radius: number) => item.longitude === null ? null : point(item.longitude, radius);
const onKey = (event: KeyboardEvent<SVGGElement>, callback: () => void) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); callback(); } };

export function AstroWheel({ chart }: { chart: AstroChart }) {
  const [selected, setSelected] = useState<string | null>(null);
  const points = new Map(chart.points.map((item) => [item.name, item]));
  const selectedPoint = selected ? points.get(selected) : undefined;
  const selectedAspects = useMemo(() => chart.aspects.filter((item) => !selected || item.body1 === selected || item.body2 === selected), [chart.aspects, selected]);
  if (!chart.complete) return <div className="astro-wheel-empty">补充出生地经纬度后显示交互式星盘。</div>;
  return <div className="astro-visual">
    <div className="astro-wheel-stage">
      <svg className="astro-wheel-svg" viewBox="0 0 620 620" role="img" aria-label="交互式本命星盘">
        <circle cx={cx} cy={cx} r="285" className="astro-wheel-svg__outer" /><circle cx={cx} cy={cx} r="230" className="astro-wheel-svg__zodiac" /><circle cx={cx} cy={cx} r="181" className="astro-wheel-svg__inner" />
        {Array.from({ length: 12 }, (_, index) => { const start = index * 30; const edge = point(start, 285); const label = point(start + 15, 257); return <g key={SIGNS[index]}><line x1={cx} y1={cx} x2={edge.x} y2={edge.y} className="astro-wheel-svg__sign-line" /><text x={label.x} y={label.y - 4} textAnchor="middle" className="astro-wheel-svg__sign-symbol">{SYMBOLS[index]}</text><text x={label.x} y={label.y + 16} textAnchor="middle" className="astro-wheel-svg__sign-label">{SIGNS[index]}</text></g>; })}
        {chart.houses.map((house) => { const p = point(house.longitude, 230); return <text key={house.house} x={p.x} y={p.y} textAnchor="middle" className="astro-wheel-svg__house-number">{house.house}</text>; })}
        {Object.values(chart.angles).map((axis) => { const p = pointFor(axis, 285); return p ? <line key={axis.name} x1={cx} y1={cx} x2={p.x} y2={p.y} className="astro-wheel-svg__axis" /> : null; })}
        {selectedAspects.map((aspect) => { const a = points.get(aspect.body1); const b = points.get(aspect.body2); const p1 = a ? pointFor(a, 181) : null; const p2 = b ? pointFor(b, 181) : null; if (!p1 || !p2) return null; return <line key={`${aspect.body1}-${aspect.body2}-${aspect.type}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={`astro-wheel-svg__aspect astro-wheel-svg__aspect--${aspect.type}`} />; })}
        {chart.points.map((item) => { const p = pointFor(item, 181); if (!p) return null; const active = selected === item.name; return <g key={item.name} className={`astro-wheel-svg__planet ${active ? "is-selected" : ""}`} tabIndex={0} role="button" aria-label={`查看${item.name}`} onClick={() => setSelected(active ? null : item.name)} onKeyDown={(event) => onKey(event, () => setSelected(active ? null : item.name))}><circle cx={p.x} cy={p.y} r={active ? 21 : 17} /><text x={p.x} y={p.y + 7} textAnchor="middle">{PLANET_SYMBOLS[item.name] ?? item.name.slice(0, 1)}</text></g>; })}
        <circle cx={cx} cy={cx} r="5" className="astro-wheel-svg__core" />
      </svg>
    </div>
    <aside className="astro-visual__inspector"><span className="visual-kicker">SELECTED READOUT</span><h3>{selectedPoint?.name ?? "选择一颗行星"}</h3>{selectedPoint ? <><p className="visual-lead">{selectedPoint.sign} {selectedPoint.degree}° · 第{selectedPoint.house ?? "—"}宫</p><div className="visual-aspects">{chart.aspects.filter((item) => item.body1 === selected || item.body2 === selected).slice(0, 7).map((item) => <div key={`${item.body1}-${item.body2}-${item.type}`}><b>{item.symbol} {item.body1 === selected ? item.body2 : item.body1}</b><span>{item.deviation}° · {item.strength}%</span></div>)}{!chart.aspects.some((item) => item.body1 === selected || item.body2 === selected) ? <small>暂无主要相位</small> : null}</div></> : <p className="visual-copy">点击盘面里的行星，查看落座、落宫和相位。相位线会根据选择自动聚焦。</p>}<div className="visual-legend"><span><i className="legend-line legend-line--soft" />和谐相位</span><span><i className="legend-line legend-line--hard" />张力相位</span><span><i className="legend-dot" />行星落点</span></div></aside>
  </div>;
}
