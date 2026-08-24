/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { 
  BattlefieldState, 
  CausalGraphNode, 
  CausalGraphEdge, 
  SingularityDeductionState 
} from '../../types';
import { HorizonGauge } from './HorizonGauge';
import { CausalHorizonStarfield } from './CausalHorizonStarfield';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import confetti from 'canvas-confetti';
import { 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Bot, 
  RotateCcw, 
  ShieldAlert, 
  Zap, 
  Lock, 
  Layers, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface SingularityDeductionViewProps {
  battlefield: BattlefieldState;
  battleId: string;
  onUpdateBattlefield: React.Dispatch<React.SetStateAction<BattlefieldState>>;
  onExitSingularityMode: () => void;
  onSaveDNARecord: (record: any) => void;
}

function buildSingularityGraph(battlefield: BattlefieldState) {
  const days = Math.max(1, Math.round(battlefield.financials?.calculatedDays || battlefield.targetDeadlineDays || 30));
  const cash = battlefield.financials?.availableCash ?? 0;
  const monthlyBurn = battlefield.financials?.monthlyBurn ?? 0;
  const burnRisk = monthlyBurn > 0 ? Math.min(0.98, Math.max(0.2, 1 - days / 180)) : 0.55;
  const primaryAsset = battlefield.assets?.[0];
  const primaryRisk = battlefield.riskBreakers?.[0];
  const assetLabel = primaryAsset?.title || '当前可用核心资产';
  const assetDescription = primaryAsset?.description || '请在底牌盘点中确认一项可用于改变博弈维度的资产。';
  const nodes: CausalGraphNode[] = [
    { id:'node-cash-burn', label:`${days}天现金耗尽点`, category:'ANCHOR', probability:burnRisk, gravityWeight:90, x:0, y:80, z:0, description:`基于当前战局现金 ${cash.toLocaleString()} 和月度支出 ${monthlyBurn.toLocaleString()} 推导的现金压力收束点。`, status:'DEFAULT' },
    { id:'node-constraint-trap', label:primaryRisk?.name || '关键约束挤压', category:'TRAP', probability:Math.min(0.96, 0.55 + (primaryRisk?.isTriggered ? 0.25 : 0)), gravityWeight:75, x:-120, y:20, z:-40, description:primaryRisk?.condition || '当前约束尚未完成事实核验，可能限制常规路径。', status:'DEFAULT' },
    { id:'node-asset-leverage', label:`${assetLabel} · 非对称支点`, category:'SINGULARITY', probability:Math.max(0.12, Math.min(0.7, 1 - burnRisk)), gravityWeight:40, x:130, y:-70, z:60, description:`推荐从真实底牌“${assetLabel}”寻找改变交易结构的路径：${assetDescription}`, status:'TARGETED' },
    { id:'node-fact-core', label:'已确认事实与关系', category:'FACT', probability:1, gravityWeight:20, x:40, y:-110, z:-80, description:`当前战局已记录 ${battlefield.interviewHistory?.length ?? 0} 条采访记录和 ${battlefield.assets?.length ?? 0} 项底牌。`, status:'DEFAULT' },
    { id:'node-alternative-path', label:'替代路径与外部协同', category:'VARIABLE', probability:Math.max(0.2, Math.min(0.8, 0.35 + (battlefield.assets?.length ?? 0) * 0.04)), gravityWeight:50, x:-80, y:-60, z:90, description:'将可验证资源、关系和时间窗口组合成一条可停止、可复盘的替代路径。', status:'DEFAULT' },
  ];
  const edges: CausalGraphEdge[] = [
    { source:'node-constraint-trap', target:'node-cash-burn', strength:0.9, isFatalCollapseLine:true },
    { source:'node-fact-core', target:'node-asset-leverage', strength:0.8 },
    { source:'node-asset-leverage', target:'node-alternative-path', strength:0.75 },
    { source:'node-alternative-path', target:'node-cash-burn', strength:-0.85 },
  ];
  const initialAlpha = Math.max(0.05, Math.min(0.49, 1 - burnRisk));
  const rippleSequence = [
    { step:1, title:'【锁定事实】冻结未经核验的常规假设', description:`先核对采访、约束和底牌，避免在 ${days} 天窗口内继续消耗现金。`, leverageAction:'把不确定性变成可验证任务', status:'PENDING' as const, alphaGain:0.12 },
    { step:2, title:`【非对称支点】调动 ${assetLabel}`, description:`围绕真实资产设计一项可停止的交易或协同动作，而不是继续跟随对手的比较维度。`, leverageAction:'以可验证资产换取时间或流动性', status:'PENDING' as const, alphaGain:0.2 },
    { step:3, title:'【奇点引爆】锁定首个可逆执行承诺', description:'记录负责人、截止时间、成功信号和止损条件，完成一次可复盘的现实动作。', leverageAction:'把策略从想法变成可审计执行', status:'PENDING' as const, alphaGain:0.24 },
  ];
  return { nodes, edges, initialAlpha, rippleSequence };
}

export const SingularityDeductionView: React.FC<SingularityDeductionViewProps> = ({
  battlefield,
  battleId,
  onUpdateBattlefield,
  onExitSingularityMode,
  onSaveDNARecord,
}) => {
  const graph = useMemo(() => buildSingularityGraph(battlefield), [battlefield]);
  const [singularityState, setSingularityState] = useState<SingularityDeductionState>({
    alphaProbability: graph.initialAlpha,
    previousAlpha: graph.initialAlpha,
    isWarningState: false,
    isHorizonBreached: false,
    observerFogIntensity: 0,
    competingObserversCount: 2,
    singularityTargetNodeId: 'node-asset-leverage',
    rippleSequence: graph.rippleSequence,
  });

  const [selectedNode, setSelectedNode] = useState<CausalGraphNode | undefined>(graph.nodes[2]);
  const [stateHydrated, setStateHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void sessionApi.module(battleId, 'singularity-deduction').then(({ state }) => {
      const envelope = state as { state?: unknown } | null;
      const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { singularityState?: SingularityDeductionState; selectedNodeId?: string } | null;
      if (cancelled) return;
      if (saved?.singularityState) setSingularityState(saved.singularityState);
      if (saved?.selectedNodeId) setSelectedNode(graph.nodes.find((node) => node.id === saved.selectedNodeId) ?? graph.nodes[2]);
      setStateHydrated(true);
    }).catch(() => { if (!cancelled) setStateHydrated(true); });
    return () => { cancelled = true; };
  }, [battleId, graph.nodes]);

  useEffect(() => {
    if (!stateHydrated) return;
    const timer = window.setTimeout(() => {
      void sessionApi.saveModule(battleId, 'singularity-deduction', { singularityState, selectedNodeId: selectedNode?.id }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [battleId, stateHydrated, singularityState, selectedNode?.id]);

  // Execute Step in Ripple Sequence
  const handleExecuteRippleStep = (stepNumber: number) => {
    soundManager.playBlip(800 + stepNumber * 100, 0.04);
    
    setSingularityState(prev => {
      let addedAlpha = 0;
      const updatedSteps = prev.rippleSequence.map(s => {
        if (s.step === stepNumber && s.status === 'PENDING') {
          addedAlpha = s.alphaGain;
          return { ...s, status: 'COMPLETED' as const };
        }
        return s;
      });

      const nextAlpha = Math.min(1.0, prev.alphaProbability + addedAlpha);
      const isBreached = nextAlpha >= 0.5;

      if (isBreached && prev.alphaProbability < 0.5) {
        soundManager.playStrategyLocked();
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.4 },
          colors: ['#FFB800', '#FFA500', '#FFD700', '#00F0FF'],
        });
      }

      return {
        ...prev,
        alphaProbability: nextAlpha,
        previousAlpha: prev.alphaProbability,
        isWarningState: nextAlpha >= 0.45 && nextAlpha < 0.5,
        isHorizonBreached: isBreached,
        rippleSequence: updatedSteps,
      };
    });
  };

  const handleResetSingularity = () => {
    setSingularityState(prev => ({
      ...prev,
      alphaProbability: graph.initialAlpha,
      previousAlpha: graph.initialAlpha,
      isWarningState: false,
      isHorizonBreached: false,
      rippleSequence: graph.rippleSequence,
    }));
    soundManager.playBlip(500, 0.05);
  };

  const handleToggleFog = () => {
    setSingularityState(prev => ({
      ...prev,
      observerFogIntensity: prev.observerFogIntensity > 0 ? 0 : 0.8,
    }));
    soundManager.playBlip(650, 0.03);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Protocol Status Bar */}
      <div className="surface-obsidian-war border border-red-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-600 flex items-center justify-center text-amber-400 font-bold shadow-lg shadow-red-950">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>奇点推演模式 · SINGULARITY DEDUCTION</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                ULTIMATE PROTOCOL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-code">
              战局：{battlefield.title} · 当前AI顾问：{battlefield.selectedPersona || 'ANALYST'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSingularity}
            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono-code text-slate-300 border border-white/[0.08] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置推演</span>
          </button>

          <button
            onClick={onExitSingularityMode}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-mono-code text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>返回因果工坊</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TOP FOCUS ZONE (1/5 Screen): Horizon Gauge */}
      <HorizonGauge
        alphaProbability={singularityState.alphaProbability}
        fogIntensity={singularityState.observerFogIntensity}
        competingObserversCount={singularityState.competingObserversCount}
        onToggleFogSimulation={handleToggleFog}
      />

      {/* CENTRAL 3D STARFIELD: Causal Horizon */}
      <CausalHorizonStarfield
        nodes={graph.nodes}
        edges={graph.edges}
        selectedNodeId={selectedNode?.id}
        onSelectNode={setSelectedNode}
        onTargetSingularity={(nodeId) => {
          setSelectedNode(graph.nodes.find((node) => node.id === nodeId) ?? selectedNode);
          soundManager.playBlip(900, 0.05);
        }}
      />

      {/* BOTTOM ACTION SCRIPT: Ripple Sequence (涟漪序列) */}
      <div className="surface-obsidian-war border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono-code font-bold text-xs flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              <span>涟漪序列 · RIPPLE ACTION SCRIPT</span>
            </span>
            <span className="text-xs text-slate-400 font-mono-code">
              引爆破局奇点的确定性执行步骤
            </span>
          </div>

          <div className="text-xs font-mono-code text-slate-400">
            完成进度: {singularityState.rippleSequence.filter(s => s.status === 'COMPLETED').length} / {singularityState.rippleSequence.length}
          </div>
        </div>

        {/* Step List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {singularityState.rippleSequence.map((step) => {
            const isDone = step.status === 'COMPLETED';
            return (
              <div
                key={step.step}
                className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                  isDone
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/40'
                    : 'bg-black/40 border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono-code font-bold text-amber-400">
                      STEP 0{step.step}
                    </span>
                    <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      +{(step.alphaGain * 100).toFixed(1)}% α几率
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug">{step.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{step.description}</p>
                </div>

                <div className="pt-3 mt-2 border-t border-white/[0.05]">
                  <button
                    disabled={isDone}
                    onClick={() => handleExecuteRippleStep(step.step)}
                    className={`w-full py-2 px-3 rounded-xl font-mono-code font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isDone
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 cursor-default'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-md shadow-amber-950 cursor-pointer'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已执行确认</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-black" />
                        <span>确认执行此步骤</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
