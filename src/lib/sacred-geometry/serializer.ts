import { patternById, type SacredFigure, type SacredPattern } from "./patterns";

export const buildSacredFigure = (id: string, steps?: number): { pattern: SacredPattern; figure: SacredFigure; steps: number | null } => {
  const pattern = patternById(id);
  const limits = pattern.steps;
  const selected = limits
    ? Math.min(limits.max, Math.max(limits.min, steps !== undefined && Number.isFinite(steps) ? Math.trunc(steps) : limits.def))
    : null;
  return { pattern, figure: pattern.draw({ steps: selected ?? undefined }), steps: selected };
};

export const serializeSacredGeometryToStructuredText = (id: string, steps?: number) => {
  const { pattern, figure, steps: selected } = buildSacredFigure(id, steps);
  const counts = figure.shapes.reduce<Record<string, number>>((acc, shape) => ({ ...acc, [shape.tag]: (acc[shape.tag] ?? 0) + 1 }), {});
  return [
    "神圣几何（研究性绘图）",
    `图形：${pattern.name} —— ${pattern.tagline}`,
    pattern.blurb,
    pattern.steps ? `层数：${selected}（${pattern.steps.label} ${pattern.steps.min}–${pattern.steps.max}）` : "层数：不适用",
    `形状：${Object.entries(counts).map(([tag, count]) => `${tag}×${count}`).join("、")} · 共 ${figure.shapes.length}`,
    `构造线：${figure.shapes.filter((shape) => shape.guide).length} · 图形线：${figure.shapes.filter((shape) => !shape.guide).length} · extent：${figure.extent}`,
    "说明：图形由圆与直线在单位空间（构造圆半径 = 1）构造，移植自 MIT 项目 evoluteur/sacred-geometry；仅作几何与象征研究，不作现实预测。",
  ].join("\n");
};

export const serializeSacredGeometryToCompactJson = (id: string, steps?: number) => {
  const { pattern, figure, steps: selected } = buildSacredFigure(id, steps);
  return JSON.stringify({
    format: "qmdj-sacred-geometry-v1",
    pattern: { id: pattern.id, name: pattern.name, tagline: pattern.tagline, blurb: pattern.blurb, steps: pattern.steps },
    steps: selected,
    extent: figure.extent,
    shapes: figure.shapes,
  });
};
