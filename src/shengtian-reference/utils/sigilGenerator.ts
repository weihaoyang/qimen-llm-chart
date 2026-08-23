/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeciderSigil } from '../types';

export interface SigilInputParameters {
  decisionSpeedSec: number;
  riskPreference: 'CONSERVATIVE' | 'ASYMMETRIC_AGGRESSIVE' | 'PROBABILISTIC' | 'ETHICAL_FIRST';
  resourceAllInRatio: number;
  cognitiveRigorScore: number;
  username?: string;
}

const ARCHETYPES: Array<{
  archetype: DeciderSigil['archetype'];
  name: string;
  codeName: string;
  description: string;
  primaryGeometry: DeciderSigil['primaryGeometry'];
  glowColor: string;
  secondaryColor: string;
}> = [
  {
    archetype: 'LEVIATHAN',
    name: '【深潜的利维坦】',
    codeName: 'THE_ABYSSAL_LEVIATHAN',
    description: '深居因果重力场极深处，以冷酷的蓄力与一击必杀的非对称突刺重构现实矩阵。',
    primaryGeometry: 'METATRON',
    glowColor: '#3A7DFF',
    secondaryColor: '#00F0FF',
  },
  {
    archetype: 'ARCHIMEDES',
    name: '【永恒的阿基米德】',
    codeName: 'ETERNAL_ARCHIMEDES',
    description: '执着于寻找足以撬动全局的唯一支点，善于以最小微粒能量引发剧烈的因果链式共振。',
    primaryGeometry: 'VECTOR_FIBONACCI',
    glowColor: '#FFB800',
    secondaryColor: '#FF7A00',
  },
  {
    archetype: 'PROMETHEUS',
    name: '【破壁的普罗米修斯】',
    codeName: 'PROMETHEUS_UNBOUND',
    description: '无惧既定规则的重力束缚，在绝境中盗取未来视界的微光，悍然撕裂宿命收束线。',
    primaryGeometry: 'HYPERCUBE',
    glowColor: '#D70026',
    secondaryColor: '#FF4D4D',
  },
  {
    archetype: 'WEAVER',
    name: '【裂隙的织网者】',
    codeName: 'RIFT_WEAVER',
    description: '洞察一切被忽视的微弱变量，在看似封闭的现实缝隙中编织多重复合对冲网络。',
    primaryGeometry: 'HEXAGRAM',
    glowColor: '#9D00FF',
    secondaryColor: '#D946EF',
  },
  {
    archetype: 'SENTINEL',
    name: '【孤峰的守望者】',
    codeName: 'SOLITARY_SENTINEL',
    description: '以不可动摇的价值观与第一性伦理为基石，在狂暴的外部不确定性中建立绝对防线。',
    primaryGeometry: 'VESICA_PISCIS',
    glowColor: '#00E5A3',
    secondaryColor: '#38BDF8',
  },
];

export function generateDeciderSigil(params: SigilInputParameters): DeciderSigil {
  // Determine Archetype based on risk preference and metrics
  let selected = ARCHETYPES[0];
  if (params.riskPreference === 'ASYMMETRIC_AGGRESSIVE') {
    selected = params.resourceAllInRatio > 0.6 ? ARCHETYPES[2] : ARCHETYPES[0];
  } else if (params.riskPreference === 'PROBABILISTIC') {
    selected = ARCHETYPES[1];
  } else if (params.riskPreference === 'ETHICAL_FIRST') {
    selected = ARCHETYPES[4];
  } else {
    selected = ARCHETYPES[3];
  }

  const seed = Math.floor(
    (params.decisionSpeedSec * 137 +
      params.resourceAllInRatio * 997 +
      params.cognitiveRigorScore * 431) %
      10000
  );

  const nodesCount = 6 + (seed % 7);
  const circuitDensity = Math.round(params.cognitiveRigorScore * 10) / 10;

  return {
    id: `sigil-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    name: selected.name,
    codeName: selected.codeName,
    archetype: selected.archetype,
    description: selected.description,
    geometricSeed: seed,
    primaryGeometry: selected.primaryGeometry,
    nodesCount,
    circuitDensity,
    glowColor: selected.glowColor,
    secondaryColor: selected.secondaryColor,
    forgedAt: new Date().toISOString(),
    behaviorMetrics: {
      decisionSpeedSec: params.decisionSpeedSec,
      riskPreference: params.riskPreference,
      resourceAllInRatio: params.resourceAllInRatio,
      cognitiveRigorScore: params.cognitiveRigorScore,
    },
  };
}

/**
 * Draws the procedural sacred-geometry sigil onto an HTML5 Canvas context
 */
export function drawSigilToCanvas(
  ctx: CanvasRenderingContext2D,
  sigil: DeciderSigil,
  size: number = 240,
  timeOffset: number = 0
) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.4;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(cx, cy);

  // Outer Sanctuary Rings
  ctx.strokeStyle = `${sigil.glowColor}40`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `${sigil.secondaryColor}60`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating outer rune ticks
  const tickCount = sigil.nodesCount * 4;
  for (let i = 0; i < tickCount; i++) {
    const angle = (i / tickCount) * Math.PI * 2 + timeOffset * 0.15;
    const innerR = i % 2 === 0 ? radius * 0.92 : radius * 0.95;
    const outerR = radius * 1.04;
    const x1 = Math.cos(angle) * innerR;
    const y1 = Math.sin(angle) * innerR;
    const x2 = Math.cos(angle) * outerR;
    const y2 = Math.sin(angle) * outerR;

    ctx.strokeStyle = i % 4 === 0 ? sigil.glowColor : `${sigil.secondaryColor}50`;
    ctx.lineWidth = i % 4 === 0 ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Geometric Body according to geometry type
  const nodeAngles: number[] = [];
  const count = sigil.nodesCount;

  for (let i = 0; i < count; i++) {
    nodeAngles.push((i / count) * Math.PI * 2 + (timeOffset * (i % 2 === 0 ? 0.2 : -0.2)));
  }

  // Draw intricate web connection lines
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = `${sigil.glowColor}90`;

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a1 = nodeAngles[i];
      const a2 = nodeAngles[j];
      const r1 = radius * (0.45 + ((i % 3) * 0.15));
      const r2 = radius * (0.45 + ((j % 3) * 0.15));

      const x1 = Math.cos(a1) * r1;
      const y1 = Math.sin(a1) * r1;
      const x2 = Math.cos(a2) * r2;
      const y2 = Math.sin(a2) * r2;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Central Core Glyphs
  ctx.fillStyle = sigil.glowColor;
  ctx.shadowColor = sigil.glowColor;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Central Eye / Singularity point
  ctx.fillStyle = '#05080D';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Pulsating Outer Nodes
  nodeAngles.forEach((a, idx) => {
    const r = radius * (0.65 + ((idx % 2) * 0.15));
    const nx = Math.cos(a) * r;
    const ny = Math.sin(a) * r;

    ctx.fillStyle = sigil.secondaryColor;
    ctx.shadowColor = sigil.secondaryColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}
