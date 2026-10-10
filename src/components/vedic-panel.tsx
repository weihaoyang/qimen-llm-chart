"use client";

import { useState } from "react";
import type { VedicChart } from "@/lib/vedic/chart";
import type { NodeMode } from "@/lib/vedic/ayanamsa";
import { GRAHAS, RASHIS, VARGA_DEFINITIONS } from "@/lib/vedic/data";
import { ProvenanceBlock } from "./provenance-block";

const dms = (degree: number) => {
  const total = Math.round(degree * 60);
  const whole = Math.floor(total / 60);
  return `${whole}°${String(total % 60).padStart(2, "0")}′`;
};

/** 南印度盘（固定宫位）：12 宫外环 + 中央留白。 */
const SOUTH_INDIAN: Array<{ rashi: number; row: number; col: number }> = [
  { rashi: 12, row: 1, col: 1 },
  { rashi: 1, row: 1, col: 2 },
  { rashi: 2, row: 1, col: 3 },
  { rashi: 3, row: 1, col: 4 },
  { rashi: 11, row: 2, col: 1 },
  { rashi: 4, row: 2, col: 4 },
  { rashi: 10, row: 3, col: 1 },
  { rashi: 5, row: 3, col: 4 },
  { rashi: 9, row: 4, col: 1 },
  { rashi: 8, row: 4, col: 2 },
  { rashi: 7, row: 4, col: 3 },
  { rashi: 6, row: 4, col: 4 },
];

