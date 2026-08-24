import React, { useEffect, useRef, useState } from 'react';
import { WorldPulseEvent } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import confetti from 'canvas-confetti';
import { 
  Globe, 
  Flame, 
  Radio, 
  Users, 
  Clock, 
  Activity,
  Wifi,
  Lock,
  Cpu,
  ShieldAlert,
  Zap,
  Target
} from 'lucide-react';

interface WorldPulseViewProps {
  battleId?: string;
  userEquity: number;
  onSpendEquity: (amount: number, title: string) => boolean;
  onInterveneEvent: (event: WorldPulseEvent) => void;
}

// Extended Event Interface for richer UI
interface EnhancedPulseEvent extends WorldPulseEvent {
  sectors: string[];
  complexity: number;
  volatility: number;
  intelLogs: string[];
}

const GLOBAL_EVENTS: EnhancedPulseEvent[] = [
  {
    id: 'evt-tokyo-ai',
    code: 'MACRO-26A',
    title: '亚洲核心算力供应链断裂 (宏观推演案例)',
    region: '亚洲 · 供应链核心区',
    lat: 35.67,
    lng: 139.65,
    riddleDescription: '核心算力基建受地缘政策及突发限电双重打击，供应链停滞。作为高度依赖算力的企业，客户面临合规约束与运力宕机的双重绞杀。请评估物理阻断对贵公司现金流的传导链条。',
    severity: 'TECH_COLLAPSE',
    equityCostToIntervene: 50,
    activeObservers: 342,
    status: 'ACTIVE',
    expiresInMins: 48,
    sectors: ['AI算力', '半导体供应链', '数据基建'],
    complexity: 85,
    volatility: 92,
    intelLogs: [
      "[04:12] 主要代工厂宣布不可抗力停工",
      "[04:15] 二级市场相关期权隐含波动率飙升",
      "[04:18] 跨国云厂商开始限制新开算力实例"
    ]
  },
  {
    id: 'evt-london-fund',
    code: 'MACRO-26B',
    title: '离岸美元债违约与流动性挤兑 (实战推演案例)',
    region: '欧洲 · 离岸金融中心',
    lat: 51.5,
    lng: -0.12,
    riddleDescription: '宏观黑天鹅导致离岸核心做市商暂停报价，百亿级杠杆资金抽离。企业客户面临信贷收紧与汇率剧烈波动的双杀。此案旨在演练极端流动性枯竭下的现金池保卫战。',
    severity: 'FINANCIAL_SINGULARITY',
    equityCostToIntervene: 80,
    activeObservers: 589,
    status: 'ACTIVE',
    expiresInMins: 15,
    sectors: ['跨境资本', '企业信贷', '汇兑对冲'],
    complexity: 94,
    volatility: 98,
    intelLogs: [
      "[11:42] 核心做市商宣布暂停双边报价",
      "[11:43] 离岸流动性池出现断崖式抽水",
      "[11:44] 监管机构紧急召开闭门会议"
    ]
  },
  {
    id: 'evt-sf-biotech',
    code: 'MACRO-26C',
    title: '核心知识产权遭遇跨国诉讼狙击 (防御推演案例)',
    region: '北美 · 创新科技枢纽',
    lat: 37.77,
    lng: -122.41,
    riddleDescription: '在关键IPO/融资听证会前夕，竞对通过恶意交叉诉讼冻结核心专利资产，企图用高昂诉讼成本耗死目标企业现金流。此案用于推演非对称反击与合规破局。',
    severity: 'GLOBAL_CRITICAL',
    equityCostToIntervene: 50,
    activeObservers: 215,
    status: 'ACTIVE',
    expiresInMins: 112,
    sectors: ['生物医药', '知识产权', '风险投资'],
    complexity: 76,
    volatility: 64,
    intelLogs: [
      "[14:00] 竞品公司向法院申请预先禁令",
      "[14:05] 核心研发人员收到匿名猎头邀约",
      "[14:15] 董事局提议启动毒丸计划"
    ]
  },
];

