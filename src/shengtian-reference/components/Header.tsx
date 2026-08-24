/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Flame,
  Volume2, 
  VolumeX, 
  HelpCircle,
  SlidersHorizontal,
  Globe,
  History,
  Zap,
  User,
  Sparkles,
  Layers,
  FolderGit2,
  ChevronDown,
  FileText,
  BrainCircuit
} from 'lucide-react';
import { AIPersonaType, DeciderSigil, UserProfile } from '../types';
import { soundManager } from '../utils/soundEffects';

interface HeaderProps {
  activeMainView: 'WAR_ROOM' | 'CONCLAVES' | 'DECISION_BOARD' | 'CASE_LAB' | 'COGNITIVE_DNA' | 'MARKETPLACE' | 'WORLD_PULSE';
  onChangeMainView: (view: 'WAR_ROOM' | 'CONCLAVES' | 'DECISION_BOARD' | 'CASE_LAB' | 'COGNITIVE_DNA' | 'MARKETPLACE' | 'WORLD_PULSE') => void;
  breakthroughActive: boolean;
  onOpenBreakthroughModal: () => void;
  onOpenGuideModal: () => void;
  onOpenSensoryModal: () => void;
  onOpenProfileModal: () => void;
  onOpenStoreModal: () => void;
  onOpenDeepArchivesModal: () => void;
  onOpenWarRoomsModal: () => void;
  onOpenExportBrief: () => void;
  onOpenDNAArchive: () => void;
  onResetToStandard: () => void;
  isRiskTriggered: boolean;
  selectedPersona: AIPersonaType;
  observerAlertCount: number;
  stressLevel: number;
  userEquity: number;
  sigil?: DeciderSigil;
  currentBattlefieldTitle?: string;
  currentBattlefieldDays?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeMainView,
  onChangeMainView,
  breakthroughActive,
  onOpenBreakthroughModal,
  onOpenGuideModal,
  onOpenSensoryModal,
  onOpenProfileModal,
  onOpenStoreModal,
  onOpenDeepArchivesModal,
  onOpenWarRoomsModal,
  onOpenExportBrief,
  onOpenDNAArchive,
  onResetToStandard,
  isRiskTriggered,
  selectedPersona,
  observerAlertCount,
  stressLevel,
  userEquity,
  sigil,
  currentBattlefieldTitle,
  currentBattlefieldDays,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const navLinks = [
    { id: 'WAR_ROOM' as const, label: '因果工作室', badge: '核心战场' },
    { id: 'CONCLAVES' as const, label: '密会公会', badge: '组织协同' },
    { id: 'DECISION_BOARD' as const, label: '决策委员会', badge: '智囊协同' },
    { id: 'WORLD_PULSE' as const, label: '世界脉搏', badge: '全局事件' },
    { id: 'CASE_LAB' as const, label: '案例推演所', badge: '无风险试错' },
    { id: 'COGNITIVE_DNA' as const, label: '认知图谱', badge: 'DNA沙盒' },
    { id: 'MARKETPLACE' as const, label: '技能市场', badge: '生态通证' },
  ];