export function VedicPanel({
  chart,
  vargaCode,
  onVargaChange,
  onCopyJson,
  jsonCopied,
}: {
  chart: VedicChart;
  vargaCode: string;
  onVargaChange?: (code: string) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const definition = VARGA_DEFINITIONS.find((item) => item.code === vargaCode) ?? VARGA_DEFINITIONS[0];
  const varga = chart.vargas.find((item) => item.code === definition.code) ?? chart.vargas[0];
  const lagnaRashi = varga.lagnaRashi;

  // 罗睺 / 计都的平 / 真交点口径：图内切换只影响显示（两种口径的完整落位都已随
  // chart.nodes 一同算出，来自同一套公式，不重新引入星历）。
  const [nodeMode, setNodeMode] = useState<NodeMode>(chart.nodeMode);
  const nodeVariant = chart.nodes[nodeMode];
  const grahas = chart.grahas.map((graha) => (graha.id === "Rahu" ? nodeVariant.rahu : graha.id === "Ketu" ? nodeVariant.ketu : graha));
  const nodeLabel = (grahaId: string) =>
    grahaId === "Rahu" ? nodeVariant.rahu.vargas : grahaId === "Ketu" ? nodeVariant.ketu.vargas : null;
  const positionOf = (code: string, grahaId: string) => nodeLabel(grahaId)?.[code] ?? chart.vargas.find((item) => item.code === code)?.positions[grahaId];
  // D1 与 D9 同宫即 Vargottama；随交点口径切换重算（其余行星不受影响）。
  const vargottamaList = GRAHAS.filter((graha) => positionOf("D1", graha.id) === positionOf("D9", graha.id)).map((graha) => graha.id);

  const grahasByRashi = new Map<number, string[]>();
  for (const graha of GRAHAS) {
    const rasi = positionOf(definition.code, graha.id);
    if (!rasi) continue;
    grahasByRashi.set(rasi, [...(grahasByRashi.get(rasi) ?? []), graha.abbr]);
  }

  return (
    <section className="divination-panel divination-panel--vedic" aria-label="吠陀分盘">
      <div className="divination-panel__topline">
        <span>VEDIC / SHODASHAVARGA</span>
        <span className="status status--live">LAHIRI {chart.ayanamsa.toFixed(2)}°</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">JYOTISH · DIVISIONAL CHARTS D1–D60</p>
          <h2>吠陀分盘 · {definition.code} {definition.iast}</h2>
          <p className="divination-panel__subhead">
            {definition.iast}（{definition.zh}）· 每宫 1/{definition.divisions}
            {chart.lagna ? ` · 上升 ${chart.lagna.rashi.zh}${chart.lagna.rashi.iast} ${dms(chart.lagna.degreeInRashi)}` : " · 未计算上升（缺出生地）"}
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

      <div className="vedic-selector" role="group" aria-label="选择分盘">
        {VARGA_DEFINITIONS.map((item) => (
          <button key={item.code} type="button" className={item.code === definition.code ? "is-active" : undefined} aria-pressed={item.code === definition.code} onClick={() => onVargaChange?.(item.code)} title={`${item.iast} · ${item.zh}`}>
            {item.code}
            <small>{item.zh}</small>
          </button>
        ))}
      </div>

      <div className="vedic-layout">
        <div className="vedic-chart">
          <div className="vedic-chart__grid" role="img" aria-label={`${definition.code} 南印度盘`}>
            {SOUTH_INDIAN.map(({ rashi, row, col }) => {
              const isLagna = lagnaRashi === rashi;
              const house = lagnaRashi ? ((rashi - lagnaRashi + 12) % 12) + 1 : null;
              return (
                <div key={rashi} className={`vedic-cell${isLagna ? " is-lagna" : ""}`} style={{ gridRow: row, gridColumn: col }}>
                  <span className="vedic-cell__sign">{RASHIS[rashi - 1].abbr}<em>{RASHIS[rashi - 1].zh}</em></span>
                  {house ? <span className="vedic-cell__house">{house}</span> : null}
                  <span className="vedic-cell__grahas">{(grahasByRashi.get(rashi) ?? []).join(" ")}</span>
                </div>
              );
            })}
            <div className="vedic-center">
              <b>{definition.code}</b>
              <span>{definition.iast}</span>
              <em>{definition.zh}</em>
            </div>
          </div>
          <p className="vedic-chart__note">南印度盘：宫位固定（白羊在第二格顺时针），数字为自上升起算的宫序；标 <b>Lagna</b> 的格子为命宫。</p>
        </div>

        <div className="vedic-side">
          <div className="divination-section-heading"><span>九曜 · D1 恒星位置</span><small>Lahiri {chart.ayanamsa.toFixed(2)}°</small></div>
          <div className="vedic-selector" role="group" aria-label="罗睺 / 计都交点口径">
            {(["mean", "true"] as const).map((mode) => (
              <button key={mode} type="button" className={mode === nodeMode ? "is-active" : undefined} aria-pressed={mode === nodeMode} onClick={() => setNodeMode(mode)} title={chart.nodes[mode].label}>
                {mode === "mean" ? "平交点" : "真交点"}
                <small>{mode === "mean" ? "Mean" : "True"}</small>
              </button>
            ))}
          </div>
          <div className="vedic-table">
            {grahas.map((graha) => (
              <div className="vedic-row" key={graha.id}>
                <b>{graha.abbr}</b>
                <span>{graha.zh}<small>{graha.iast}</small></span>
                <strong>{graha.rashi.zh}{dms(graha.degreeInRashi)}</strong>
                <em>{graha.nakshatra.index} {graha.nakshatra.name} · {graha.nakshatra.pada}足 · {graha.nakshatra.lordZh}</em>
                {graha.retrograde ? <i className="vedic-row__retro">逆</i> : null}
              </div>
            ))}
          </div>
          <p className="vedic-chart__note">罗睺 / 计都取{nodeVariant.label}（可切换，平交点为默认）；真交点公式直接复用 MIT 的 <code>celestine</code>。宿为 27 宿，每宿四足（pada）。</p>
        </div>
      </div>

      <div className="divination-section-heading"><span>十六分盘矩阵 · 各曜落宫</span><small>{vargottamaList.length ? `Vargottama：${vargottamaList.join("、")}` : "无 Vargottama"}</small></div>
      <div className="vedic-matrix">
        <div className="vedic-matrix__row vedic-matrix__row--head">
          <b>盘</b>
          {GRAHAS.map((graha) => (
            <b key={graha.id} title={graha.zh}>{graha.abbr}</b>
          ))}
        </div>
        {VARGA_DEFINITIONS.map((item) => (
          <div className={`vedic-matrix__row${item.code === definition.code ? " is-active" : ""}`} key={item.code} onClick={() => onVargaChange?.(item.code)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onVargaChange?.(item.code); }}>
            <b>{item.code}<small>{item.zh}</small></b>
            {GRAHAS.map((graha) => {
              const rasi = positionOf(item.code, graha.id);
              const vargottama = rasi && item.code !== "D1" && rasi === positionOf("D1", graha.id);
              return (
                <span key={graha.id} className={vargottama ? "is-vargottama" : undefined}>{rasi ? RASHIS[rasi - 1].abbr : "—"}</span>
              );
            })}
          </div>
        ))}
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{chart.disclaimer}分盘规则出自 Parashara 体系的十六分盘（Shodashavarga），本仓按 MIT 许可的开源实现移植（`vedic-kundali` / `vedic-panchanga` / `celestine`）。</p>
      <ProvenanceBlock system="vedic" />
    </section>
  );
}
