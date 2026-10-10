import { patternById, type SacredFigure, type SacredPattern } from "./patterns";

export const buildSacredFigure = (id: string, steps?: number): { pattern: SacredPattern; figure: SacredFigure } => {
  const pattern = patternById(id);
  return { pattern, figure: pattern.draw({ steps }) };
};

export const serializeSacredGeometryToStructuredText = (id: string, steps?: number) => {
  const { pattern, figure } = buildSacredFigure(id, steps);
  const counts = figure.shapes.reduce<Record<string, number>>((acc, shape) => ({ ...acc, [shape.tag]: (acc[shape.tag] ?? 0) + 1 }), {});
  return [
    "神圣几何（研究性绘图）",
    `图形：${pattern.name} —— ${pattern.tagline}`,
    pattern.blurb,
    pattern.steps ? `层数：${steps ?? pattern.steps.def}（${pattern.steps.label} ${pattern.steps.min}–${pattern.steps.max}）` : "层数：不适用",
    `形状：${Object.entries(counts).map(([tag, count]) => `${tag}×${count}`).join("、")} · 共 ${figure.shapes.length}`,
    `构造线：${figure.shapes.filter((shape) => shape.guide).length} · 图形线：${figure.shapes.filter((shape) => !shape.guide).length} · extent：${figure.extent}`,
    "说明：图形由圆与直线在单位空间（构造圆半径 = 1）构造，移植自 MIT 项目 evoluteur/sacred-geometry；仅作几何与象征研究，不作现实预测。",
  ].join("\n");
};

export const serializeSacredGeometryToCompactJson = (id: string, steps?: number) => {
  const { pattern, figure } = buildSacredFigure(id, steps);
  return JSON.stringify({
    format: "qmdj-sacred-geometry-v1",
    pattern: { id: pattern.id, name: pattern.name, tagline: pattern.tagline, blurb: pattern.blurb, steps: pattern.steps },
    steps: steps ?? pattern.steps?.def ?? null,
    extent: figure.extent,
    shapes: figure.shapes,
  });
};
