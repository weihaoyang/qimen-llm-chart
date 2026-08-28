import React from 'react';
import { 
  ShieldAlert, 
  AlertOctagon, 
  Flame, 
  Power, 
  ArrowRight,
  HelpCircle,
  Zap,
  Activity,
  Radio,
  Lock,
  Terminal
} from 'lucide-react';
import { BattlefieldState, RiskBreaker } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';

interface RiskMonitorTabProps {
  battlefield: BattlefieldState;
  battleId: string;
  readOnly?: boolean;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onLaunchBreakthrough: () => void;
}

export const RiskMonitorTab: React.FC<RiskMonitorTabProps> = ({
  battlefield,
  battleId,
  readOnly = false,
  onUpdateBattlefield,
  onLaunchBreakthrough,
}) => {
  const [activeMoveId, setActiveMoveId] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [busyRiskId, setBusyRiskId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { commitment } = await sessionApi.commitment(battleId);
        const moveId = typeof commitment?.moveId === 'string' ? commitment.moveId : null;
        if (moveId) {
          const execution = await sessionApi.execution(battleId, moveId);
          const breakers = execution.breakers.map((breaker) => ({
            id: String(breaker.id),
            name: String(breaker.label ?? breaker.kind ?? '执行断路器'),
            condition: JSON.stringify(breaker.threshold ?? {}),
            isTriggered: Boolean(breaker.triggeredAt),
            triggeredAt: typeof breaker.triggeredAt === 'string' ? breaker.triggeredAt : undefined,
            impact: String(breaker.actionOnTrigger ?? '触发后停止当前落子令。'),
            recommendedAction: String(breaker.actionOnTrigger ?? '立即停止当前路径并进入破局重构。'),
          }));
          if (!cancelled) {
            setActiveMoveId(moveId);
            onUpdateBattlefield(prev => ({ ...prev, riskBreakers: breakers }));
          }
          return;
        }
        const { state } = await sessionApi.module(battleId, 'risk-monitor');
        const envelope = state as { state?: unknown } | null;
        const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { riskBreakers?: unknown } | null;
        if (Array.isArray(saved?.riskBreakers)) {
          if (!cancelled) onUpdateBattlefield(prev => ({ ...prev, riskBreakers: saved.riskBreakers as BattlefieldState['riskBreakers'] }));
          return;
        }
        const response = await fetch(`/api/battles/${battleId}/constraints`, { credentials: 'include' });
        if (!response.ok) throw new Error(`读取风险约束失败（${response.status}）。`);
        const payload = await response.json() as { constraints?: Array<Record<string, unknown>> };
        const derived = (payload.constraints ?? []).map((constraint, index) => ({
          id: String(constraint.id ?? `constraint-${index}`),
          name: String(constraint.label ?? `约束 ${index + 1}`),
          condition: String(constraint.description ?? '当该约束被证伪或越过阈值时触发。'),
          isTriggered: false,
          impact: `严重度 ${String(constraint.severity ?? 3)}/5`,
          recommendedAction: constraint.hard === false ? '重新核验并调整策略假设。' : '立即停止当前路径并进入破局重构。',
        }));
        if (!cancelled) {
          onUpdateBattlefield(prev => ({ ...prev, riskBreakers: derived }));
          if (!readOnly) await sessionApi.saveModule(battleId, 'risk-monitor', { riskBreakers: derived });
        }
      } catch (error) {
        if (!cancelled) setActionMessage(error instanceof Error ? error.message : '风险断路器读取失败，请重试。');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [battleId, onUpdateBattlefield, readOnly]);
  const toggleRiskTrigger = async (riskId: string) => {
    if (readOnly) return;
    if (busyRiskId) return;
    const risk = battlefield.riskBreakers.find((item) => item.id === riskId);
    if (!risk) return;
    if (activeMoveId) {
      if (risk.isTriggered) {
        setActionMessage('正式执行台断路器触发后不可在浏览器复位；如需换线，请结束当前落子令并记录原因。');
        return;
      }
      setActionMessage(null);
      setBusyRiskId(riskId);
      try {
        await sessionApi.triggerBreaker(battleId, activeMoveId, riskId);
        onUpdateBattlefield(prev => ({ ...prev, riskBreakers: prev.riskBreakers.map(item => item.id === riskId ? { ...item, isTriggered: true, triggeredAt: new Date().toISOString() } : item) }));
        setActionMessage('正式执行断路器已触发，当前落子令已进入停止流程。');
      } catch (error) { setActionMessage(error instanceof Error ? error.message : '触发正式断路器失败，请重试。'); }
      finally { setBusyRiskId(null); }
      return;
    }
    setActionMessage(null);
    setBusyRiskId(riskId);
    const nextState = !risk.isTriggered;
    const next = battlefield.riskBreakers.map(r => r.id === riskId ? { ...r, isTriggered: nextState, triggeredAt: nextState ? new Date().toISOString() : undefined } : r);
    try {
      // Persist first so a failed request leaves the displayed breaker
      // unchanged and the operator can retry the same action safely.
      await sessionApi.saveModule(battleId, 'risk-monitor', { riskBreakers: next });
      onUpdateBattlefield((previous) => ({ ...previous, riskBreakers: next }));
      if (nextState) soundManager.playWarning(); else soundManager.playBlip(600, 0.03);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '风险断路器保存失败，请重试。');
    } finally { setBusyRiskId(null); }
  };

  const triggeredCount = battlefield.riskBreakers.filter(r => r.isTriggered).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {actionMessage && <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-xs text-amber-200">{actionMessage}</div>}

      {/* Top Banner Alert Status */}
      <div className={`surface-obsidian rounded-2xl p-5 shadow-2xl transition-all duration-500 border ${
        triggeredCount > 0
          ? 'border-red-600/80 bg-red-950/30 shadow-red-950/40 hud-corner-red'
          : 'border-white/[0.08] hud-corner'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-all shadow-lg ${
              triggeredCount > 0
                ? 'bg-red-900/80 border-red-500 text-red-300 pulse-glow-red animate-pulse'
                : 'bg-slate-900 border-white/[0.1] text-slate-400'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>风险断路器控制台 (High-Voltage Circuit Breakers)</span>
                <span className={`text-[10px] font-mono-code px-2.5 py-0.5 rounded-full font-bold border tracking-wider uppercase ${
                  triggeredCount > 0
                    ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}>
                  {triggeredCount > 0 ? `DEFCON 1 : ${triggeredCount} 项高危击穿` : 'DEFCON 4 : 阵地稳定'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                强制断路监控。当黑天鹅风险击穿物理阈值，常规推演即刻失效，系统将强行锁死侥幸通道并唤醒破局模式。
              </p>
            </div>
          </div>

          {triggeredCount > 0 && (
            <button
              onClick={onLaunchBreakthrough}
              disabled={readOnly}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-bold flex items-center gap-2.5 shadow-2xl shadow-red-950/80 animate-bounce transition-all shrink-0 border border-red-400 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-yellow-300 animate-spin" />
              <span>进入破局战情室 (EXECUTE WAR ROOM)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Industrial High-Voltage Breaker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {battlefield.riskBreakers.map((risk, index) => {
          const isTriggered = risk.isTriggered;
          const breakerCode = `BREAKER-#0${index + 1}`;

          return (
            <div
              key={risk.id}
              className={`card-tactical rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between shadow-2xl relative overflow-hidden group ${
                isTriggered
                  ? 'border-red-600 bg-red-950/30 ring-2 ring-red-500/50 shadow-red-950/60 hud-corner-red'
                  : 'border-white/[0.08] hover:border-white/[0.2]'
              }`}
            >
              {/* Card Hologram Foil */}
              <div className="card-tactical-holo absolute inset-0 pointer-events-none opacity-30"></div>

              <div>
                {/* Breaker Top Bar */}
                <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/[0.06] text-[10px] font-mono-code">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold tracking-wider ${isTriggered ? 'text-red-400' : 'text-amber-400'}`}>
                      [{breakerCode}]
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">VOLTAGE: {isTriggered ? '0%' : '100%'}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full font-bold border ${
                    isTriggered
                      ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                      : 'bg-black/60 text-slate-400 border-white/[0.08]'
                  }`}>
                    {isTriggered ? '⚡ BREACHED' : '● ARMED'}
                  </span>
                </div>

                {/* Breaker Header & Physical Switch */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2 leading-snug">
                    <AlertOctagon className={`w-4 h-4 shrink-0 ${isTriggered ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
                    <span>{risk.name}</span>
                  </h4>

                  {/* Mechanical Toggle Button */}
                    <button
                      onClick={() => toggleRiskTrigger(risk.id)}
                      disabled={readOnly || busyRiskId !== null}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-xl transition-all font-mono-code font-bold border flex items-center gap-1.5 cursor-pointer shadow-md ${
                      isTriggered
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/[0.12]'
                        : 'bg-red-950 hover:bg-red-900 text-red-300 border-red-700 hover:border-red-500 shadow-red-950/40'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{busyRiskId === risk.id ? '保存中…' : isTriggered ? '复位断路' : '击穿断路'}</span>
                  </button>
                </div>

                {/* Trigger Threshold & Impact Display Box */}
                <div className={`p-3.5 rounded-xl border mb-3.5 space-y-2 text-xs leading-relaxed ${
                  isTriggered
                    ? 'digit-display-red'
                    : 'bg-black/50 border-white/[0.06]'
                }`}>
                  <div>
                    <span className="text-slate-400 font-mono-code text-[11px] block mb-0.5">
                      ● 绝对熔断条件 (Threshold Condition)：
                    </span>
                    <p className="text-slate-200 font-medium">{risk.condition}</p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.04]">
                    <span className="text-slate-400 font-mono-code text-[11px] block mb-0.5">
                      ● 击穿致命后果 (Impact on Runway)：
                    </span>
                    <p className="text-red-300 font-medium">{risk.impact}</p>
                  </div>
                </div>
              </div>

              {/* Action Directive on Breach */}
              <div className={`p-3.5 rounded-xl text-xs border ${
                isTriggered 
                  ? 'bg-red-950/80 text-red-100 border-red-700 font-medium ring-1 ring-red-500/40' 
                  : 'bg-black/40 text-slate-400 border-white/[0.04]'
              }`}>
                <div className="flex items-center gap-1.5 text-amber-400 font-mono-code text-[11px] font-bold mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>熔断即刻执行指令 (Fail-Safe Directive)：</span>
                </div>
                <p className="leading-relaxed">{risk.recommendedAction}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guidance Note */}
      <div className="p-5 surface-obsidian border border-white/[0.08] rounded-2xl text-xs text-slate-400 flex items-start gap-3 shadow-xl hud-corner">
        <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-200 block mb-0.5 font-bold">断路器设计哲学：</strong>
          在真实危机中，当底层核心假设破裂时，绝大多数死亡来自于当事人的“犹豫与侥幸”。风险断路器通过客观量化指标强制剥离情绪，条件一旦满足立即宣告原战术作废，强行拉入破局重构。
        </div>
      </div>

    </div>
  );
};
