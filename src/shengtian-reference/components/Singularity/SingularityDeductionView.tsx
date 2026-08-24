/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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

const INITIAL_NODES: CausalGraphNode[] = [
  {
    id: 'node-cash-burn',
    label: '42天现金耗尽点',
    category: 'ANCHOR',
    probability: 0.95,
    gravityWeight: 90,
    x: 0,
    y: 80,
    z: 0,
    description: '常规路径下资金消耗殆尽的宿命收束点。若不打破规则，95%几率在此终结。',
    status: 'DEFAULT',
  },
  {
    id: 'node-competitor-squeeze',
    label: '资方与竞品双重绞杀',
    category: 'TRAP',
    probability: 0.88,
    gravityWeight: 75,
    x: -120,
    y: 20,
    z: -40,
    description: '对手利用资本规模压制供应链，迫使团队在传统存量赛道内流血牺牲。',
    status: 'DEFAULT',
  },
  {
    id: 'node-client-leverage',
    label: '核心专利产业化授权',
    category: 'SINGULARITY',
    probability: 0.22,
    gravityWeight: 40,
    x: 130,
    y: -70,
    z: 60,
    description: '【推荐破局奇点】跳出传统销售模式，将核心底层专利对产业龙头进行独家授权过桥。',
    status: 'TARGETED',
  },
  {
    id: 'node-team-core',
    label: '骨干研发火种',
    category: 'FACT',
    probability: 1.0,
    gravityWeight: 20,
    x: 40,
    y: -110,
    z: -80,
    description: '团队在微纳米光学领域的原创专利矩阵，是唯一的不可替代底牌。',
    status: 'DEFAULT',
  },
  {
    id: 'node-ecosystem-alliance',
    label: '跨界产业资本联合体',
    category: 'VARIABLE',
    probability: 0.35,
    gravityWeight: 50,
    x: -80,
    y: -60,
    z: 90,
    description: '引入非传统VC的产业战略投资人，以订单包销形式提供无稀释过桥资金。',
    status: 'DEFAULT',
  },
];

const INITIAL_EDGES: CausalGraphEdge[] = [
  { source: 'node-competitor-squeeze', target: 'node-cash-burn', strength: 0.9, isFatalCollapseLine: true },
  { source: 'node-team-core', target: 'node-client-leverage', strength: 0.8 },
  { source: 'node-client-leverage', target: 'node-ecosystem-alliance', strength: 0.75 },
  { source: 'node-ecosystem-alliance', target: 'node-cash-burn', strength: -0.85 },
];

export const SingularityDeductionView: React.FC<SingularityDeductionViewProps> = ({
  battlefield,
  battleId,
  onUpdateBattlefield,
  onExitSingularityMode,
  onSaveDNARecord,
}) => {
  const [singularityState, setSingularityState] = useState<SingularityDeductionState>({
    alphaProbability: 0.1845,
    previousAlpha: 0.1845,
    isWarningState: false,
    isHorizonBreached: false,
    observerFogIntensity: 0,
    competingObserversCount: 2,
    singularityTargetNodeId: 'node-client-leverage',
    rippleSequence: [
      {
        step: 1,
        title: '【撕裂自欺】封存全部存量亏损业务线',
        description: '单方面终止跟进3个低毛利定制项目，节省每月固定支出 65%。',
        leverageAction: '剥离伪需求，保全核心现金火种',
        status: 'PENDING',
        alphaGain: 0.155,
      },
      {
        step: 2,
        title: '【非对称支点】向产业龙头提交独家专利过桥授权提案',
        description: '绕过财务投资人，直接与产业头部达成「¥1,500万订单预付款+独家专利授权」。',
        leverageAction: '以核心技术垄断权置换绝对流动性',
        status: 'PENDING',
        alphaGain: 0.245,
      },
      {
        step: 3,
        title: '【奇点引爆】签署过桥意向并锁定对赌保护屏障',
        description: '完成首期 ¥500万资金到账，正式突破 50% 宿命地平线，彻底脱离重力下坠。',
        leverageAction: '确立高维生存轨道',
        status: 'PENDING',
        alphaGain: 0.285,
      },
    ],
  });

  const [selectedNode, setSelectedNode] = useState<CausalGraphNode | undefined>(INITIAL_NODES[2]);
  const [stateHydrated, setStateHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void sessionApi.module(battleId, 'singularity-deduction').then(({ state }) => {
      const saved = state as { singularityState?: SingularityDeductionState; selectedNodeId?: string } | null;
      if (cancelled) return;
      if (saved?.singularityState) setSingularityState(saved.singularityState);
      if (saved?.selectedNodeId) setSelectedNode(INITIAL_NODES.find((node) => node.id === saved.selectedNodeId) ?? INITIAL_NODES[2]);
      setStateHydrated(true);
    }).catch(() => { if (!cancelled) setStateHydrated(true); });
    return () => { cancelled = true; };
  }, [battleId]);

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
      alphaProbability: 0.1845,
      previousAlpha: 0.1845,
      isWarningState: false,
      isHorizonBreached: false,
      rippleSequence: prev.rippleSequence.map(s => ({ ...s, status: 'PENDING' })),
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
        nodes={INITIAL_NODES}
        edges={INITIAL_EDGES}
        selectedNodeId={selectedNode?.id}
        onSelectNode={setSelectedNode}
        onTargetSingularity={(nodeId) => {
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
