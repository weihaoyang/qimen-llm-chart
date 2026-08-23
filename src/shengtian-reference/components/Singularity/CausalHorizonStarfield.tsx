/* eslint-disable prefer-const */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CausalGraphNode, CausalGraphEdge } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Target, 
  Sparkles, 
  Layers, 
  Info, 
  Maximize2 
} from 'lucide-react';

interface CausalHorizonStarfieldProps {
  nodes: CausalGraphNode[];
  edges: CausalGraphEdge[];
  selectedNodeId?: string;
  onSelectNode: (node: CausalGraphNode) => void;
  onTargetSingularity: (singularityNodeId: string) => void;
}

export const CausalHorizonStarfield: React.FC<CausalHorizonStarfieldProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onTargetSingularity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // 3D Camera Controls
  const rotXRef = useRef(0.4);
  const rotYRef = useRef(0.6);
  const zoomRef = useRef(1.1);

  // Resize Observer for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        // Update actual canvas dimensions to keep text sharp
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        // Keep CSS dimensions matching container
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Handle Drag / Rotate
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    rotYRef.current += dx * 0.008;
    rotXRef.current = Math.max(-1.2, Math.min(1.2, rotXRef.current + dy * 0.008));
    setIsAutoRotate(false);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomRef.current = Math.max(0.6, Math.min(2.5, zoomRef.current - e.deltaY * 0.001));
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.015;
      if (isAutoRotate && !isDraggingRef.current) {
        rotYRef.current += 0.002;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const fov = 350 * zoomRef.current;

      // Project 3D to 2D
      const cosY = Math.cos(rotYRef.current);
      const sinY = Math.sin(rotYRef.current);
      const cosX = Math.cos(rotXRef.current);
      const sinX = Math.sin(rotXRef.current);

      // Background Starfield Grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 99 + time * 0.1) * 0.5 + 0.5) * canvas.width;
        const sy = (Math.cos(i * 33 + time * 0.1) * 0.5 + 0.5) * canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Transform all nodes
      const projectedNodes = nodes.map(n => {
        // Rotate Y
        const x1 = n.x * cosY - n.z * sinY;
        const z1 = n.z * cosY + n.x * sinY;
        // Rotate X
        const y2 = n.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + n.y * sinX + 300; // Offset camera distance

        const scale = fov / Math.max(z2, 50);
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;

        return {
          ...n,
          px,
          py,
          scale,
          z2,
        };
      });

      // 1. Draw Edges
      edges.forEach(edge => {
        const source = projectedNodes.find(n => n.id === edge.source);
        const target = projectedNodes.find(n => n.id === edge.target);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.px, source.py);
        ctx.lineTo(target.px, target.py);

        if (edge.isFatalCollapseLine) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 2 * zoomRef.current;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = 'rgba(58, 125, 255, 0.25)';
          ctx.lineWidth = 1.2 * zoomRef.current;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Energy Pulse along edge
        const tPulse = (time * 1.5 + (source.gravityWeight || 1)) % 1;
        const pulseX = source.px + (target.px - source.px) * tPulse;
        const pulseY = source.py + (target.py - source.py) * tPulse;
        ctx.fillStyle = edge.isFatalCollapseLine ? '#FF4D4D' : '#00F0FF';
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 2 * zoomRef.current, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Nodes sorted by depth z2
      const sorted = [...projectedNodes].sort((a, b) => b.z2 - a.z2);

      sorted.forEach(node => {
        const isSelected = node.id === selectedNodeId;
        const isSingularity = node.category === 'SINGULARITY';
        const isAnchor = node.category === 'ANCHOR';

        // Outer Aura
        ctx.beginPath();
        const baseRadius = isSingularity ? 14 : isAnchor ? 11 : 8;
        const r = baseRadius * node.scale * 0.03;

        if (isSingularity) {
          ctx.shadowColor = '#FFB800';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#FFB800';
          ctx.arc(node.px, node.py, r * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (isAnchor) {
          ctx.shadowColor = '#D70026';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#D70026';
          ctx.arc(node.px, node.py, r * 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (node.category === 'FACT') {
          ctx.fillStyle = '#10B981';
          ctx.arc(node.px, node.py, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#3A7DFF';
          ctx.arc(node.px, node.py, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Selection Ring
        if (isSelected) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.px, node.py, r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        ctx.font = `${Math.max(10, Math.round(11 * node.scale * 0.03))}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(226, 232, 240, 0.85)';
        ctx.fillText(node.label, node.px + r + 6, node.py + 4);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, isAutoRotate, selectedNodeId]);

  // Click on Node Handler
  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const fov = 350 * zoomRef.current;

    const cosY = Math.cos(rotYRef.current);
    const sinY = Math.sin(rotYRef.current);
    const cosX = Math.cos(rotXRef.current);
    const sinX = Math.sin(rotXRef.current);

    // Find closest node to click
    let closestNode: CausalGraphNode | null = null;
    let minDistance = 25;

    nodes.forEach(n => {
      const x1 = n.x * cosY - n.z * sinY;
      const z1 = n.z * cosY + n.x * sinY;
      const y2 = n.y * cosX - z1 * sinX;
      const z2 = z1 * cosX + n.y * sinX + 300;

      const scale = fov / Math.max(z2, 50);
      const px = cx + x1 * scale;
      const py = cy + y2 * scale;

      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = n;
      }
    });

    if (closestNode) {
      onSelectNode(closestNode);
      soundManager.playBlip(750, 0.03);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="relative surface-obsidian-war border border-white/[0.12] rounded-3xl p-4 shadow-2xl flex flex-col h-[480px]">
      
      {/* Top Controls & Mode Status */}
      <div className="flex items-center justify-between z-10 text-xs font-mono-code mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>因果视界三维星图 · CAUSAL HORIZON</span>
          </span>
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            拖拽旋转 · 滚轮缩放 · 点击节点交互
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
              isAutoRotate
                ? 'bg-blue-900/60 text-blue-200 border-blue-600'
                : 'bg-white/[0.05] text-slate-400 border-white/[0.08]'
            }`}
            title="自动自转"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => zoomRef.current = Math.min(2.2, zoomRef.current + 0.2)}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] cursor-pointer"
            title="放大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => zoomRef.current = Math.max(0.6, zoomRef.current - 0.2)}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] cursor-pointer"
            title="缩小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              rotXRef.current = 0.4;
              rotYRef.current = 0.6;
              zoomRef.current = 1.1;
            }}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] cursor-pointer"
            title="重置视角"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden rounded-2xl bg-black/40">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
          className="w-full h-full block"
        />

        {/* Floating Node Details Card */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 max-w-sm w-full p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-white/[0.15] shadow-2xl space-y-2 animate-fadeIn z-20">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded border ${
                selectedNode.category === 'SINGULARITY'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : selectedNode.category === 'ANCHOR'
                  ? 'bg-red-950 text-red-300 border-red-800'
                  : selectedNode.category === 'FACT'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-blue-950 text-blue-300 border-blue-800'
              }`}>
                {selectedNode.category === 'SINGULARITY' ? '✦ 推荐破局奇点' : selectedNode.category === 'ANCHOR' ? '⚠ 宿命收束锚点' : selectedNode.category === 'FACT' ? '✔ 已证实事实' : '● 因果变量'}
              </span>
              <span className="text-[11px] font-mono-code text-slate-400">
                宿命权重: {selectedNode.gravityWeight}
              </span>
            </div>

            <h4 className="text-sm font-bold text-white">{selectedNode.label}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.description}</p>

            {selectedNode.category === 'SINGULARITY' && (
              <button
                onClick={() => onTargetSingularity(selectedNode.id)}
                className="w-full mt-2 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono-code font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>锁定此奇点 · 载入非对称涟漪序列</span>
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
