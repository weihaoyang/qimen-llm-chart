import React, { useEffect, useState } from 'react';
import { WorldPulseEvent } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import type { CatalogPulseEvent } from '../../../lib/scenarios/ecosystem';
import confetti from 'canvas-confetti';
import { 
  Globe, 
  Radio, 
  Users, 
  Clock, 
  Activity,
  Wifi,
  Lock,
  Cpu,
  ShieldAlert,
  Zap
} from 'lucide-react';

interface WorldPulseViewProps {
  battleId?: string;
  readOnly?: boolean;
  userEquity: number;
  onSpendEquity: (amount: number, title: string) => boolean;
  onInterveneEvent: (event: WorldPulseEvent) => void;
}

// Extended Event Interface for richer UI
type EnhancedPulseEvent = CatalogPulseEvent;

export const WorldPulseView: React.FC<WorldPulseViewProps> = ({
  battleId,
  readOnly = false,
  userEquity,
  onSpendEquity,
  onInterveneEvent,
}) => {
  const [events, setEvents] = useState<EnhancedPulseEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EnhancedPulseEvent | null>(null);
  const [tickerNews, setTickerNews] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [isObservingOnly, setIsObservingOnly] = useState(false);
  const [observationSummary, setObservationSummary] = useState<string | null>(null);
  const [tickerOffset, setTickerOffset] = useState(0);
  const [intervenedEvents, setIntervenedEvents] = useState<string[]>([]);
  const [usageError, setUsageError] = useState<string | null>(null);
  const globalVolatility = events.length ? (events.reduce((sum, event) => sum + event.volatility, 0) / events.length).toFixed(1) : '—';
  const causalEntropy = events.length ? (events.reduce((sum, event) => sum + event.complexity * event.volatility, 0) / events.length / 100).toFixed(1) : '—';

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/catalog/world-pulse', { credentials: 'include' }).then(async (response) => {
      if (!response.ok) throw new Error(`世界脉搏目录读取失败（${response.status}）。`);
      const payload = await response.json() as { events?: EnhancedPulseEvent[]; ticker?: string[] };
      if (cancelled) return;
      const nextEvents = Array.isArray(payload.events) ? payload.events : [];
      setEvents(nextEvents);
      setSelectedEvent(nextEvents[0] ?? null);
      setTickerNews(Array.isArray(payload.ticker) ? payload.ticker : []);
    }).catch((error) => { if (!cancelled) setUsageError(error instanceof Error ? error.message : '世界脉搏目录读取失败，请重试。'); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    void sessionApi.module(battleId, 'world-pulse').then(({ state }) => {
      const envelope = state as { state?: unknown } | null;
      const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { intervenedEventIds?: unknown } | null;
      const ids = saved?.intervenedEventIds;
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

  const handleIntervene = async (event: EnhancedPulseEvent) => {
    if (readOnly) return;
    if (intervenedEvents.includes(event.id)) {
      onInterveneEvent(event);
      return;
    }
    setUsageError(null);
    let success = true;
    const nextEvents = Array.from(new Set([...intervenedEvents, event.id]));
    if (battleId) {
      try { await sessionApi.consumeUsageAndSaveModule(battleId, 'world_pulse_intervention', `world-pulse:${battleId}:${event.id}`, 'world-pulse', { intervenedEventIds:nextEvents }); }
      catch (error) { setUsageError(error instanceof Error ? error.message : '平台权益校验失败，请重试。'); success = false; }
    } else success = onSpendEquity(event.equityCostToIntervene, `介入奇点事件：${event.title}`);
    if (success) {
      setIntervenedEvents(nextEvents);
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
                OFFICIAL CATALOG
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              MACRO STRATEGIC CASE LIBRARY / EXTERNAL CONNECTORS NOT CONNECTED
            </p>
          </div>
        </div>

        {/* Global Stats Array */}
        <div className="flex items-center gap-4 text-xs font-mono-code">
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[10px]">全局波动率 (GVI)</span>
            <span className="text-amber-400 font-bold flex items-center gap-1 text-sm">
              <Activity className="w-3.5 h-3.5" /> {globalVolatility} <span className="text-red-400">{events.length ? '↑' : ''}</span>
            </span>
          </div>
          <div className="w-px h-8 bg-white/[0.1]"></div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[10px]">因果熵值 (ENTROPY)</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1 text-sm">
              <Zap className="w-3.5 h-3.5" /> {causalEntropy}
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
        
        {/* Left: the complete open-source God's Eye View application */}
        <div className="lg:col-span-7 relative min-h-[420px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020408] shadow-inner">
          <iframe
            title="God&apos;s Eye View 世界观测地图"
            src="/gods-eye-view/index.html"
            loading="eager"
            allow="fullscreen; microphone"
            className="absolute inset-0 h-full w-full border-0"
          />
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/70 px-2 py-1 text-[9px] font-mono-code text-cyan-300/80">
            GOD&apos;S EYE VIEW · 官方开源观测组件
          </div>
        </div>

        {/* Right: Tactical Event Dossier (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-black/60 rounded-2xl border border-white/[0.08] overflow-hidden">
          
          {/* Target List Tabs */}
          <div className="flex bg-black/80 border-b border-white/[0.08] overflow-x-auto custom-scrollbar shrink-0">
            {catalogLoading ? <div className="px-4 py-3 text-[11px] text-slate-500">正在读取官方事件目录…</div> : events.map((evt) => (
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
                  官方案例信号（非实时外部数据）:
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
                  官方演示样本：{selectedEvent.activeObservers} 条观察记录
                </span>
                <span className="text-amber-400 font-bold bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-900/50 text-xs">
                  系统算力分配: {selectedEvent.equityCostToIntervene} EQT
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setIsObservingOnly(true);
                    setObservationSummary(`${selectedEvent.title}的核心教训：${selectedEvent.riddleDescription} 重点观察行业：${selectedEvent.sectors.join('、')}。`);
                    soundManager.playBlip(600, 0.03);
                  }}
                  className="py-3 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-sm font-mono-code text-slate-300 border border-white/[0.1] transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>提取核心教训</span>
                </button>
                <button
                  onClick={() => handleIntervene(selectedEvent)}
                  disabled={readOnly}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono-code font-bold text-sm shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center justify-center gap-2 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>引入此案进行实战推演</span>
                </button>
              </div>

              {isObservingOnly && (
                <div className="text-[10px] text-cyan-400 font-mono-code text-center pt-2 animate-pulse">
                  » 已提取官方案例教训（不代表实时外部信号） «
                </div>
              )}
              {observationSummary && <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/30 p-3 text-xs leading-relaxed text-cyan-100">{observationSummary}</div>}
              {usageError && <div className="text-center text-xs text-red-300">{usageError}</div>}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Ticker */}
      <div className="mt-4 h-8 bg-black/60 rounded-lg border border-white/[0.08] overflow-hidden flex items-center px-3 shrink-0 relative">
        <div className="flex items-center gap-2 text-[10px] font-mono-code text-red-400 font-bold z-10 bg-black/60 pr-4 h-full border-r border-white/[0.08]">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>CASE NOTES</span>
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div 
            className="absolute whitespace-nowrap flex gap-12 text-[10px] font-mono-code text-slate-400"
            style={{ transform: `translateX(${tickerOffset}px)` }}
          >
            {tickerNews.concat(tickerNews).map((news, i) => (
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
