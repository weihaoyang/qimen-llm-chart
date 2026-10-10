"use client";

import type { ReactElement } from "react";
import { PATTERNS, patternById, type SacredShape } from "@/lib/sacred-geometry/patterns";

const renderShape = (shape: SacredShape, index: number): ReactElement => {
  const className = shape.guide ? "sacred-shape sacred-shape--guide" : shape.fill ? "sacred-shape sacred-shape--fill" : "sacred-shape";
  const attrs = shape.attrs;
  switch (shape.tag) {
    case "circle":
      return <circle key={index} className={className} cx={Number(attrs.cx)} cy={Number(attrs.cy)} r={Number(attrs.r)} />;
    case "line":
      return <line key={index} className={className} x1={Number(attrs.x1)} y1={Number(attrs.y1)} x2={Number(attrs.x2)} y2={Number(attrs.y2)} />;
    case "polygon":
      return <polygon key={index} className={className} points={String(attrs.points)} />;
    case "rect":
      return <rect key={index} className={className} x={Number(attrs.x)} y={Number(attrs.y)} width={Number(attrs.width)} height={Number(attrs.height)} />;
    default:
      return <path key={index} className={className} d={String(attrs.d)} />;
  }
};

export function SacredGeometryPanel({ patternId, steps, onPatternChange, onStepsChange, onCopyJson, jsonCopied }: { patternId: string; steps: number; onPatternChange?: (id: string) => void; onStepsChange?: (steps: number) => void; onCopyJson?: () => void; jsonCopied?: boolean }) {
  const pattern = patternById(patternId);
  const activeSteps = pattern.steps ? steps : undefined;
  const figure = pattern.draw({ steps: activeSteps });
  const guideCount = figure.shapes.filter((shape) => shape.guide).length;
  const viewBox = `${-figure.extent} ${-figure.extent} ${figure.extent * 2} ${figure.extent * 2}`;
  return (
    <section className="divination-panel divination-panel--sacred" aria-label="神圣几何">
      <div className="divination-panel__topline"><span>SACRED GEOMETRY / 08</span><span className="status status--live">{figure.shapes.length} SHAPES</span></div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">CIRCLES &amp; LINES / UNIT SPACE</p>
          <h2>神圣几何 · 生命之花</h2>
          <p className="divination-panel__subhead">{pattern.name} —— {pattern.tagline}</p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? <button type="button" className="divination-panel__export" onClick={onCopyJson}>复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span></button> : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="sacred-selector" role="group" aria-label="选择图形">
        {PATTERNS.map((item) => (
          <button key={item.id} type="button" className={item.id === pattern.id ? "is-active" : undefined} aria-pressed={item.id === pattern.id} onClick={() => onPatternChange?.(item.id)}>{item.name}</button>
        ))}
      </div>

      {pattern.steps ? (
        <div className="sacred-steps">
          <label>{pattern.steps.label}<input type="range" min={pattern.steps.min} max={pattern.steps.max} value={steps} onChange={(event) => onStepsChange?.(Number(event.target.value))} aria-label={`层数（${pattern.steps.label}）`} /></label>
          <span>{steps}</span>
        </div>
      ) : null}

      <div className="sacred-stage">
        <svg className="sacred-svg" viewBox={viewBox} role="img" aria-label={`${pattern.name} 图形`}>
          <g transform="scale(1,-1)">{figure.shapes.map(renderShape)}</g>
        </svg>
      </div>

      <div className="divination-section-heading"><span>FIGURE</span><small>{figure.shapes.length} 形状 · {guideCount} 构造线 · extent {figure.extent}</small></div>
      <p className="sacred-blurb">{pattern.blurb}</p>

      <p className="divination-panel__note"><span>BOUNDARY</span>图形由圆与直线在单位空间构造（构造圆半径 = 1），图案定义移植自 MIT 项目 evoluteur/sacred-geometry；仅作几何与象征研究，不作现实预测。</p>
    </section>
  );
}
