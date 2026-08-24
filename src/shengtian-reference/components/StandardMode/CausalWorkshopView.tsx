/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BattlefieldState, 
  UserProfile, 
  DeciderSigil, 
  AISymbioteState,
  ObserverConclave
} from '../../types';
import { InterviewTab } from './InterviewTab';
import { CardsInventoryTab } from './CardsInventoryTab';
import { PathSimulationTab } from './PathSimulationTab';
import { RiskMonitorTab } from './RiskMonitorTab';
import { soundManager } from '../../utils/soundEffects';
import { 
  FolderGit2, 
  Layers, 
  GitBranch, 
  ShieldAlert, 
  Share2, 
  Sparkles, 
  Flame, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  MessageSquare,
  Crown,
  Users,
  Brain,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface CausalWorkshopViewProps {
  battlefield: BattlefieldState;
  battleId: string;
  onUpdateBattlefield: React.Dispatch<React.SetStateAction<BattlefieldState>>;
  userProfile?: UserProfile;
  sigil?: DeciderSigil;
  onLaunchSingularity: () => void;
  onOpenCausalLinkModal: () => void;
  onOpenWarRoomsModal: () => void;
  activeStandardTab: 'interview' | 'cards' | 'simulation' | 'risks';
  onSelectStandardTab: (tab: 'interview' | 'cards' | 'simulation' | 'risks') => void;
  onOpenRealityEchoesModal: () => void;
  onOpenAISymbioteModal: () => void;
  onOpenArchonSanctumModal: () => void;
  onNavigateToConclaves: () => void;
  activeEchoesCount: number;
  pendingDustCount: number;
  symbioteState: AISymbioteState;
  userConclave?: ObserverConclave;
}

export const CausalWorkshopView: React.FC<CausalWorkshopViewProps> = ({
  battlefield,
  battleId,
  onUpdateBattlefield,
  userProfile,
  sigil,
  onLaunchSingularity,
  onOpenCausalLinkModal,
  onOpenWarRoomsModal,
  activeStandardTab,
  onSelectStandardTab,
  onOpenRealityEchoesModal,
  onOpenAISymbioteModal,
  onOpenArchonSanctumModal,
  onNavigateToConclaves,
  activeEchoesCount,
  pendingDustCount,
  symbioteState,
  userConclave,
}) => {
  const isRiskTriggered = battlefield.riskBreakers?.some(r => r.isTriggered) ?? false;
  const triggeredRisksCount = (battlefield.riskBreakers || []).filter(r => r.isTriggered).length;

  return (
    <div className="w-full space-y-6 font-sans">
      
      {/* ========================================================================= */}
      {/* TOP COMMAND BANNER: Current Battlefield HUD (Glassmorphism Frosted Panel) */}
      {/* ========================================================================= */}
      <section className="glass-content rounded-2xl p-3 sm:p-4 border border-white/[0.08] shadow-2xl relative overflow-hidden">
        {/* Subtle Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

        <div className="space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            
            {/* Title & Tactical Tags */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Click to open War Rooms Modal */}
                <button
                  onClick={() => {
                    onOpenWarRoomsModal();
                    soundManager.playBlip(750, 0.03);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-950/80 hover:bg-blue-900/90 text-blue-300 border border-blue-500/50 hover:border-blue-400 font-mono-code font-bold text-xs transition-all cursor-pointer shadow-md group inner-glow-blue"
                  title="点击切换其他因果战局"
                >
                  <FolderGit2 className="w-3 h-3 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>战局管理中心</span>
                  <span className="text-[10px] text-cyan-400 bg-black/40 px-1 rounded">切换</span>
                </button>

                <span className="text-[11px] font-mono-code text-red-300 bg-red-950/90 px-2 py-1 rounded-md border border-red-700/80 font-bold flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-red-400" />
                  现金死线 {battlefield.financials ? `${battlefield.financials.calculatedDays} 天` : '待核验'}
                </span>

                <span className="text-[11px] font-mono-code text-emerald-300 bg-emerald-950/70 px-2 py-1 rounded-md border border-emerald-700/70 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  常规收敛度 {typeof battlefield.confidence === 'number' ? `${battlefield.confidence}%` : '待核验'}
                </span>

                {triggeredRisksCount > 0 && (
                  <span className="text-[11px] font-mono-code text-amber-300 bg-amber-950/80 px-2 py-1 rounded-md border border-amber-700/80 font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    断路器告警 ({triggeredRisksCount})
                  </span>
                )}
              </div>
              
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {battlefield.title}
              </h1>
              <p className="text-xs text-slate-300">
                {battlefield.subtitle}
              </p>
            </div>

            {/* Singularity Launch & Quick Command Actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={onOpenCausalLinkModal}
                className="py-1 px-2.5 rounded-lg bg-black/50 hover:bg-cyan-950/50 text-cyan-300 border border-cyan-800/60 font-mono-code text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:scale-105"
                title="48小时加密协同推演"
              >
                <Share2 className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">48h 协同</span>
              </button>

              <button
                onClick={onOpenRealityEchoesModal}
                className="py-1 px-2.5 rounded-lg bg-black/50 hover:bg-amber-950/50 text-amber-300 border border-amber-800/60 font-mono-code text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:scale-105 relative"
                title="现实回响控制中枢"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">现实回响</span>
                {pendingDustCount > 0 && (
                  <span className="w-3 h-3 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {pendingDustCount}
                  </span>
                )}
              </button>

              <button
                onClick={onLaunchSingularity}
                className={`py-1.5 px-3 rounded-lg font-mono-code font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl border whitespace-nowrap ${
                  isRiskTriggered
                    ? 'bg-gradient-to-r from-red-600 via-amber-600 to-red-500 hover:from-red-500 hover:to-amber-500 text-white border-red-400 shadow-red-950/80 animate-pulse scale-105'
                    : 'bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 text-red-200 border-red-700/80 shadow-red-950/50 hover:scale-105'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>激活奇点推演 (破局突破)</span>
              </button>
            </div>

          </div>

          {/* Key Strategic Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.08]">
            <div className="p-1.5 rounded-lg bg-black/40 border border-red-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Clock className="w-3 h-3 text-red-400" />
                <span className="font-mono-code">现金跑道死线</span>
              </div>
              <span className="text-xs font-mono-code font-bold text-red-400">
                {battlefield.financials ? `${battlefield.financials.calculatedDays} 天` : '待核验'}
              </span>
            </div>

            <div className="p-1.5 rounded-lg bg-black/40 border border-blue-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <TrendingUp className="w-3 h-3 text-blue-400" />
                <span className="font-mono-code">常规收敛概率</span>
              </div>
              <span className="text-xs font-mono-code font-bold text-blue-400">
                {typeof battlefield.confidence === 'number' ? `${battlefield.confidence}%` : '待核验'}
              </span>
            </div>

            <div className="p-1.5 rounded-lg bg-black/40 border border-amber-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="font-mono-code">风险断路器</span>
              </div>
              <span className="text-xs font-mono-code font-bold text-amber-400">
                {triggeredRisksCount} / {battlefield.riskBreakers?.length ?? 0} 触发
              </span>
            </div>

            <div 
              onClick={onOpenAISymbioteModal}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Brain className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-mono-code">AI共生体</span>
              </div>
              <span className="text-xs font-mono-code font-bold text-cyan-300 flex items-center gap-1">
                <span>LV.{symbioteState.bondLevel}</span>
                <ChevronRight className="w-3 h-3 text-cyan-400" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4 CORE TABS WORKSPACE CONTAINER (Glassmorphism Frosted Panel blur(20px)) */}
      {/* ========================================================================= */}
      <section className="glass-content rounded-2xl p-3 sm:p-4 border border-white/[0.08] shadow-2xl space-y-6">
        
        {/* Tab Switcher Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <nav className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => {
                onSelectStandardTab('interview');
                soundManager.playBlip(700, 0.03);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-mono-code font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeStandardTab === 'interview'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>01 战局采访</span>
            </button>

            <button
              onClick={() => {
                onSelectStandardTab('cards');
                soundManager.playBlip(700, 0.03);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-mono-code font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeStandardTab === 'cards'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>02 六维底牌</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-blue-200">
                {battlefield.assets?.length ?? 0}
              </span>
            </button>

            <button
              onClick={() => {
                onSelectStandardTab('simulation');
                soundManager.playBlip(700, 0.03);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-mono-code font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeStandardTab === 'simulation'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <GitBranch className="w-3 h-3" />
              <span>03 路径推演</span>
            </button>

            <button
              onClick={() => {
                onSelectStandardTab('risks');
                soundManager.playBlip(700, 0.03);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-mono-code font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeStandardTab === 'risks'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>04 风险断路器</span>
              {triggeredRisksCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-700">
                  {triggeredRisksCount} 触发
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Active Content Display */}
        <div className="min-h-[500px]">
          {activeStandardTab === 'interview' && (
            <InterviewTab
              battlefield={battlefield}
              onUpdateBattlefield={onUpdateBattlefield as any}
              onNavigateToCards={() => onSelectStandardTab('cards')}
            />
          )}

          {activeStandardTab === 'cards' && (
            <CardsInventoryTab
              battlefield={battlefield}
              onUpdateBattlefield={onUpdateBattlefield as any}
              onNavigateToSimulation={() => onSelectStandardTab('simulation')}
            />
          )}

          {activeStandardTab === 'simulation' && (
            <PathSimulationTab
              battlefield={battlefield}
              battleId={battleId}
              onUpdateBattlefield={onUpdateBattlefield as any}
              onTriggerBreakthrough={onLaunchSingularity}
            />
          )}

          {activeStandardTab === 'risks' && (
            <RiskMonitorTab
              battlefield={battlefield}
              battleId={battleId}
              onUpdateBattlefield={onUpdateBattlefield as any}
              onLaunchBreakthrough={onLaunchSingularity}
            />
          )}
        </div>

      </section>

    </div>
  );
};
