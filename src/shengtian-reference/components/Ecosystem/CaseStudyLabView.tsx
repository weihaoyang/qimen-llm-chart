import React, { useState } from 'react';
import { 
  Building2, 
  Flame, 
  ShieldAlert, 
  GitBranch, 
  Trophy, 
  BarChart3, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { AnonymousCaseStudy } from '../../types';
import { INITIAL_ANONYMOUS_CASES } from '../../data/presets';
import { soundManager } from '../../utils/soundEffects';

interface CaseStudyLabViewProps {
  onEarnEquity?: (amount: number, reason: string) => void;
}

export const CaseStudyLabView: React.FC<CaseStudyLabViewProps> = ({
  onEarnEquity,
}) => {
  const [cases, setCases] = useState<AnonymousCaseStudy[]>(INITIAL_ANONYMOUS_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(INITIAL_ANONYMOUS_CASES[0].id);
  const [userSelectedChoiceId, setUserSelectedChoiceId] = useState<string | null>(null);
  const [hasSimulated, setHasSimulated] = useState<boolean>(false);
  const [equityBalance, setEquityBalance] = useState<number>(18);
  const [bountyClaimed, setBountyClaimed] = useState<boolean>(false);

  const activeCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  const handleSelectChoice = (choiceId: string) => {
    setUserSelectedChoiceId(choiceId);
    soundManager.playBlip(750, 0.04);
  };

  const handleRunSimulation = () => {
    if (!userSelectedChoiceId) return;
    setHasSimulated(true);
    soundManager.playSuccess();
    
    if (!bountyClaimed && onEarnEquity) {
      onEarnEquity(activeCase.bountyReward, `完成案例推演《${activeCase.title}》`);
      setEquityBalance(prev => prev + activeCase.bountyReward);
      setBountyClaimed(true);
    }
  };

  const handleResetSimulation = () => {
    setHasSimulated(false);
    setUserSelectedChoiceId(null);
    setBountyClaimed(false);
    soundManager.playBlip(600, 0.03);
  };

  const selectedChoice = activeCase.choices.find(c => c.id === userSelectedChoiceId);
  const authorChoice = activeCase.choices.find(c => c.isAuthorActualChoice);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Anonymous Case Study Lab */}
      <div className="surface-obsidian rounded-2xl p-5 sm:p-6 border border-white/[0.08] shadow-2xl relative overflow-hidden hud-corner">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-serif-sc">
                <span>匿名的案例推演所 (Anonymous Case Study Lab)</span>
                <span className="text-[11px] font-mono-code bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded-full">
                  WAR GAME LAB
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              这里是决策者的无风险兵棋练习场。所有案例均来自真实创业者与高管的脱敏绝境复盘。你将从头推演他们的生死关头，推演完成后生成【全网决策对比报告】，校准你的战略直觉。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-xs font-mono-code flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">推演权益余额:</span>
              <span className="text-amber-400 font-bold text-sm">{equityBalance} 权益点</span>
            </div>
          </div>
        </div>
      </div>

      {/* Case Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map((cs) => {
          const isSelected = cs.id === selectedCaseId;
          return (
            <button
              key={cs.id}
              onClick={() => {
                setSelectedCaseId(cs.id);
                setHasSimulated(false);
                setUserSelectedChoiceId(null);
                setBountyClaimed(false);
                soundManager.playBlip(700, 0.04);
              }}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden shadow-xl cursor-pointer ${
                isSelected
                  ? 'surface-obsidian border-amber-500/80 ring-2 ring-amber-500/40 shadow-amber-950/40 hud-corner'
                  : 'surface-obsidian border-white/[0.08] hover:border-white/[0.2] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5 text-[11px] font-mono-code">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold">
                  {cs.industry}
                </span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>{cs.totalSimulations} 人已推演</span>
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-2 leading-snug">{cs.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">{cs.backgroundSummary}</p>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                <span>推演奖励: <strong className="text-amber-300">+{cs.bountyReward} 权益点</strong></span>
                <span className={isSelected ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                  {isSelected ? '● 正在沙盘' : '载入兵棋'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main War Game Sandbox for Selected Case */}
      <div className="surface-obsidian rounded-2xl p-6 border border-white/[0.08] shadow-2xl space-y-6 hud-corner">
        
        {/* Case Dossier Header */}
        <div className="border-b border-white/[0.06] pb-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-code px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-bold">
                DIFFICULTY: {activeCase.difficulty}
              </span>
              <span className="text-xs text-slate-400 font-mono-code">作者代号: {activeCase.authorPseudonym}</span>
            </div>
            <div className="text-xs font-mono-code text-slate-400">
              {activeCase.timeRunway}
            </div>
          </div>

          <h3 className="text-base font-bold text-white">{activeCase.title}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-black/60 p-3.5 rounded-xl border border-white/[0.06] font-mono-code">
            <div>
              <span className="text-slate-400 block mb-1">● 绝境困局 (Core Dilemma):</span>
              <p className="text-slate-200 leading-relaxed">{activeCase.coreDilemma}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">● 当时财务与跑道底牌:</span>
              <p className="text-amber-300 leading-relaxed">{activeCase.financialStatus}</p>
            </div>
          </div>
        </div>

        {/* Branch Choices: Choose Your Action */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-400" />
              <span>推演选择：面对此局，你将执行哪条博弈路径？</span>
            </h4>
            <span className="text-[11px] font-mono-code text-slate-400">
              {userSelectedChoiceId ? '已选定策略分支' : '请点击选择一条路径'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeCase.choices.map((choice) => {
              const isSelected = userSelectedChoiceId === choice.id;

              return (
                <div
                  key={choice.id}
                  onClick={() => !hasSimulated && handleSelectChoice(choice.id)}
                  className={`card-tactical rounded-2xl p-4.5 border transition-all relative overflow-hidden flex flex-col justify-between ${
                    !hasSimulated ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-blue-950/60 hud-corner'
                      : 'border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 text-[10px] font-mono-code">
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-white/[0.08] font-bold">
                        {choice.typeLabel}
                      </span>
                      {hasSimulated && (
                        <span className="text-emerald-400 font-bold text-xs">
                          存活率 {choice.survivalRate}%
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs font-bold text-white mb-1.5">{choice.name}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{choice.description}</p>
                  </div>

                  {/* If Simulated: Show Community Choice Distribution Bar */}
                  {hasSimulated && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-1.5 text-[11px] font-mono-code">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>全网决策者选择占比:</span>
                        <span className="text-slate-200 font-bold">{choice.communityChoicePercent}%</span>
                      </div>
                      <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            choice.isAuthorActualChoice ? 'bg-amber-400' : isSelected ? 'bg-blue-500' : 'bg-slate-700'
                          }`}
                          style={{ width: `${choice.communityChoicePercent}%` }}
                        />
                      </div>
                      {choice.isAuthorActualChoice && (
                        <div className="text-amber-300 font-bold text-[10px] pt-0.5">
                          ★ 案例当事人当年的真实选择
                        </div>
                      )}
                    </div>
                  )}

                  {!hasSimulated && (
                    <div className="mt-3 pt-2 border-t border-white/[0.04] text-[11px] font-mono-code text-right">
                      <span className={isSelected ? 'text-blue-400 font-bold' : 'text-slate-500'}>
                        {isSelected ? '● 已选定此分支' : '点击推演'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Trigger */}
        {!hasSimulated ? (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleRunSimulation}
              disabled={!userSelectedChoiceId}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-black text-xs font-bold font-mono-code flex items-center gap-2 shadow-xl shadow-amber-950/60 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>提交推演并生成【决策对比报告】 (+{activeCase.bountyReward} 权益)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        ) : (
          /* Decision Benchmark Comparison Report */
          <div className="surface-obsidian border border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-300 hud-corner">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white font-mono-code">
                  推演对比报告 (Decision Benchmark Report)
                </h4>
              </div>
              <button
                onClick={handleResetSimulation}
                className="px-3 py-1.5 rounded-lg text-xs font-mono-code text-slate-300 hover:text-white bg-slate-900 border border-white/[0.1] flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重新推演该案例</span>
              </button>
            </div>

            {/* Verdict Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-code">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/50">
                <span className="text-blue-300 block mb-1">你的选择:</span>
                <p className="text-white font-bold text-sm mb-1">{selectedChoice?.name}</p>
                <span className="text-slate-400 text-[11px]">推演存活率: {selectedChoice?.survivalRate}%</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
                <span className="text-amber-300 block mb-1">当事人当年真实选择:</span>
                <p className="text-white font-bold text-sm mb-1">{authorChoice?.name}</p>
                <span className="text-slate-400 text-[11px]">真实最终结果: 存活脱险</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/50">
                <span className="text-purple-300 block mb-1">全网群体共识分布:</span>
                <p className="text-white font-bold text-sm mb-1">
                  {activeCase.choices.sort((a,b) => b.communityChoicePercent - a.communityChoicePercent)[0].communityChoicePercent}% 偏向【{activeCase.choices[2]?.typeLabel}】
                </p>
                <span className="text-slate-400 text-[11px]">样本量: {activeCase.totalSimulations} 次博弈</span>
              </div>
            </div>

            {/* Detailed Real-world Hindsight Story */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/[0.06] text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold font-mono-code">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>当事人真实复盘与结局记录：</span>
              </div>
              <p className="text-slate-200 leading-relaxed">{activeCase.authorActualOutcome}</p>
            </div>

            {/* Core Epistemic Takeaway */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/50 text-xs text-emerald-200 leading-relaxed font-mono-code">
              <strong className="text-emerald-300 block mb-1">💡 首席顾问认知提炼 (Key Takeaway)：</strong>
              {activeCase.keyTakeaway}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