const TICKER_NEWS = [
  "MACRO: US Treasury yield curve steepening signals potential shift in tech valuation multiples...",
  "COMPLIANCE: EU Parliament drafts new AI liability framework, severely impacting downstream application margins.",
  "SUPPLY CHAIN: Red Sea shipping disruptions causing 15% freight cost spike and inventory cycle delays.",
  "MARKET: Sovereign wealth funds shifting allocation towards real assets, causing liquidity tightening in venture markets.",
  "SECURITY: Enterprise SaaS vendor suffers zero-day exploit, triggering supply chain audit wave across Fortune 500.",
  "SYSTEM: Macro Intelligence Terminal operating at nominal capacity."
];

export const WorldPulseView: React.FC<WorldPulseViewProps> = ({
  battleId,
  userEquity,
  onSpendEquity,
  onInterveneEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [events] = useState<EnhancedPulseEvent[]>(GLOBAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<EnhancedPulseEvent | null>(GLOBAL_EVENTS[0]);
  const [rotAngle, setRotAngle] = useState(0);
  const [isObservingOnly, setIsObservingOnly] = useState(false);
  const [tickerOffset, setTickerOffset] = useState(0);
  const [intervenedEvents, setIntervenedEvents] = useState<string[]>([]);
  const [usageError, setUsageError] = useState<string | null>(null);

  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    void sessionApi.module(battleId, 'world-pulse').then(({ state }) => {
      const ids = (state as { intervenedEventIds?: unknown } | null)?.intervenedEventIds;
      if (!cancelled && Array.isArray(ids)) setIntervenedEvents(ids.filter((value): value is string => typeof value === 'string'));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [battleId]);

  // Ticker Animation
  useEffect(() => {
    let animId: number;
    const animateTicker = () => {
      setTickerOffset(prev => (prev - 0.5) % 2000);
      animId = requestAnimationFrame(animateTicker);
    };
    animId = requestAnimationFrame(animateTicker);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 3D Earth Globe Projection with Advanced Cyberpunk Visuals
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Responsive Canvas Setup
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      angle += 0.003;
      setRotAngle(angle);
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.35;

      // 1. Holographic Grid Background
      ctx.strokeStyle = 'rgba(58, 125, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let i = 0; i < height; i += 30) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }

      // 2. Globe Atmospheric Glow
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.5);
      glow.addColorStop(0, 'rgba(58, 125, 255, 0.2)');
      glow.addColorStop(0.5, 'rgba(58, 125, 255, 0.05)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Earth Core
      const sphereGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
      sphereGrad.addColorStop(0, '#0f1d38');
      sphereGrad.addColorStop(0.7, '#060a12');
      sphereGrad.addColorStop(1, '#020305');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Core Border
      ctx.strokeStyle = 'rgba(58, 125, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Lat/Lng Wireframe
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)';
      ctx.lineWidth = 0.5;

      for (let lat = -60; lat <= 60; lat += 20) {
        const radLat = (lat * Math.PI) / 180;
        const y = cy - Math.sin(radLat) * radius;
        const rx = Math.cos(radLat) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, y, rx, rx * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let lng = 0; lng < 360; lng += 30) {
        const currentLng = ((lng * Math.PI) / 180 + angle) % (Math.PI * 2);
        const xOffset = Math.sin(currentLng) * radius;
        const isVisible = Math.cos(currentLng) > 0;

        if (isVisible) {
          ctx.beginPath();
          ctx.ellipse(cx + xOffset * 0.5, cy, Math.abs(xOffset * 0.5), radius, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 5. Radar Sweep
      const radarAngle = (Date.now() / 1500) % (Math.PI * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(radarAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius * 1.1, 0, 0.2);
      ctx.closePath();
      const sweepGrad = ctx.createLinearGradient(0, 0, radius * 1.1, 0);
      sweepGrad.addColorStop(0, 'rgba(100, 255, 150, 0.4)');
      sweepGrad.addColorStop(1, 'rgba(100, 255, 150, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      // Leading edge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * 1.1, 0);
      ctx.strokeStyle = 'rgba(100, 255, 150, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 6. Draw Events and Connections
      const activePoints: {x: number, y: number}[] = [];

      events.forEach((evt) => {
        const radLat = (evt.lat * Math.PI) / 180;
        const radLng = (evt.lng * Math.PI) / 180 + angle;
        const isVisible = Math.cos(radLng) > 0;

        if (isVisible) {
          const px = cx + Math.cos(radLat) * Math.sin(radLng) * radius;
          const py = cy - Math.sin(radLat) * radius;
          activePoints.push({x: px, y: py});

          const isSelected = selectedEvent?.id === evt.id;
          const tPulse = (Date.now() / (isSelected ? 300 : 800)) % 2;
          const baseColor = evt.severity === 'GLOBAL_CRITICAL' ? '#FF3366' : '#00E5FF';

          // Outer Ripple
          ctx.strokeStyle = baseColor;
          ctx.globalAlpha = 1 - tPulse / 2;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.beginPath();
          ctx.arc(px, py, 4 + tPulse * (isSelected ? 15 : 10), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Core Node
          ctx.fillStyle = baseColor;
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, isSelected ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Target Reticle for Selected
          if (isSelected) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const r = 12;
            ctx.moveTo(px - r, py - r); ctx.lineTo(px - r + 5, py - r);
            ctx.moveTo(px - r, py - r); ctx.lineTo(px - r, py - r + 5);
            ctx.moveTo(px + r, py - r); ctx.lineTo(px + r - 5, py - r);
            ctx.moveTo(px + r, py - r); ctx.lineTo(px + r, py - r + 5);
            ctx.moveTo(px - r, py + r); ctx.lineTo(px - r + 5, py + r);
            ctx.moveTo(px - r, py + r); ctx.lineTo(px - r, py + r - 5);
            ctx.moveTo(px + r, py + r); ctx.lineTo(px + r - 5, py + r);
            ctx.moveTo(px + r, py + r); ctx.lineTo(px + r, py + r - 5);
            ctx.stroke();
          }

          // Label
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = isSelected ? '#FFFFFF' : baseColor;
          ctx.fillText(evt.code, px + 12, py + 4);
        }
      });

      // 7. Data Link Arcs between visible points
      if (activePoints.length > 1) {
        ctx.strokeStyle = 'rgba(58, 125, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        for (let i = 0; i < activePoints.length; i++) {
          for (let j = i + 1; j < activePoints.length; j++) {
            const p1 = activePoints[i];
            const p2 = activePoints[j];
            // Draw curved arc
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 - 40; // Control point above
            ctx.moveTo(p1.x, p1.y);
            ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [events, selectedEvent]);

  const handleIntervene = async (event: EnhancedPulseEvent) => {
    if (intervenedEvents.includes(event.id)) {
      onInterveneEvent(event);
      return;
    }
    setUsageError(null);
    let success = true;
    if (battleId) {
      try { await sessionApi.consumeUsage(battleId, 'world_pulse_intervention', `world-pulse:${battleId}:${event.id}`); }
      catch (error) { setUsageError(error instanceof Error ? error.message : '平台权益校验失败，请重试。'); success = false; }
    } else success = onSpendEquity(event.equityCostToIntervene, `介入奇点事件：${event.title}`);
    if (success) {
      const nextEvents = Array.from(new Set([...intervenedEvents, event.id]));
      setIntervenedEvents(nextEvents);
      if (battleId) void sessionApi.saveModule(battleId, 'world-pulse', { intervenedEventIds: nextEvents }).catch(() => undefined);
      soundManager.playStrategyLocked();
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#00E5FF', '#FF3366', '#FFFFFF'],
      });
      onInterveneEvent(event);
    }
  };

  return (
    <div className="surface-obsidian-war border border-white/[0.12] rounded-3xl p-5 shadow-2xl flex flex-col h-[calc(100vh-140px)] min-h-[600px] font-sans">
      
      {/* 1. Header & Global Metrics */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/[0.08] pb-4 mb-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-600/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <span>世界脉搏 · 宏观决策情报网</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              MACRO STRATEGIC ADVISORY FEED / SYNC: 99.8%
            </p>
          </div>
        </div>

        {/* Global Stats Array */}
        <div className="flex items-center gap-4 text-xs font-mono-code">
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[10px]">全局波动率 (GVI)</span>
            <span className="text-amber-400 font-bold flex items-center gap-1 text-sm">
              <Activity className="w-3.5 h-3.5" /> 84.2 <span className="text-red-400">↑</span>
            </span>
          </div>
          <div className="w-px h-8 bg-white/[0.1]"></div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[10px]">因果熵值 (ENTROPY)</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1 text-sm">
              <Zap className="w-3.5 h-3.5" /> 1.042e9
            </span>
          </div>
          <div className="w-px h-8 bg-white/[0.1]"></div>
          <div className="bg-blue-950/40 px-3.5 py-2 rounded-lg border border-blue-900/50">
            <span className="text-slate-400 text-[10px] block">可用推演算力</span>
            <span className="text-white font-bold text-sm">{userEquity} <span className="text-slate-500 text-xs">EQT</span></span>
          </div>
        </div>
      </div>

      {/* 2. Main Radar Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        
        {/* Left: 3D Globe Radar View (7 cols) */}
        <div 
          ref={containerRef} 
          className="lg:col-span-7 relative bg-[#020408] rounded-2xl border border-white/[0.08] shadow-inner overflow-hidden flex items-center justify-center group"
        >
          {/* Cyberpunk Decorative Overlays */}
          <div className="absolute top-4 left-4 flex flex-col gap-1 text-[9px] font-mono-code text-cyan-500/70 select-none">
            <span>SYS.OP.MODE: NOMINAL</span>
            <span>SAT.LINK: ESTABLISHED</span>
            <span>GEO.SYNC: ACTIVE</span>
          </div>
          
          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] font-mono-code text-slate-500 select-none">
            <Target className="w-3 h-3" />
            <span>RADAR SWEEP ENABLED</span>
          </div>

          <canvas ref={canvasRef} className="absolute inset-0 z-10" />
          
          {/* Scanline overlay */}
          <div className="absolute inset-0 z-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiLz48L3N2Zz4=')] opacity-50"></div>
        </div>

        {/* Right: Tactical Event Dossier (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-black/60 rounded-2xl border border-white/[0.08] overflow-hidden">
          
          {/* Target List Tabs */}
          <div className="flex bg-black/80 border-b border-white/[0.08] overflow-x-auto custom-scrollbar shrink-0">
            {events.map((evt) => (
              <button
                key={evt.id}
                onClick={() => {
                  setSelectedEvent(evt);
                  setIsObservingOnly(false);
                  soundManager.playBlip(750, 0.02);
                }}
                className={`px-4 py-3 text-[11px] font-mono-code font-bold transition-all whitespace-nowrap border-r border-white/[0.05] flex flex-col items-start gap-1 ${
                  selectedEvent?.id === evt.id
                    ? 'bg-blue-950/40 text-cyan-300 border-b-2 border-b-cyan-400'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02] border-b-2 border-b-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${evt.severity === 'GLOBAL_CRITICAL' ? 'bg-red-500' : 'bg-cyan-500'}`}></span>
                  {evt.code}
                </div>
              </button>
            ))}
          </div>

          {/* Selected Event Body */}
          {selectedEvent && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              
              {/* Header Info */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold border ${
                    selectedEvent.severity === 'GLOBAL_CRITICAL'
                      ? 'bg-red-950/50 text-red-400 border-red-900/50'
                      : 'bg-cyan-950/50 text-cyan-400 border-cyan-900/50'
                  }`}>
                    {selectedEvent.severity === 'GLOBAL_CRITICAL' ? 'CLASS: CRITICAL OMEGA' : 'CLASS: TACTICAL SEVERE'}
                  </span>
                  <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/[0.05]">
                    <Clock className="w-3 h-3 text-red-400 animate-pulse" />
                    <span>T-MINUS {selectedEvent.expiresInMins}:00</span>
                  </span>
                </div>
                <h4 className="text-2xl font-black text-white tracking-tighter leading-tight">{selectedEvent.title}</h4>
                <p className="text-sm font-mono-code text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {selectedEvent.region}
                </p>
              </div>

              {/* Status Bars */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono-code text-slate-400">
                    <span>事件复杂度 (COMPLEXITY)</span>
                    <span className="text-white">{selectedEvent.complexity}%</span>
                  </div>
                  <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/[0.05]">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
                      style={{ width: `${selectedEvent.complexity}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono-code text-slate-400">
                    <span>连带波动率 (VOLATILITY)</span>
                    <span className="text-red-400">{selectedEvent.volatility}%</span>
                  </div>
                  <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/[0.05]">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 to-red-400" 
                      style={{ width: `${selectedEvent.volatility}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Sectors */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono-code text-slate-500">波及产业板块 (AFFECTED SECTORS):</span>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.sectors.map(s => (
                    <span key={s} className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-[11px] text-slate-300 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-slate-500" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Riddle / Briefing */}
              <div className="relative p-5 bg-blue-950/10 rounded-xl border border-blue-900/30 font-serif-sc text-base text-slate-200 leading-relaxed shadow-inner">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-500 rounded-tl-xl"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-500 rounded-br-xl"></div>
                {selectedEvent.riddleDescription}
              </div>

              {/* Live Intel Terminal */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono-code text-slate-500 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  实时情报流截获 (LIVE INTEL):
                </span>
                <div className="bg-black/80 rounded-xl border border-white/[0.05] p-3 space-y-2 font-mono-code text-[11px]">
                  {selectedEvent.intelLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 text-slate-400">
                      <span className="text-cyan-600">›</span>
                      <span className="text-cyan-200/70">{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Area */}
          {selectedEvent && (
            <div className="p-4 bg-black/80 border-t border-white/[0.08] shrink-0 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono-code">
                <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Users className="w-4 h-4 text-cyan-500" />
                  {selectedEvent.activeObservers} 战略顾问参与
                </span>
                <span className="text-amber-400 font-bold bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-900/50 text-xs">
                  系统算力分配: {selectedEvent.equityCostToIntervene} EQT
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setIsObservingOnly(true);
                    soundManager.playBlip(600, 0.03);
                  }}
                  className="py-3 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-sm font-mono-code text-slate-300 border border-white/[0.1] transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>提取核心教训</span>
                </button>
                <button
                  onClick={() => handleIntervene(selectedEvent)}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono-code font-bold text-sm shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center justify-center gap-2 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>引入此案进行实战推演</span>
                </button>
              </div>

              {isObservingOnly && (
                <div className="text-[10px] text-cyan-400 font-mono-code text-center pt-2 animate-pulse">
                  » 案卷提取中。系统正在生成宏观历史教训... «
                </div>
              )}
              {usageError && <div className="text-center text-xs text-red-300">{usageError}</div>}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Ticker */}
      <div className="mt-4 h-8 bg-black/60 rounded-lg border border-white/[0.08] overflow-hidden flex items-center px-3 shrink-0 relative">
        <div className="flex items-center gap-2 text-[10px] font-mono-code text-red-400 font-bold z-10 bg-black/60 pr-4 h-full border-r border-white/[0.08]">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>GLOBAL FEED</span>
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div 
            className="absolute whitespace-nowrap flex gap-12 text-[10px] font-mono-code text-slate-400"
            style={{ transform: `translateX(${tickerOffset}px)` }}
          >
            {TICKER_NEWS.concat(TICKER_NEWS).map((news, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-blue-500">▪</span> {news}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
