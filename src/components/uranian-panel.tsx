"use client";

import { dialPosition, formatDial } from "@/lib/uranian/dial";
import type { UranianChart } from "@/lib/uranian/chart";

const MODULI = [90, 45, 22.5] as const;
const SIZE = 380;
const CENTER = SIZE / 2;
const RIM = 150;
const LABEL_R = 172;
const DEG = Math.PI / 180;

export function UranianPanel({
  chart,
  onModulusChange,
  onOrbChange,
  onCopyJson,
  jsonCopied,
}: {
  chart: UranianChart;
  onModulusChange?: (modulus: number) => void;
  onOrbChange?: (orb: number) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const { modulus, orb } = chart.settings;
  const angleFor = (position: number) => (position / modulus) * 360 - 90;
  const pointOn = (position: number, radius: number) => {
    const a = angleFor(position) * DEG;
    return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a), a: angleFor(position) };
  };
  const ticks = Array.from({ length: 18 }, (_, index) => (modulus / 18) * index);

  return (
    <section className="divination-panel divination-panel--uranian" aria-label="汉堡学派">
      <div className="divination-panel__topline">
        <span>HAMBURG SCHOOL / 10</span>
        <span className="status status--live">{chart.bodies.length} BODIES · {modulus}°</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">URANIAN ASTROLOGY · 天王星系统</p>
          <h2>汉堡学派 · 90° 盘</h2>
          <p className="divination-panel__subhead">
            八虚星（Cupido…Poseidon）+ 真实行星，投影到 {modulus}° 盘；中点与行星图景的容许度 ±{orb}°。
            出生地：{chart.input.hasPlace ? "有" : "无（无上升 / 中天）"}
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

      <div className="uranian-controls">
        <div className="rune-selector" role="group" aria-label="选择盘面">
          {MODULI.map((value) => (
            <button key={value} type="button" className={value === modulus ? "is-active" : undefined} aria-pressed={value === modulus} onClick={() => onModulusChange?.(value)}>
              {value}° 盘
            </button>
          ))}
        </div>
        <label className="uranian-orb">
          容许度
          <input
            type="number"
            min={0.25}
            max={3}
            step={0.25}
            value={orb}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next) && next > 0 && next <= 3) onOrbChange?.(next);
            }}
          />
          <em>度</em>
        </label>
      </div>

      <div className="uranian-layout">
        <div className="uranian-stage">
          <svg className="uranian-dial" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${modulus}度盘`}>
            <circle className="uranian-dial__rim" cx={CENTER} cy={CENTER} r={RIM} />
            <circle className="uranian-dial__inner" cx={CENTER} cy={CENTER} r={RIM - 26} />
            {ticks.map((tick) => {
              const outer = pointOn(tick, RIM);
              const inner = pointOn(tick, RIM - 8);
              const major = Math.abs(tick / (modulus / 6) - Math.round(tick / (modulus / 6))) < 1e-6;
              const label = pointOn(tick, RIM + 10);
              return (
                <g key={`tick-${tick}`}>
                  <line className={`uranian-dial__tick${major ? " is-major" : ""}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
                  {major ? (
                    <text className="uranian-dial__ticklabel" x={label.x} y={label.y} transform={`rotate(${label.a} ${label.x} ${label.y})`} textAnchor="middle" dominantBaseline="middle">
                      {tick}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {chart.bodies.map((body, index) => {
              const position = dialPosition(body.longitude, modulus);
              const marker = pointOn(position, RIM - 13 - (index % 3) * 8);
              const label = pointOn(position, LABEL_R);
              return (
                <g key={body.id} className={`uranian-marker uranian-marker--${body.kind}`}>
                  <line className="uranian-marker__stem" x1={marker.x} y1={marker.y} x2={label.x} y2={label.y} />
                  <circle className="uranian-marker__dot" cx={marker.x} cy={marker.y} r={3.5} />
                  <text className="uranian-marker__label" x={label.x} y={label.y} transform={`rotate(${label.a} ${label.x} ${label.y})`} textAnchor="middle" dominantBaseline="middle">
                    {body.glyph}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="uranian-stage__note">盘面 0° 位于正上方，顺时针递增；同一点即四正相位（0°/90°/180°/270°）重合。</p>
        </div>

        <div className="uranian-side">
          <div className="divination-section-heading"><span>八虚星 · TRANSNEPTUNIAN</span><small>{chart.tnps.length} 颗</small></div>
          <div className="uranian-table">
            {chart.tnps.map((row) => (
              <div className="uranian-row" key={row.id}>
                <b>{row.code}</b>
                <span>{row.nameZh}<small>{row.name}</small></span>
                <strong>{row.zodiac.label}</strong>
                <em>{formatDial(row.dial90)}</em>
                <p>{row.principles.join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="divination-section-heading"><span>被占据的中点 · MIDPOINTS</span><small>{chart.midpoints.length} 条</small></div>
      {chart.midpoints.length ? (
        <div className="uranian-list">
          {chart.midpoints.map((entry) => (
            <div className="uranian-list__item" key={`mid-${entry.a.id}-${entry.b.id}`}>
              <span className="uranian-list__axis">{formatDial(entry.axis)}</span>
              <b>{entry.a.name}/{entry.b.name}</b>
              <span>=</span>
              <div className="uranian-list__hits">
                {entry.occupied.map((hit) => (
                  <em key={hit.body.id}>{hit.body.name}<small>±{hit.orb}°</small></em>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><b>无中点命中</b><span>当前容许度 ±{orb}° 内没有天体落在其它天体的中点上，可放宽容许度。</span></div>
      )}

      <div className="divination-section-heading"><span>行星图景 · 和点 A+B = C</span><small>{chart.sums.length} 条</small></div>
      {chart.sums.length ? (
        <div className="uranian-list">
          {chart.sums.map((entry) => (
            <div className="uranian-list__item" key={`sum-${entry.a.id}-${entry.b.id}`}>
              <span className="uranian-list__axis">{formatDial(entry.axis)}</span>
              <b>{entry.a.name}+{entry.b.name}</b>
              <span>=</span>
              <div className="uranian-list__hits">
                {entry.occupied.map((hit) => (
                  <em key={hit.body.id}>{hit.body.name}<small>±{hit.orb}°</small></em>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><b>无和点命中</b><span>当前容许度 ±{orb}° 内没有天体落在两体和点上。</span></div>
      )}

      <div className="divination-section-heading"><span>行星图景 · 和点等式 A+B = C+D</span><small>{chart.equations.length} 条</small></div>
      {chart.equations.length ? (
        <div className="uranian-list">
          {chart.equations.map((entry, index) => (
            <div className="uranian-list__item" key={`eq-${index}`}>
              <span className="uranian-list__axis">{formatDial(entry.axis)}</span>
              <b>{entry.left[0].name}+{entry.left[1].name} = {entry.right[0].name}+{entry.right[1].name}</b>
              <div className="uranian-list__hits"><em>±{entry.orb}°</em></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><b>无和点等式</b><span>当前容许度 ±{orb}° 内没有两组天体的和点重合。</span></div>
      )}

      <p className="divination-panel__note"><span>BOUNDARY</span>{chart.disclaimer}八虚星轨道要素与解算移植自 GPL 的 Astrolog（Neely/Matrix 要素）；八虚星并非真实天体，其原则归类属该体系象征解释。</p>
    </section>
  );
}
