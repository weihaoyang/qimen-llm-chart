import React, { useState } from 'react';
import { 
  X, 
  FolderGit2, 
  Plus, 
  Search, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Share2, 
  Sparkles, 
  Crown, 
  Users, 
  Brain, 
  Heart, 
  Compass, 
  CheckCircle2,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { BattlefieldState, AISymbioteState } from '../../types';
import { soundManager } from '../../utils/soundEffects';

export interface WarRoomItem {
  id: string;
  title: string;
  subtitle: string;
  status: 'CRITICAL' | 'STABLE' | 'ARCHIVED';
  updatedAt: string;
  isShared: boolean;
  daysLeft: number;
  confidence: number;
  industry: string;
}

interface WarRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBattlefield: BattlefieldState;
  battlefieldList: WarRoomItem[];
  selectedBattlefieldId: string;
  onSelectBattlefield: (item: WarRoomItem) => void;
  onCreateNewBattlefield: () => void;
  onOpenCausalLinkModal: () => void;
  onOpenRealityEchoesModal: () => void;
  onOpenArchonSanctumModal: () => void;
  onNavigateToConclaves: () => void;
  onOpenAISymbioteModal: () => void;
  activeEchoesCount: number;
  pendingDustCount: number;
  symbioteState: AISymbioteState;
}

export const WarRoomsModal: React.FC<WarRoomsModalProps> = ({
  isOpen,
  onClose,
  currentBattlefield,
  battlefieldList,
  selectedBattlefieldId,
  onSelectBattlefield,
  onCreateNewBattlefield,
  onOpenCausalLinkModal,
  onOpenRealityEchoesModal,
  onOpenArchonSanctumModal,
  onNavigateToConclaves,
  onOpenAISymbioteModal,
  activeEchoesCount,
  pendingDustCount,
  symbioteState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  if (!isOpen) return null;

  const filteredList = battlefieldList.filter(item => {
    if (activeTab === 'ACTIVE' && item.status === 'ARCHIVED') return false;
    if (activeTab === 'ARCHIVED' && item.status !== 'ARCHIVED') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.industry.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-4xl surface-obsidian rounded-3xl border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/90 border border-blue-500/50 flex items-center justify-center text-blue-300 shadow-lg inner-glow-blue">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  战局管理中心
                </h2>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-bold uppercase tracking-wider">
                  CAUSAL WAR ROOMS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                高维战局切换、历史因果档案与多维推演沙盒调度
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onCreateNewBattlefield();
                onClose();
              }}
              className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-950 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>新建推演战局</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/[0.06]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (8 cols): Battlefield Search & Cards List */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Search Bar & Status Switcher */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="快速检索战局标题、产业赛道或核心死线..."
                  className="w-full bg-black/60 border border-white/[0.1] focus:border-blue-500/80 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono-code focus:outline-none transition-colors"
                />
              </div>

              <div className="flex bg-black/50 p-1 rounded-xl border border-white/[0.08] text-xs font-mono-code shrink-0">
                <button
                  onClick={() => setActiveTab('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'ACTIVE'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  进行中 ({battlefieldList.filter(b => b.status !== 'ARCHIVED').length})
                </button>
                <button
                  onClick={() => setActiveTab('ARCHIVED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'ARCHIVED'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  已归档 ({battlefieldList.filter(b => b.status === 'ARCHIVED').length || 12})
                </button>
              </div>
            </div>

            {/* Battlefield Cards Grid */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredList.map((item) => {
                const isSelected = selectedBattlefieldId === item.id;
                const isCritical = item.status === 'CRITICAL';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectBattlefield(item);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl transition-all cursor-pointer space-y-2.5 relative group border ${
                      isSelected
                        ? 'bg-blue-950/50 border-cyan-500/60 inner-glow-blue scanline-card shadow-lg shadow-blue-950/60'
                        : 'bg-black/40 hover:bg-slate-900/60 border-white/[0.08] hover:border-white/20'
                    } ${isCritical && isSelected ? 'scanline-card-red inner-glow-red border-red-500/60' : ''}`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between text-xs font-mono-code">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] border ${
                          isCritical
                            ? 'bg-red-950/90 border-red-700/80 text-red-300'
                            : 'bg-cyan-950/90 border-cyan-700/80 text-cyan-300'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50 font-bold flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-red-400" />
                          现金死线 {item.daysLeft} 天
                        </span>
                        <span className="text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.05] text-[10px]">
                          {item.industry}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 group-hover:text-slate-300 transition-colors text-[11px]">
                          {item.updatedAt}
                        </span>
                        {isSelected && (
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            当前战局
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className={`text-sm font-extrabold transition-colors leading-snug ${
                        isSelected ? 'text-white' : 'text-slate-200 group-hover:text-blue-300'
                      }`}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between text-xs font-mono-code pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span>常规胜算收敛：</span>
                        <strong className="text-cyan-300">{item.confidence}%</strong>
                      </div>

                      <div className="flex items-center gap-1 text-blue-400 font-bold text-[11px] group-hover:translate-x-0.5 transition-transform">
                        <span>载入推演</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredList.length === 0 && (
                <div className="p-8 text-center rounded-2xl bg-black/40 border border-white/[0.06] text-slate-400 space-y-2">
                  <p className="text-sm font-bold text-slate-300">未检索到匹配的战局记录</p>
                  <p className="text-xs">您可以尝试调整搜索关键词，或立即新建全新因果推演战局。</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column (4 cols): Command Shortcuts & Symbiote Info */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Quick Tactical Command Navigation Links */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] space-y-3 shadow-xl">
              <div className="text-xs font-mono-code text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/[0.06] pb-2.5">
                <Compass className="w-4 h-4 text-blue-400" />
                <span>高维因果快捷指挥</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenCausalLinkModal();
                  }}
                  className="w-full p-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono-code text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span>48h 加密协同推演</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenRealityEchoesModal();
                  }}
                  className="w-full p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono-code text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>现实回响中枢</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                    {activeEchoesCount} 节点
                  </span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenArchonSanctumModal();
                  }}
                  className="w-full p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono-code text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span>执政官圣殿 (提案)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onNavigateToConclaves();
                  }}
                  className="w-full p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-950/80 text-sky-300 border border-sky-800/60 font-mono-code text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>观测者密会公会</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                </button>
              </div>
            </div>

            {/* Symbiote Card */}
            <div 
              onClick={() => {
                onClose();
                onOpenAISymbioteModal();
              }}
              className="p-4 rounded-2xl bg-black/50 hover:bg-cyan-950/30 border border-cyan-500/40 transition-all cursor-pointer space-y-2.5 group inner-glow-cyan shadow-xl"
            >
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  {symbioteState.customName}
                </span>
                <span className="text-rose-400 font-bold flex items-center gap-1 text-xs">
                  <Heart className="w-3.5 h-3.5 fill-rose-500" />
                  LV.{symbioteState.bondLevel}
                </span>
              </div>
              <p className="text-xs text-slate-300 italic font-serif-sc line-clamp-2 leading-relaxed">
                {symbioteState.longTermMemories[0]?.memoryQuote || '“在过往的生死战役中，你多次证明了非对称支点的威力。”'}
              </p>
              <div className="text-[11px] text-cyan-400 font-mono-code text-right group-hover:text-cyan-300">
                进入心智中枢 →
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-black/60 flex items-center justify-between text-xs font-mono-code text-slate-400">
          <span>当前挂载战局：<strong className="text-white">{currentBattlefield.title}</strong></span>
          <span>按 ESC 或点击右上角关闭</span>
        </div>

      </div>
    </div>
  );
};
