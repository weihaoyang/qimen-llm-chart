import React, { useEffect, useState } from 'react';
import { 
  GitCompare, 
  Flame, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  Crosshair, 
  Clock, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  Sparkles,
  Zap,
  DollarSign,
  HeartHandshake,
  FileCheck
} from 'lucide-react';
import { BattlefieldState, AsymmetricStrategyPackage } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { Compass, Moon } from 'lucide-react';
import { sessionApi } from '../../session/api';

interface Phase3SandTableProps {
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onProceedToPhase4: () => void;
  onOpenMetaphysicsModal?: () => void;
  onOpenValueModal?: () => void;
  readOnly?: boolean;
}

type StrategyKey = AsymmetricStrategyPackage['id'];

export const Phase3SandTable: React.FC<Phase3SandTableProps> = ({
  battlefield,
  onUpdateBattlefield,
  onProceedToPhase4,
  onOpenMetaphysicsModal,
  onOpenValueModal,
  readOnly = false,
}) => {
  const [selectedStrategyKey, setSelectedStrategyKey] = useState<StrategyKey>(battlefield.lockedAsymmetricStrategyId ?? 'FIELD_SHIFT');
  const [strategyPackages, setStrategyPackages] = useState<Partial<Record<StrategyKey, AsymmetricStrategyPackage>>>({});
  const [strategyLoadError, setStrategyLoadError] = useState<string | null>(null);
  const [activePivotalModal, setActivePivotalModal] = useState<{ day: number; label: string; risk: string } | null>(null);
  const [isLocked, setIsLocked] = useState(Boolean(battlefield.lockedAsymmetricStrategyId));
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [activeCommitment, setActiveCommitment] = useState<{ moveId?: string } | null>(null);
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    void sessionApi.strategyTemplates(battlefield.id).then(({ templates }) => {
      if (cancelled) return;
      const next = templates.reduce<Partial<Record<StrategyKey, AsymmetricStrategyPackage>>>((result, template) => {
        if (template && (template.id === 'LEVERAGE_STRIKE' || template.id === 'FIELD_SHIFT' || template.id === 'SCORCHED_EARTH')) result[template.id] = template;
        return result;
      }, {});
      setStrategyPackages(next);
    }).catch((error) => {
      if (!cancelled) setStrategyLoadError(error instanceof Error ? error.message : '策略模板加载失败，请刷新重试。');
    });
    return () => { cancelled = true; };
  }, [battlefield.id]);

  useEffect(() => {
    let cancelled = false;
    void sessionApi.commitment(battlefield.id).then(({ commitment }) => {
      if (!cancelled) setActiveCommitment(commitment ? { moveId: String(commitment.moveId ?? '') } : null);
    }).catch(() => {
      // A missing commitment is a valid first-run state. The commit endpoint
      // remains authoritative if the request raced another browser tab.
    });
    return () => { cancelled = true; };
  }, [battlefield.id]);

  const currentPkg = strategyPackages[selectedStrategyKey];

  const handleSelectStrategy = (key: StrategyKey) => {
    if (readOnly) return;
    setSelectedStrategyKey(key);
    soundManager.playBlip(700, 0.03);
  };

  if (!currentPkg) {
    return <div className="surface-obsidian border border-red-900/60 rounded-2xl p-6 text-sm text-slate-300">{strategyLoadError ?? '正在加载当前战局的官方策略模板…'}</div>;
  }

  const handleLockStrategy = async () => {
    if (readOnly) return;
    if (isLocking || isLocked) return;
    if (activeCommitment && !changeReason.trim()) {
      setLockError('当前战局已有活动落子令，请先填写本次换线原因。');
      return;
    }
    setIsLocking(true);
    setLockError(null);
    try {
      const { junctions } = await sessionApi.analysis(battlefield.id);
      const junctionId = typeof (junctions[0] as { id?: unknown } | undefined)?.id === 'string' ? (junctions[0] as { id: string }).id : null;
      if (!junctionId) throw new Error('当前战局还没有因果节点，无法生成正式落子令。请先完成采访或路径分析。');
      const kind = selectedStrategyKey === 'LEVERAGE_STRIKE' ? 'strong_attack' : selectedStrategyKey === 'SCORCHED_EARTH' ? 'hedge' : 'probe';
      const saved = await sessionApi.saveMoves(battlefield.id, junctionId, [{
        kind,
        title: currentPkg.name,
        rationale: currentPkg.coreIdea,
        keyVariable: currentPkg.primaryLever,
        cost: { resources: currentPkg.resourceList, sacrifice: currentPkg.sacrificeList },
        validation: { signal: currentPkg.successSignal, indicators: currentPkg.leadingIndicators },
        stop: { criteria: currentPkg.abortCriteria },
        actions: [{ title: currentPkg.initialFirstStep, description: currentPkg.initialFirstStep, owner: '用户', dueAt: null }],
        source: { layer: 'breakthrough_sand_table', strategyId: selectedStrategyKey },
      }]);
      const moveId = (saved.moves[0] as { id?: unknown } | undefined)?.id;
      if (!moveId) throw new Error('策略草案保存成功但未返回策略标识。');
      await sessionApi.commitMove(battlefield.id, String(moveId), changeReason.trim() || undefined);
      setIsLocked(true);
      setActiveCommitment({ moveId: String(moveId) });
      soundManager.playStrategyLocked();
      onUpdateBattlefield(prev => ({ ...prev, lockedAsymmetricStrategyId: selectedStrategyKey }));
    } catch (error) {
      setLockError(error instanceof Error ? error.message : '策略锁定失败，请重试。');
    } finally {
      setIsLocking(false);
    }
  };

  const handleNext = () => {
    if (readOnly) return;
    soundManager.playBlip(900, 0.04);
    onProceedToPhase4();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Sand Table Strategy Header */}
      <div className="surface-obsidian border border-red-900/60 rounded-2xl p-5 shadow-2xl hud-corner-red">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-500/80 flex items-center justify-center text-red-300 font-mono-code font-black text-sm shrink-0 shadow-lg shadow-red-950/50">
              <span>03</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>第三阶段：战略推演沙盘 (Strategic Sand-Table)</span>
                <span className="text-[10px] font-mono-code px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 tracking-wider">
                  幽灵时间线模拟器 · 并行未来赛跑
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                比较官方策略模板的假设时间线与代价；所有百分比均为模板标注，须由你的事实、执行记录和复盘验证。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono-code text-xs">
            <span className="text-slate-400">模板结局标注:</span>
            <span className="text-xl font-black text-emerald-400">
              {currentPkg.survivalProbability}%
            </span>
          </div>
        </div>
      </div>

      {activeCommitment && !isLocked && !readOnly && (
        <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 space-y-2">
          <label htmlFor="breakthrough-change-reason" className="text-xs font-bold text-amber-200">
            本次换线原因（已有活动落子令，必填）
          </label>
          <textarea
            id="breakthrough-change-reason"
            value={changeReason}
            onChange={(event) => setChangeReason(event.target.value)}
            maxLength={6000}
            rows={2}
            placeholder="说明哪些事实、约束或执行信号发生了变化…"
            className="w-full rounded-lg border border-amber-800/70 bg-black/50 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      )}

      {/* 3 Asymmetric Strategy Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(Object.keys(strategyPackages) as StrategyKey[]).map((key, index) => {
          const pkg = strategyPackages[key];
          if (!pkg) return null;
          const isSelected = selectedStrategyKey === key;
          const pkgCode = `DOSSIER-#0${index + 1}`;

          return (
            <button
              key={key}
              onClick={() => handleSelectStrategy(key)}
              disabled={readOnly}
              className={`card-tactical p-5 rounded-2xl border text-left transition-all relative overflow-hidden shadow-2xl flex flex-col justify-between cursor-pointer group ${
                isSelected
                  ? 'border-red-500 ring-2 ring-red-500/50 shadow-red-950/60 hud-corner-red'
                  : 'border-white/[0.08] hover:border-white/[0.22] opacity-85 hover:opacity-100'
              }`}
            >
              <div className="card-tactical-holo absolute inset-0 pointer-events-none opacity-30"></div>

              <div>
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06] text-[10px] font-mono-code">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">[{pkgCode}]</span>
                    <span className="text-slate-500">|</span>
                    <span className="font-bold text-slate-300">
                      {key === 'LEVERAGE_STRIKE' ? '杠杆打击' : key === 'FIELD_SHIFT' ? '改变战场' : '焦土对冲'}
                    </span>
                  </div>
                  <span className="text-xs font-mono-code font-black text-emerald-400">
                    模板标注 {pkg.survivalProbability}%
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-2">{pkg.name}</h4>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-normal">
                  {pkg.coreIdea}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                <span>核心资产保全: <strong className="text-amber-300">{pkg.coreAssetProtectionRate}%</strong></span>
                <span className={`font-bold ${isSelected ? 'text-red-400' : 'text-slate-500'}`}>
                  {isSelected ? '● 正在推演' : '点击推演'}
                </span>
              </div>
            </button>
          );
        })}
      </div>


      {/* Ghost Timeline Simulator (幽灵时间线模拟器) */}
      <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-6 shadow-2xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-100">
              幽灵时间线动态模拟 (Ghost Timeline): {currentPkg.codeName}
            </h3>
          </div>
          <span className="text-[11px] font-mono-code text-amber-400/90">
            带 ★ 节点为高风险关键抉择点，点击可测试失败后果
          </span>
        </div>

        {/* Visual Timeline Canvas with Parallel Ghost Line */}
        <div className="space-y-6">
          
          {/* Milestone Node Points */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {currentPkg.ghostTimeline.map((point) => (
              <div
                key={point.day}
                onClick={() => {
                  if (point.isPivotalPoint) {
                    setActivePivotalModal({
                      day: point.day,
                      label: point.eventLabel || '关键节点',
                      risk: point.pivotalRiskDescription || '单点失败将直接导致整个战役崩盘。',
                    });
                    soundManager.playWarning();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                  point.isPivotalPoint
                    ? 'bg-red-950/30 border-red-600/80 shadow-lg cursor-pointer ring-1 ring-red-500/50 hover:bg-red-900/40'
                    : 'bg-black/50 border-white/[0.06]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between font-mono-code text-[11px] mb-1.5">
                    <span className="font-bold text-slate-400">Day {point.day}</span>
                    {point.isPivotalPoint && (
                      <span className="text-[9px] bg-red-950 text-red-300 border border-red-700 px-1.5 py-0.2 rounded font-bold animate-pulse">
                        ★ 关键节点
                      </span>
                    )}
                  </div>
                  <h6 className="font-bold text-slate-200 mb-2">{point.eventLabel}</h6>
                </div>

                <div className="space-y-1 text-[10px] font-mono-code pt-2 border-t border-white/[0.04]">
                  <div className="flex justify-between text-slate-400">
                    <span>现金跑道:</span>
                    <span className="text-amber-400 font-bold">{point.cashRunwayDays}天</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>胜算概率:</span>
                    <span className="text-emerald-400 font-bold">{point.survivalProb}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>客户信任:</span>
                    <span className="text-blue-400 font-bold">{point.customerTrust}分</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparative Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-black/50 p-4 rounded-xl border border-white/[0.06] text-xs">
              <span className="text-slate-500 font-mono-code block mb-1">30天预估留存现金</span>
              <span className="text-xl font-bold font-mono-code text-amber-300">
                ¥{currentPkg.estimatedCashAt30Days.toLocaleString()}
              </span>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-white/[0.06] text-xs">
              <span className="text-slate-500 font-mono-code block mb-1">60天逆境反转现金</span>
              <span className="text-xl font-bold font-mono-code text-emerald-400">
                ¥{currentPkg.estimatedCashAt60Days.toLocaleString()}
              </span>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-white/[0.06] text-xs">
              <span className="text-slate-500 font-mono-code block mb-1">核心资产保护率</span>
              <span className="text-xl font-bold font-mono-code text-blue-400">
                {currentPkg.coreAssetProtectionRate}%
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Deep Asymmetric Strategy Blueprint Detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Col: Core Linchpin & Resources */}
        <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
            <Crosshair className="w-4 h-4 text-red-400" />
            <span>核心支点与饱和资源清单 (Linchpin & All-in Resources)</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">【唯一支点 / 升维博弈机制】</span>
              <p className="bg-black/60 p-3.5 rounded-xl border border-red-900/50 text-red-200 font-medium leading-relaxed">
                {currentPkg.primaryLever}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">【需 All-in 调动的硬核资源】</span>
              <div className="space-y-1.5">
                {currentPkg.resourceList.map((res, idx) => (
                  <div key={idx} className="bg-black/50 p-3 rounded-xl border border-white/[0.05] text-slate-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                    <span>{res}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">【必须承受的牺牲清单 (Sacrifices)】</span>
              <div className="space-y-1.5">
                {currentPkg.sacrificeList.map((sac, idx) => (
                  <div key={idx} className="bg-amber-950/20 p-3 rounded-xl border border-amber-900/50 text-amber-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                    <span>{sac}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Action Dashboard (Critical Window, Leading Indicators, Abort Criteria) */}
        <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>执行窗口与断路中止条件 (Execution Window & Abort Criteria)</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="bg-black/50 p-3.5 rounded-xl border border-white/[0.06]">
              <span className="text-amber-400 font-bold block mb-1 font-mono-code text-[11px]">● 关键行动窗口 (Critical Window)：</span>
              <p className="text-slate-200">{currentPkg.criticalWindow}</p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">● 每日死盯的领先指标 (Leading Indicators)：</span>
              <div className="space-y-1.5">
                {currentPkg.leadingIndicators.map((ind, idx) => (
                  <div key={idx} className="bg-black/50 p-2.5 rounded-xl border border-white/[0.05] text-slate-300 flex items-start gap-2">
                    <span className="text-blue-400 font-mono-code font-bold shrink-0">#{idx + 1}</span>
                    <span>{ind}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-950/30 p-3.5 rounded-xl border border-red-800/80">
              <span className="text-red-400 font-bold block mb-1 font-mono-code text-[11px]">● 绝对红线中止条件 (Hard Abort Criteria)：</span>
              <p className="text-red-200 font-medium leading-relaxed">
                {currentPkg.abortCriteria}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">● 第一步行动指令 (First Strike)：</span>
              <p className="bg-blue-950/40 p-3.5 rounded-xl border border-blue-800/60 text-blue-200 font-medium">
                {currentPkg.initialFirstStep}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Lock Strategy Bottom Bar */}
      <div className="p-5 surface-obsidian border border-red-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl hud-corner-red">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-100">
            {isLocked ? `已锁定策略：${currentPkg.name}` : `准备锁定：${currentPkg.name}`}
          </h4>
          <p className="text-[11px] text-slate-400">
            锁定后，系统将正式以该非对称蓝图作为行动总纲，并开启决策复盘与DNA沉淀流程。
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {lockError && <span className="text-xs text-red-300 max-w-xs">{lockError}</span>}
          {onOpenValueModal && (
            <button
              onClick={onOpenValueModal}
              disabled={readOnly}
              className="py-2.5 px-3.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-700/80 text-purple-300 font-mono-code font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="价值观对齐与道德代价核验"
            >
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>价值观对齐</span>
            </button>
          )}

          {onOpenMetaphysicsModal && (
            <button
              onClick={onOpenMetaphysicsModal}
              disabled={readOnly}
              className="py-2.5 px-3.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/80 text-amber-300 font-mono-code font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="观天时 · 术数证据叠层与决策仪式"
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span>观天时·仪式</span>
            </button>
          )}

          {!isLocked ? (
            <button
              onClick={handleLockStrategy}
              disabled={readOnly || isLocking}
              className="py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold font-mono-code text-xs flex items-center gap-2 shadow-xl shadow-red-900/60 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isLocking ? '正在保存并锁定…' : '锁定破局策略'}</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={readOnly}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono-code text-xs flex items-center gap-2 shadow-xl shadow-emerald-950/60 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>进入第四阶段：冷酷复盘</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pivotal Node Stress Test Modal */}
      {activePivotalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#120a0a] border border-red-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between border-b border-red-900/60 pb-2.5">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-100">
                  关键节点压力测试 · Day {activePivotalModal.day}
                </h4>
              </div>
              <button 
                onClick={() => setActivePivotalModal(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-200">
                <strong>节点事件:</strong> {activePivotalModal.label}
              </div>

              <div className="bg-red-950/60 p-3 rounded-lg border border-red-800 text-red-200 leading-relaxed">
                <strong className="text-red-400 block mb-1">单点失败后果 (Failure Consequence)：</strong>
                {activePivotalModal.risk}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActivePivotalModal(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                已了解此风险敞口
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
