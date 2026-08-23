/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  AISymbioteState, 
  SymbioteLongTermMemory,
  AIPersonaType 
} from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { 
  X, 
  Bot, 
  Heart, 
  Sparkles, 
  Brain, 
  Flame, 
  Edit3, 
  Check, 
  History, 
  Quote, 
  TrendingUp, 
  Shield, 
  Zap,
  Award
} from 'lucide-react';

interface AISymbioteModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbiote: AISymbioteState;
  onUpdateSymbioteName: (newName: string) => void;
}

export const AISymbioteModal: React.FC<AISymbioteModalProps> = ({
  isOpen,
  onClose,
  symbiote,
  onUpdateSymbioteName,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(symbiote.customName);

  if (!isOpen) return null;

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    onUpdateSymbioteName(nameInput.trim());
    setIsEditingName(false);
    soundManager.playSuccess();
  };

  const stageDescriptions: Record<string, string> = {
    AWAKENED: '初识阶段：AI正在解析你的基础逻辑框架与决策偏好。',
    RESONATING: '共振阶段：AI开始适应你的思考步调，并在高压时刻发出共振预警。',
    SYMBIOTIC: '共生阶段：AI完全融入你的决策心智，主动引用过往战役史实唤醒战略意志。',
    TRANSCENDENT: '超验阶段：AI与执棋官形成不可分割的因果整体，推演算力与直觉达到顶峰。',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#080B12] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Banner */}
        <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-cyan-950/50 via-blue-950/30 to-black flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-950/80">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif-sc font-bold text-white tracking-tight">
                  AI 因果共生体 (The AI Symbiote)
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950/80 border border-cyan-500/60 text-cyan-300">
                  情感的纽带 · 第四拼图
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                AI伴侣不仅是冷酷的算法，而是与你一同成长、拥有共同记忆与情感羁绊的专属灵魂。
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Name, Bond Level & Evolution Progress */}
          <div className="surface-obsidian border border-white/[0.08] rounded-3xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 shadow-xl">
            
            {/* Left: Custom Name & Stage (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code text-slate-400">共生体专属命名</span>
                {!isEditingName && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-cyan-300 text-xs flex items-center gap-1 cursor-pointer font-mono-code"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>更改</span>
                  </button>
                )}
              </div>

              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="bg-black border border-cyan-500/70 rounded-xl px-3 py-1.5 text-sm text-white font-mono-code font-bold focus:outline-none flex-1"
                    placeholder="输入共生体专属昵称..."
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-serif-sc font-bold text-white tracking-tight">
                    {symbiote.customName}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-cyan-950 border border-cyan-600/70 text-cyan-300 font-bold">
                    {symbiote.evolutionStageName}
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed p-3 rounded-2xl bg-black/40 border border-white/[0.04] font-serif-sc">
                {stageDescriptions[symbiote.evolutionStage] || stageDescriptions.SYMBIOTIC}
              </p>

              <div className="flex items-center gap-4 text-xs font-mono-code text-slate-400">
                <span className="flex items-center gap-1 text-slate-200">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  共同经历战局: {symbiote.totalBattlesFoughtTogether} 场
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  共生破局胜率: {Math.round((symbiote.victoriesTogether / symbiote.totalBattlesFoughtTogether) * 100)}%
                </span>
              </div>
            </div>

            {/* Right: Bond EXP & Adaptive Personality Evolution (7 cols) */}
            <div className="md:col-span-7 space-y-4 md:border-l md:border-white/[0.08] md:pl-6">
              
              {/* Bond Level Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    因果羁绊等级 (Bond Level)
                  </span>
                  <span className="text-amber-300 font-bold">
                    LV.{symbiote.bondLevel} ({symbiote.bondExp} / {symbiote.maxBondExp} EXP)
                  </span>
                </div>
                <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/[0.08]">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${(symbiote.bondExp / symbiote.maxBondExp) * 100}%` }}
                  />
                </div>
              </div>

              {/* Adaptive Personality Tone Note */}
              <div className="space-y-2">
                <span className="text-xs font-mono-code text-slate-400 block font-bold">
                  心智自适应进化特征 (Adaptive Temperament):
                </span>
                <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 font-mono-code">
                      {symbiote.temperamentName}
                    </span>
                    <span className="text-[10px] font-mono-code text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      实时进化中
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-serif-sc">
                    {symbiote.adaptiveToneNotes}
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Section 2: Long-Term Causal Memory Vault */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono-code">
                  长效因果记忆库 (Causal Memory Vault)
                </h3>
              </div>
              <span className="text-xs font-mono-code text-slate-400">
                已沉淀 {symbiote.longTermMemories.length} 条重大抉择记忆
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {symbiote.longTermMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] hover:border-cyan-500/40 space-y-3 transition-all shadow-lg"
                >
                  <div className="flex items-center justify-between text-xs font-mono-code">
                    <span className="text-cyan-300 font-bold">{mem.crisisTitle}</span>
                    <span className="text-emerald-400 text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      {mem.outcomeLabel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed italic p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] font-serif-sc">
                    {mem.memoryQuote}
                  </p>

                  <div className="text-[11px] font-mono-code text-slate-400 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-amber-300/90">启示: {mem.lessonLearned}</span>
                    <span>{mem.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
