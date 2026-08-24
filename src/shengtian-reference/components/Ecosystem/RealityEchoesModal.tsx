/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  RealityEcho, 
  CausalDustEvent, 
  CausalDustOption 
} from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import { 
  X, 
  Flame, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Layers,
  HelpCircle
} from 'lucide-react';

interface RealityEchoesModalProps {
  battleId?: string;
  isOpen: boolean;
  onClose: () => void;
  echoes: RealityEcho[];
  onResolveDustEvent: (echoId: string, eventId: string, option: CausalDustOption) => void;
  onClaimEquilibriumReward: (echoId: string) => void;
  userEquity: number;
}

export const RealityEchoesModal: React.FC<RealityEchoesModalProps> = ({
  battleId,
  isOpen,
  onClose,
  echoes,
  onResolveDustEvent,
  onClaimEquilibriumReward,
  userEquity,
}) => {
  const [selectedEchoId, setSelectedEchoId] = useState<string>(echoes[0]?.id || '');
  const [selectedDustEvent, setSelectedDustEvent] = useState<CausalDustEvent | null>(null);
  const [resolvingOptionId, setResolvingOptionId] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEcho = echoes.find(e => e.id === selectedEchoId) || echoes[0];

  const handleSelectDust = (dust: CausalDustEvent) => {
    setSelectedDustEvent(dust);
    soundManager.playBlip(750, 0.03);
  };

  const handleExecuteResolution = async (option: CausalDustOption) => {
    if (!currentEcho || !selectedDustEvent) return;
    if (!battleId && userEquity < option.costEquity) {
      soundManager.playBlip(400, 0.08);
      return;
    }

    setResolvingOptionId(option.id);
    setUsageError(null);
    if (battleId) {
      try {
        await sessionApi.consumeUsage(battleId, 'reality_echo_resolution', `reality-echo:${battleId}:${currentEcho.id}:${selectedDustEvent.id}:${option.id}`);
      } catch (error) {
        setUsageError(error instanceof Error ? error.message : '平台权益校验失败，请重试。');
        setResolvingOptionId(null);
        return;
      }
    }
    window.setTimeout(() => {
      onResolveDustEvent(currentEcho.id, selectedDustEvent.id, option);
      setResolvingOptionId(null);
      setSelectedDustEvent(null);
      soundManager.playSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#080B12] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-amber-950/40 via-black to-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif-sc font-bold text-white tracking-tight">
                  现实回响控制中枢 (Reality Echoes Hub)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-amber-950/80 border border-amber-500/60 text-amber-300">
                  后果的重量 · 第一拼图
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                任何一次奇点破局都会对现实产生深远余震。化解因果尘埃，令现实回归终极平衡。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (2 Columns) */}
        {usageError && <div className="mx-5 mt-4 rounded-xl border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">{usageError}</div>}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
          
          {/* Left Column: Echo List & Equilibrium Timeline (5 cols) */}
          <div className="md:col-span-5 p-5 space-y-4 overflow-y-auto bg-black/30">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="text-slate-400 font-bold">活跃回响战局 ({echoes.length})</span>
              <span className="text-amber-400">回响期监控</span>
            </div>

            <div className="space-y-3">
              {echoes.map((echo) => {
                const isSelected = echo.id === currentEcho?.id;
                const isEquilibrium = echo.equilibriumStatus === 'EQUILIBRIUM_REACHED';
                const pendingDustCount = echo.causalDustEvents.filter(d => d.status === 'PENDING').length;

                return (
                  <div
                    key={echo.id}
                    onClick={() => {
                      setSelectedEchoId(echo.id);
                      setSelectedDustEvent(null);
                      soundManager.playBlip(750, 0.03);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500/70 shadow-lg shadow-amber-950/40'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-slate-900 border border-white/[0.1] text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        剩余回响期 {echo.remainingDays} / {echo.echoPeriodDays} 天
                      </span>
                      {isEquilibrium ? (
                        <span className="text-[10px] font-mono-code text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> 新稳态达成
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono-code text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60 flex items-center gap-1 font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> 尘埃待平息 ({pendingDustCount})
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{echo.battlefieldTitle}</h3>
                    <p className="text-xs text-amber-400/90 font-mono-code line-clamp-1 mb-2.5">
                      触发奇点: {echo.singularityStrategyName}
                    </p>

                    {/* Equilibrium Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                        <span>现实收敛平衡度</span>
                        <span className="text-amber-300 font-bold">{echo.equilibriumProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/[0.08]">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            isEquilibrium 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                              : 'bg-gradient-to-r from-amber-500 to-red-500'
                          }`}
                          style={{ width: `${echo.equilibriumProgress}%` }}
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Equilibrium Reward Claim Notice */}
            {currentEcho && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-black to-slate-900 border border-amber-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    终极平衡通证奖励
                  </span>
                  <span className="text-xs font-mono-code font-bold text-amber-400">
                    +{currentEcho.finalRewardEquity} 权益点
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  平息所有【因果尘埃】并渡过回响期后，系统将自动核发完整的因果终局权益。
                </p>
                {currentEcho.equilibriumStatus === 'EQUILIBRIUM_REACHED' && !currentEcho.finalRewardUnlocked ? (
                  <button
                    onClick={() => onClaimEquilibriumReward(currentEcho.id)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs font-mono-code flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-950"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>领取终极因果结算奖励 (+{currentEcho.finalRewardEquity} 权益)</span>
                  </button>
                ) : currentEcho.finalRewardUnlocked ? (
                  <div className="text-center py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-mono-code">
                    ✓ 终局因果奖励已入账
                  </div>
                ) : null}
              </div>
            )}

          </div>

          {/* Right Column: Causal Dust Events Resolution (7 cols) */}
          <div className="md:col-span-7 p-6 space-y-5 overflow-y-auto bg-black/50">
            {currentEcho ? (
              <>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono-code text-amber-400">后日谈叙事录</span>
                    <span className="text-[11px] font-mono-code text-slate-500">{currentEcho.createdAt}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{currentEcho.battlefieldTitle}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    {currentEcho.postDeductionNarrative}
                  </p>
                </div>

                {/* Causal Dust Events List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono-code">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      需平息的因果尘埃事件
                    </span>
                    <span className="text-slate-400 text-[11px]">选择应对动作消除负面回响</span>
                  </div>

                  {currentEcho.causalDustEvents.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-white/[0.1] rounded-2xl p-6 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-200">当前战局的因果尘埃已全部平息</p>
                      <p className="text-xs text-slate-500">现实结构已建立全新稳态，无额外次级危机发酵。</p>
                    </div>
                  ) : (
                    currentEcho.causalDustEvents.map((dust) => {
                      const isPending = dust.status === 'PENDING';
                      const isSelected = selectedDustEvent?.id === dust.id;

                      return (
                        <div
                          key={dust.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isPending 
                              ? isSelected 
                                ? 'bg-red-950/30 border-red-500/70 shadow-lg' 
                                : 'bg-red-950/15 border-red-900/40' 
                              : 'bg-black/30 border-emerald-900/40 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded font-bold ${
                                  isPending 
                                    ? 'bg-red-950 text-red-300 border border-red-700' 
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                }`}>
                                  {dust.collateralTypeName}
                                </span>
                                <span className="text-[10px] font-mono-code text-slate-400">
                                  起源: {dust.sourceSingularity}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-100 mt-1">{dust.title}</h4>
                            </div>

                            {isPending ? (
                              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 animate-pulse whitespace-nowrap">
                                待化解
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 whitespace-nowrap">
                                ✓ 已平息
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed mb-3">
                            {dust.description}
                          </p>

                          {/* If Resolved, show outcome feedback */}
                          {!isPending && dust.resolutionFeedback && (
                            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs font-mono-code">
                              <span className="text-emerald-400 font-bold block mb-0.5">平息反馈：</span>
                              {dust.resolutionFeedback}
                            </div>
                          )}

                          {/* If Pending, Show Options Action List */}
                          {isPending && (
                            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                              <span className="text-[11px] font-mono-code text-slate-400 block font-bold">
                                决策应对预案 (选择执行)：
                              </span>

                              {dust.options.map((opt) => (
                                <div 
                                  key={opt.id}
                                  className="p-3 rounded-xl bg-black/60 border border-white/[0.08] hover:border-amber-500/50 space-y-2 transition-all"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-xs font-bold text-slate-100">{opt.action}</p>
                                      <p className="text-[11px] text-slate-400">{opt.actionExplanation}</p>
                                    </div>
                                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 shrink-0 font-bold">
                                      期望成功率 {opt.outcomeProb}%
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                    <span className="text-[11px] font-mono-code text-emerald-400">
                                      收益: {opt.rewardDesc}
                                    </span>

                                    <button
                                      onClick={() => handleExecuteResolution(opt)}
                                      disabled={resolvingOptionId === opt.id}
                                      className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs font-mono-code flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                                    >
                                      {resolvingOptionId === opt.id ? (
                                        <span>平息收敛中...</span>
                                      ) : (
                                        <>
                                          <span>执行平息</span>
                                          {opt.costEquity > 0 && (
                                            <span className="text-[10px] bg-black/30 text-amber-950 px-1 rounded">
                                              -{opt.costEquity} 权益
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}

                            </div>
                          )}

                        </div>
                      );
                    })
                  )}

                </div>
              </>
            ) : null}
          </div>

        </div>

      </div>
    </div>
  );
};
