"use client";

import type { HarmonicPoint } from "@/lib/harmonic/chart";

const CENTER = 180;
const RADIUS = 132;

/** 0° 白羊在左侧，度数逆时针增加（标准占星轮）。 */
const positionFor = (longitude: number, radius = RADIUS) => {
  const theta = ((180 - longitude) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(theta), y: CENTER - radius * Math.sin(theta) };
};

export function HarmonicWheel({ harmonic, points }: { harmonic: number; points: HarmonicPoint[] }) {
  return (
    <svg className="harmonic-svg" viewBox="0 0 360 360" role="img" aria-label={`第 ${harmonic} 谐波盘`}>
      <circle className="harmonic-svg__ring" cx={CENTER} cy={CENTER} r={RADIUS} />
      {Array.from({ length: 12 }, (_, index) => index * 30).map((longitude) => {
        const inner = positionFor(longitude, RADIUS - 11);
        const outer = positionFor(longitude, RADIUS + 4);
        return <line className="harmonic-svg__tick" key={longitude} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
      })}
      {points.map((point) => {
        const { x, y } = positionFor(point.longitude);
        const label = positionFor(point.longitude, RADIUS + 24);
        return (
          <g className="harmonic-svg__body" key={point.name}>
            <circle cx={x} cy={y} r={5} />
            <text x={label.x} y={label.y} textAnchor="middle">{point.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
