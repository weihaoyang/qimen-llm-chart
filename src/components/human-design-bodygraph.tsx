"use client";

import { useState, type KeyboardEvent } from "react";
import { HD_CHANNELS } from "@/lib/human-design/chart";
import type { HumanDesignChart } from "@/lib/human-design/types";

const CENTERS: Record<string, { x: number; y: number; kind: "diamond" | "square" | "triangle" }> = { 头: { x: 180, y: 40, kind: "triangle" }, 阿基那: { x: 180, y: 125, kind: "diamond" }, 喉咙: { x: 180, y: 215, kind: "square" }, "G中心": { x: 180, y: 315, kind: "diamond" }, 意志力: { x: 73, y: 292, kind: "triangle" }, 脾: { x: 73, y: 410, kind: "triangle" }, 情绪: { x: 287, y: 292, kind: "triangle" }, 骶骨: { x: 180, y: 435, kind: "square" }, 根部: { x: 180, y: 540, kind: "square" } };
const keyHandler = (event: KeyboardEvent<SVGGElement>, callback: () => void) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); callback(); } };
const channelKey = (gates: [number, number]) => `${gates[0]}-${gates[1]}`;

export function HumanDesignBodygraph({ chart, partner }: { chart: HumanDesignChart; partner?: HumanDesignChart | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!chart.complete) return <div className="bodygraph-empty">尚未计算人类图。</div>;
  const defined = new Set(chart.centers.filter((item) => item.defined).map((item) => item.name));
  const definedChannels = new Set(chart.channels.map((item) => channelKey(item.gates)));
  const partnerChannels = new Set((partner?.channels ?? []).map((item) => channelKey(item.gates)));
  const partnerCenters = new Set((partner?.centers ?? []).filter((item) => item.defined).map((item) => item.name));
  const hasPartner = Boolean(partner);
  const selectedCenter = chart.centers.find((item) => item.name === selected) ?? null;
  return (
    <div className="bodygraph-layout">
      <div className="bodygraph-stage">
        <svg className="bodygraph-svg" viewBox="0 0 360 580" role="img" aria-label="交互式人类图 BodyGraph">
          <g aria-hidden="true">
            {HD_CHANNELS.map((channel) => {
              const a = CENTERS[channel.centers[0]];
              const b = CENTERS[channel.centers[1]];
              if (!a || !b) return null;
              const key = channelKey(channel.gates);
              const isDefined = definedChannels.has(key);
              const partnerOnly = hasPartner && partnerChannels.has(key) && !isDefined;
              const dimmed = isDefined && selected !== null && !channel.centers.includes(selected);
              const cls = isDefined ? (dimmed ? "is-active is-dimmed" : "is-active") : partnerOnly ? "is-partner" : "is-muted";
              return <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`bodygraph-svg__channel ${cls}`}><title>{`${channel.gates.join("-")} ${channel.name}${isDefined ? "（已定义）" : partnerOnly ? "（合图）" : "（开放）"}`}</title></line>;
            })}
          </g>
          {Object.entries(CENTERS).map(([name, center]) => {
            const isDefined = defined.has(name);
            const partnerOnly = hasPartner && partnerCenters.has(name) && !isDefined;
            const active = selected === name;
            return (
              <g key={name} className={`bodygraph-svg__center ${isDefined ? "is-defined" : "is-open"} ${partnerOnly ? "is-partner" : ""} ${active ? "is-selected" : ""}`} tabIndex={0} role="button" aria-label={`查看${name}中心`} onClick={() => setSelected(active ? null : name)} onKeyDown={(event) => keyHandler(event, () => setSelected(active ? null : name))}>
                {center.kind === "diamond" ? <rect x={center.x - 25} y={center.y - 25} width="50" height="50" transform={`rotate(45 ${center.x} ${center.y})`} /> : center.kind === "triangle" ? <path d={`M${center.x} ${center.y - 29} L${center.x + 29} ${center.y + 23} L${center.x - 29} ${center.y + 23} Z`} /> : <rect x={center.x - 28} y={center.y - 28} width="56" height="56" />}
                {name === "G中心" ? <text x={center.x} y={center.y + 4} textAnchor="middle">G</text> : <text x={center.x} y={center.y + 4} textAnchor="middle">{name}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <aside className="bodygraph-inspector">
        <span className="visual-kicker">BODYGRAPH READOUT</span>
        <h3>{selected ?? "选择一个中心"}</h3>
        {selected ? (
          <>
            <p className="visual-lead">{defined.has(selected) ? "已定义中心" : "开放中心"} · {chart.channels.filter((item) => item.centers.includes(selected)).length} 条通道</p>
            <p className="visual-lead">激活门：{selectedCenter?.gates.length ? selectedCenter.gates.join(" / ") : "无"}</p>
            <div className="visual-aspects">{chart.channels.filter((item) => item.centers.includes(selected)).map((item) => <div key={item.name}><b>{item.gates.join("-")}</b><span>{item.name}</span></div>)}</div>
          </>
        ) : (
          <p className="visual-copy">点击一个中心，查看与它连接的通道与激活门。实心中心表示由当前激活推导出的定义中心。</p>
        )}
        <div className="visual-legend"><span><i className="legend-square legend-square--defined" />已定义</span><span><i className="legend-square legend-square--open" />开放</span><span><i className="legend-line legend-line--channel" />通道</span>{hasPartner ? <span><i className="legend-line legend-line--partner" />合图</span> : null}</div>
      </aside>
    </div>
  );
}
