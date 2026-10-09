"use client";

/**
 * 九型图（Fourth Way Enneagram）。
 *
 * 纯几何绘制：外圈九点 + 三律三角(3-6-9) + 七律六角(1-4-2-8-5-7)。
 * 不含任何外部数据，只表达两条法则在同一图上的叠加关系。
 */

const CENTER = 180;
const RADIUS = 132;
const NODE_RADIUS = 17;

export const ENNEAGRAM_TRIANGLE = [3, 6, 9] as const;
export const ENNEAGRAM_HEXAD = [1, 4, 2, 8, 5, 7] as const;

const pointFor = (index: number) => {
  // 9 在正上方；1..8 顺时针每 40° 一格。
  const degrees = index === 9 ? -90 : index * 40 - 90;
  const radians = (degrees * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(radians), y: CENTER + RADIUS * Math.sin(radians) };
};

const ring = (sequence: readonly number[]) => {
  const points = sequence.map(pointFor);
  return `M${points[0].x} ${points[0].y} ${points.slice(1).map((next) => `L${next.x} ${next.y}`).join(" ")} Z`;
};

export function EnneagramDiagram({ className }: { className?: string }) {
  return (
    <svg className={className ? `enneagram-svg ${className}` : "enneagram-svg"} viewBox="0 0 360 360" role="img" aria-label="第四道九型图：三律三角与七律六角">
      <circle className="enneagram-svg__ring" cx={CENTER} cy={CENTER} r={RADIUS} />
      <path className="enneagram-svg__law enneagram-svg__law--three" d={ring(ENNEAGRAM_TRIANGLE)} />
      <path className="enneagram-svg__law enneagram-svg__law--seven" d={ring(ENNEAGRAM_HEXAD)} />
      {Array.from({ length: 9 }, (_, index) => index + 1).map((index) => {
        const { x, y } = pointFor(index);
        return (
          <g className="enneagram-svg__node" key={index}>
            <circle cx={x} cy={y} r={NODE_RADIUS} />
            <text x={x} y={y + 5} textAnchor="middle">{index}</text>
          </g>
        );
      })}
    </svg>
  );
}
