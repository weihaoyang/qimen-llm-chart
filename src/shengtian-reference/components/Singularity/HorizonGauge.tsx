/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Flame, AlertTriangle, Shield, Sparkles, Users, Cloud } from 'lucide-react';

interface HorizonGaugeProps {
  alphaProbability: number; // 0.0000 - 1.0000
  fogIntensity?: number; // 0 - 1
  competingObserversCount?: number;
  onToggleFogSimulation?: () => void;
}

export const HorizonGauge: React.FC<HorizonGaugeProps> = ({
  alphaProbability,
  fogIntensity = 0,
  competingObserversCount = 0,
  onToggleFogSimulation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [displayAlpha, setDisplayAlpha] = useState(alphaProbability);
  const prevAlphaRef = useRef(alphaProbability);
  const hasBreachedRef = useRef(alphaProbability >= 0.5);

  // Smooth damped alpha transition
  useEffect(() => {
    let animId: number;
    const startVal = prevAlphaRef.current;
    const targetVal = alphaProbability;
    const startTime = performance.now();
    const duration = 1200; // ms

    // Detect > 50% breach event
    if (targetVal >= 0.5 && !hasBreachedRef.current) {
      hasBreachedRef.current = true;
      soundManager.playStrategyLocked();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.25 },
        colors: ['#FFB800', '#FFA500', '#FFD700', '#FFFFFF'],
      });
    } else if (targetVal < 0.5) {
      hasBreachedRef.current = false;
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetVal - startVal) * ease;
      setDisplayAlpha(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        prevAlphaRef.current = targetVal;
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [alphaProbability]);

  // Main Horizon Gauge Canvas (Semicircle + Rising/Sinking Particle Field)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Particle pool
    const particles: Array<{
      x: number;
      y: number;
      vy: number;
      vx: number;
      size: number;
      isGolden: boolean;
      life: number;
    }> = [];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * 320,
        y: Math.random() * 160,
        vy: (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
        vx: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        isGolden: Math.random() > 0.5,
        life: Math.random(),
      });
    }

    const draw = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height - 20;
      const radius = 130;

      // 1. Draw Background Gauge Arc
      // Left Zone (0% - 50%): Sinking Blue/Red Void
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, Math.PI * 1.5);
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.stroke();

      // Right Zone (50% - 100%): Rising Gold Horizon
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI * 1.5, Math.PI * 2);
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(255, 184, 0, 0.25)';
      ctx.stroke();

      // 2. Active Value Fill Arc
      const targetAngle = Math.PI + Math.PI * Math.min(Math.max(displayAlpha, 0), 1);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, targetAngle);
      ctx.lineWidth = 14;

      if (displayAlpha >= 0.5) {
        const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        grad.addColorStop(0, '#3A7DFF');
        grad.addColorStop(0.5, '#FFB800');
        grad.addColorStop(1, '#FF7A00');
        ctx.strokeStyle = grad;
        ctx.shadowColor = '#FFB800';
        ctx.shadowBlur = 12;
      } else {
        const grad = ctx.createLinearGradient(cx - radius, cy, cx, cy);
        grad.addColorStop(0, '#D70026');
        grad.addColorStop(1, '#3A7DFF');
        ctx.strokeStyle = grad;
        ctx.shadowColor = '#3A7DFF';
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // 3. Ticks & Markings
      for (let i = 0; i <= 20; i++) {
        const angle = Math.PI + (i / 20) * Math.PI;
        const isHorizon50 = i === 10;
        const innerR = isHorizon50 ? radius - 24 : i % 5 === 0 ? radius - 18 : radius - 10;
        const outerR = radius + 12;

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = isHorizon50 ? 3 : i % 5 === 0 ? 1.5 : 0.8;
        ctx.strokeStyle = isHorizon50 
          ? '#FFB800' 
          : i < 10 
          ? 'rgba(148, 163, 184, 0.4)' 
          : 'rgba(255, 184, 0, 0.5)';
        ctx.stroke();
      }

      // 4. Central Semicircle 50% Horizon Pillar
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius - 15);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Draw Damped Needle
      const needleAngle = Math.PI + Math.PI * Math.min(Math.max(displayAlpha, 0), 1);
      const needleLen = radius - 8;
      const nx = cx + Math.cos(needleAngle) * needleLen;
      const ny = cy + Math.sin(needleAngle) * needleLen;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.lineWidth = 3;
      ctx.strokeStyle = displayAlpha >= 0.5 ? '#FFB800' : '#FFFFFF';
      ctx.shadowColor = displayAlpha >= 0.5 ? '#FFB800' : '#3A7DFF';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Needle center pivot cap
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // 6. Draw floating particles (sinking blue on left, rising gold on right)
      particles.forEach(p => {
        p.y += p.isGolden ? -0.4 : 0.4;
        p.x += p.vx;
        if (p.y < 10 || p.y > cy) p.y = cy / 2;
        if (p.x < 10 || p.x > canvas.width - 10) p.x = cx;

        ctx.fillStyle = p.isGolden ? 'rgba(255, 184, 0, 0.35)' : 'rgba(59, 130, 246, 0.3)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [displayAlpha]);

  // Observer's Fog Volumetric Shader simulation
  useEffect(() => {
    const fogCanvas = fogCanvasRef.current;
    if (!fogCanvas || fogIntensity <= 0) return;
    const ctx = fogCanvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const drawFog = () => {
      offset += 0.01;
      ctx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);

      const w = fogCanvas.width;
      const h = fogCanvas.height;

      // Render overlapping misty bands
      for (let layer = 0; layer < 3; layer++) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        const alphaBase = fogIntensity * (0.35 + layer * 0.15);
        grad.addColorStop(0, `rgba(100, 116, 139, 0)`);
        grad.addColorStop(0.3, `rgba(148, 163, 184, ${alphaBase})`);
        grad.addColorStop(0.7, `rgba(71, 85, 105, ${alphaBase * 1.2})`);
        grad.addColorStop(1, `rgba(15, 23, 42, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(
          w / 2 + Math.sin(offset + layer) * 40,
          h / 2 + Math.cos(offset * 0.8 + layer) * 20,
          w * 0.45,
          h * 0.4,
          Math.sin(offset * 0.5) * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      animId = requestAnimationFrame(drawFog);
    };

    drawFog();
    return () => cancelAnimationFrame(animId);
  }, [fogIntensity]);

  const isWarning = displayAlpha >= 0.45 && displayAlpha < 0.5;
  const isBreached = displayAlpha >= 0.5;

  return (
    <div className="relative surface-obsidian-war border border-white/[0.12] rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
      
      {/* Top Banner Tag */}
      <div className="w-full flex items-center justify-between text-xs font-mono-code mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>未来视界仪 · HORIZON GAUGE</span>
          </span>
          {isBreached ? (
            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> 50% 地平线已突破
            </span>
          ) : isWarning ? (
            <span className="text-amber-400 font-bold text-[11px] animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 临界点预警中
            </span>
          ) : (
            <span className="text-red-400 text-[11px]">宿命重力收束中</span>
          )}
        </div>

        {/* Observer's Fog Status & Toggle */}
        <div className="flex items-center gap-2">
          {competingObserversCount > 0 && (
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 animate-pulse">
              <Users className="w-3 h-3" />
              <span>{competingObserversCount} 名观测者干涉中</span>
            </span>
          )}
          <button
            onClick={onToggleFogSimulation}
            className={`px-2 py-0.5 rounded text-[10px] font-mono-code transition-all cursor-pointer flex items-center gap-1 ${
              fogIntensity > 0
                ? 'bg-purple-900 text-purple-200 border border-purple-600'
                : 'bg-white/[0.05] text-slate-400 hover:text-white border border-white/[0.08]'
            }`}
          >
            <Cloud className="w-3 h-3" />
            <span>{fogIntensity > 0 ? '迷雾生效中' : '模拟观测者迷雾'}</span>
          </button>
        </div>
      </div>

      {/* Main Dial Canvas & Volumetric Fog Layer */}
      <div className="relative w-[340px] h-[175px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={340}
          height={175}
          className={`transition-all duration-300 ${
            fogIntensity > 0 ? 'filter blur-[1.5px]' : ''
          }`}
        />

        {/* Dynamic Fog Overlay */}
        {fogIntensity > 0 && (
          <canvas
            ref={fogCanvasRef}
            width={340}
            height={175}
            className="absolute inset-0 pointer-events-none z-10"
          />
        )}

        {/* Horizon Barrier 50% Threshold Mark */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono-code font-bold text-amber-400 bg-black/80 px-2 py-0.5 rounded border border-amber-500/50">
          50.00% 奇点地平线
        </div>
      </div>

      {/* Giant α-Probability Display (4 Decimals) */}
      <div className="text-center mt-1 space-y-0.5">
        <div className="text-[11px] font-mono-code text-slate-400 uppercase tracking-widest">
          理想未来发生概率 (α-PROBABILITY)
        </div>
        <div className={`text-4xl sm:text-5xl font-mono-code font-black tracking-tight transition-all duration-300 ${
          isBreached 
            ? 'text-amber-400 glow-amber' 
            : isWarning 
            ? 'text-amber-200' 
            : 'text-blue-400 glow-blue'
        } ${fogIntensity > 0 ? 'filter blur-[0.8px]' : ''}`}>
          {(displayAlpha * 100).toFixed(4)}%
        </div>
        <p className="text-[11px] text-slate-400 font-mono-code">
          {displayAlpha >= 0.5
            ? '◆ 非对称奇点引爆，现实矩阵结构已向高概率收束'
            : '◇ 宿命重力线压制，当前属于低概率绝境区间'}
        </p>
      </div>

    </div>
  );
};
