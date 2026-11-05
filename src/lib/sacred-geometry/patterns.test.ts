import { describe, expect, it } from "vitest";
import { PATTERNS, PHI, patternById } from "./patterns";
import { serializeSacredGeometryToCompactJson, serializeSacredGeometryToStructuredText } from "./serializer";

describe("sacred geometry patterns", () => {
  it("falls back to the first pattern for unknown ids", () => {
    expect(PATTERNS).toHaveLength(5);
    expect(patternById("flower").id).toBe("flower");
    expect(patternById("nope").id).toBe(PATTERNS[0].id);
    expect(PHI).toBeCloseTo(1.6180339887, 6);
  });

  it("draws the seed of life as seven circles", () => {
    const { shapes, extent } = patternById("seed").draw();
    expect(extent).toBe(2);
    expect(shapes.filter((shape) => shape.tag === "circle" && !shape.guide)).toHaveLength(7);
    expect(shapes.filter((shape) => shape.guide)).toHaveLength(2);
    expect(shapes).toHaveLength(9);
  });

  it("draws nineteen circles for a two-ring flower of life", () => {
    const { shapes } = patternById("flower").draw({ steps: 2 });
    expect(shapes.filter((shape) => shape.tag === "circle")).toHaveLength(21); // 19 花心 + 2 外框
    expect(shapes.filter((shape) => shape.tag === "polygon")).toHaveLength(1);
    expect(shapes).toHaveLength(22);

    const oneRing = patternById("flower").draw({ steps: 1 });
    expect(oneRing.shapes.filter((shape) => shape.tag === "circle")).toHaveLength(9); // 7 + 2
  });

  it("joins thirteen centres with seventy-eight lines in metatron's cube", () => {
    const { shapes } = patternById("metatron").draw();
    expect(shapes.filter((shape) => shape.tag === "circle")).toHaveLength(14); // 13 + 1 外框
    expect(shapes.filter((shape) => shape.tag === "line")).toHaveLength(78);
    expect(shapes).toHaveLength(93);
  });

  it("keeps the vesica lens and the golden spiral arcs", () => {
    const vesica = patternById("vesica").draw({ steps: 2 });
    expect(vesica.shapes.filter((shape) => shape.fill)).toHaveLength(1);
    expect(vesica.extent).toBe(1.5);

    const golden = patternById("golden").draw({ steps: 8 });
    expect(golden.shapes.filter((shape) => shape.tag === "rect")).toHaveLength(9); // 8 方格 + 1 边框
    expect(golden.shapes.filter((shape) => shape.tag === "path")).toHaveLength(8);
    const arcs = golden.shapes.filter((shape) => shape.tag === "path")
      .map(({ attrs }) => String(attrs.d).match(/^M (\S+) A ([\d.]+),[\d.]+ 0 0,0 (\S+)$/));
    expect(arcs.map((arc) => Number(arc?.[2]))).toEqual([1, 1, 2, 3, 5, 8, 13, 21]);
    expect(arcs.slice(1).map((arc) => arc?.[1])).toEqual(arcs.slice(0, -1).map((arc) => arc?.[3]));
    for (const arc of arcs) {
      const [, from, radius, to] = arc ?? [];
      const [x0, y0] = from.split(",").map(Number);
      const [x1, y1] = to.split(",").map(Number);
      expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(Math.SQRT2 * Number(radius), 10);
    }
    expect(golden.extent).toBeGreaterThan(0);
  });

  it.each([[2.9, 2], [100000, 6], [-1, 1], [Infinity, 2], [NaN, 2]])(
    "exports the same ring count used to draw a flower for input %s",
    (input, rings) => {
      const payload = JSON.parse(serializeSacredGeometryToCompactJson("flower", input));
      expect(payload.steps).toBe(rings);
      expect(payload.shapes.filter((shape: { tag: string }) => shape.tag === "circle"))
        .toHaveLength(3 * rings * (rings + 1) + 3);
      expect(serializeSacredGeometryToStructuredText("flower", input)).toContain(`层数：${rings}`);
    },
  );

  it("serializes the construction and its boundary", () => {
    const text = serializeSacredGeometryToStructuredText("flower", 2);
    expect(text).toContain("Flower of Life");
    expect(text).toContain("形状：");
    expect(text).toContain("构造线：");
    const payload = JSON.parse(serializeSacredGeometryToCompactJson("metatron")) as { format: string; shapes: unknown[]; extent: number };
    expect(payload.format).toBe("qmdj-sacred-geometry-v1");
    expect(payload.shapes).toHaveLength(93);
    expect(payload.extent).toBeGreaterThan(0);
  });
});