  return (
    <header className={`w-full border-b transition-all duration-700 sticky top-0 z-40 backdrop-blur-xl ${
      breakthroughActive 
        ? 'bg-[#06080d]/95 border-red-900/40 shadow-2xl shadow-red-950/30' 
        : 'bg-[#080b12]/95 border-white/[0.08] shadow-xl'
    }`}>
      {/* Precision Top Hairline */}
      <div className={`h-[1px] w-full transition-colors duration-700 ${
        breakthroughActive 
          ? 'bg-gradient-to-r from-transparent via-red-500/80 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-blue-500/50 to-transparent'
      }`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        
        {/* Zone 1: Luxury Brand Mark & Causal War Rooms Popup Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-serif-sc font-black text-lg shadow-lg border transition-all relative overflow-hidden ${
              breakthroughActive
                ? 'bg-gradient-to-b from-red-950 to-red-900 border-red-600 text-red-300 shadow-red-950/60'
                : 'bg-gradient-to-b from-slate-900 to-slate-950 border-white/[0.12] text-amber-300 shadow-black/40'
            }`}>
              <span>胜</span>
              {breakthroughActive && (
                <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
              )}
            </div>
            <span className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t border-l border-amber-400/80" />
            <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b border-r border-amber-400/80" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-serif-sc font-bold text-base tracking-tight text-white whitespace-nowrap drop-shadow-sm">
              胜天半子
            </span>
          </div>

          {/* 战局管理中心 CAUSAL WAR ROOMS 点击弹出按钮 */}
          <button
            onClick={() => {
              onOpenWarRoomsModal();
              soundManager.playBlip(750, 0.03);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 border border-blue-500/40 hover:border-blue-400/70 text-slate-200 hover:text-white transition-all cursor-pointer shadow-md group inner-glow-blue shrink-0"
            title="打开战局管理中心 (CAUSAL WAR ROOMS)"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-950 border border-blue-500/50 flex items-center justify-center text-blue-300 group-hover:scale-105 transition-transform">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-blue-200">
                  战局管理中心
                </span>
                {currentBattlefieldDays !== undefined && (
                  <span className="text-[9px] font-mono-code px-1 py-0.2 rounded bg-red-950/90 text-red-300 border border-red-800/80 font-bold">
                    {currentBattlefieldDays}D
                  </span>
                )}
              </div>
              <span className="text-[9px] text-cyan-400/90 font-mono-code tracking-wider block font-medium">
                CAUSAL WAR ROOMS
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-300 transition-colors ml-0.5" />
          </button>
        </div>

        {/* Zone 2: Navigation Links (6 single-line items) */}
        <nav className="hidden xl:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
          {navLinks.map((tab) => {
            const isActive = activeMainView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onChangeMainView(tab.id);
                  soundManager.playBlip(700, 0.03);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Strategic Action Center & Identity Tokens */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Deep Archives */}
          <button
            onClick={onOpenDeepArchivesModal}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-purple-300 text-xs font-mono-code flex items-center gap-1.5 transition-all cursor-pointer"
            title="查看历史绝境破局快照 (深网档案)"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">深网</span>
          </button>

          {/* Decision DNA archive */}
          <button
            onClick={onOpenDNAArchive}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-cyan-300 text-xs font-mono-code flex items-center gap-1.5 transition-all cursor-pointer"
            title="打开决策 DNA 档案"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">DNA</span>
          </button>

          {/* Export tactical brief */}
          <button
            onClick={onOpenExportBrief}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-blue-300 text-xs font-mono-code flex items-center gap-1.5 transition-all cursor-pointer"
            title="导出战局决策简报"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">导出</span>
          </button>

          {/* Token Equity Ledger / Store */}
          <button
            onClick={onOpenStoreModal}
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/80 text-amber-300 text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="推演权益商店"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{userEquity}</span>
          </button>

          {/* User Profile & Sigil Badge */}
          <button
            onClick={onOpenProfileModal}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-mono-code flex items-center gap-1.5 transition-all cursor-pointer"
            title="查看执棋官档案与决策者烙印"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">{sigil ? sigil.name.replace(/【|】/g, '') : '执棋官'}</span>
          </button>

          {/* Sensory Hub */}
          <button
            onClick={onOpenSensoryModal}
            className="p-2 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-white text-xs transition-all cursor-pointer"
            title="战术感知中心"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          </button>

          {/* Audio toggle */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-lg bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer"
            title={isMuted ? '开启战术音效' : '静音战术音效'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Breakthrough / Singularity Primary Action */}
          {breakthroughActive ? (
            <button
              onClick={onResetToStandard}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/[0.15] text-slate-200 hover:text-white text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <span>退出奇点</span>
            </button>
          ) : (
            <button
              onClick={onOpenBreakthroughModal}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono-code flex items-center gap-1.5 transition-all cursor-pointer shadow-lg border whitespace-nowrap ${
                isRiskTriggered
                  ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-red-400 shadow-red-950/60 animate-pulse'
                  : 'bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 text-red-200 border-red-700/80 shadow-red-950/40'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">激活奇点推演</span>
              <span className="sm:hidden">奇点</span>
            </button>
          )}

        </div>

      </div>

      {/* Mobile / Tablet Sub-Navigation Bar */}
      <div className="xl:hidden flex items-center justify-around border-t border-white/[0.06] bg-black/60 px-2 py-1.5 overflow-x-auto">
        {navLinks.map((tab) => {
          const isActive = activeMainView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                onChangeMainView(tab.id);
                soundManager.playBlip(700, 0.03);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-mono-code font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
