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
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import { TacticalAIService } from '../../services/aiService';

interface CaseStudyLabViewProps {
  battleId?: string;
  readOnly?: boolean;
}

export const CaseStudyLabView: React.FC<CaseStudyLabViewProps> = ({
  battleId,
  readOnly = false,
}) => {
  const [cases, setCases] = useState<AnonymousCaseStudy[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [userSelectedChoiceId, setUserSelectedChoiceId] = useState<string | null>(null);
  const [hasSimulated, setHasSimulated] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<Record<string, unknown> | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [stateHydrated, setStateHydrated] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void sessionApi.catalog().then(async ({ scenarios }) => {
      const details = await Promise.all((scenarios ?? []).filter((scenario) => scenario.kind === 'case-study').map((scenario) => sessionApi.scenario(scenario.id)));
      const loaded = details.map(({ scenario }) => {
        const content = scenario.caseStudy as Record<string, unknown> | undefined;
        const choices = Array.isArray(content?.choices) ? content.choices : [];
        return {
          id: String(scenario.id), title: String(scenario.title ?? ''), industry: String(scenario.industry ?? ''), authorPseudonym: String(content?.authorPseudonym ?? '官方匿名案例'), difficulty: content?.difficulty === 'EXTREME' ? 'EXTREME' : 'HIGH', backgroundSummary: String(content?.backgroundSummary ?? scenario.description ?? ''), coreDilemma: String(content?.coreDilemma ?? scenario.objective ?? ''), timeRunway: String(content?.timeRunway ?? `决策窗口 ${scenario.hardDeadlineDays ?? 0} 天`), financialStatus: String(content?.financialStatus ?? '待补充财务底牌'), choices: choices.map((choice) => { const item = choice as Record<string, unknown>; return { id:String(item.id ?? ''), name:String(item.name ?? ''), typeLabel:String(item.typeLabel ?? ''), description:String(item.description ?? ''), communityChoicePercent:Number(item.communityChoicePercent ?? 0), survivalRate:Number(item.survivalRate ?? 0), isAuthorActualChoice:item.isAuthorActualChoice === true }; }), authorActualOutcome:String(content?.authorActualOutcome ?? ''), keyTakeaway:String(content?.keyTakeaway ?? ''), totalSimulations:Number(content?.totalSimulations ?? 0), bountyReward:Number(content?.bountyReward ?? 0),
        } as AnonymousCaseStudy;
      });
      if (!cancelled) {
        setCases(loaded);
        setSelectedCaseId((current) => loaded.some((item) => item.id === current) ? current : loaded[0]?.id ?? '');
      }
    }).catch((error) => { if (!cancelled) setSimulationError(error instanceof Error ? error.message : '官方案例目录读取失败，请重试。'); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    void sessionApi.module(battleId, 'case-study-lab').then(({ state }) => {
      const envelope = state as { state?: unknown } | null;
      const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { selectedCaseId?: unknown; userSelectedChoiceId?: unknown; hasSimulated?: unknown; simulationResult?: unknown } | null;
      if (cancelled) return;
      if (!saved) { setStateHydrated(true); return; }
      if (typeof saved.selectedCaseId === 'string') setSelectedCaseId(saved.selectedCaseId);
      if (typeof saved.userSelectedChoiceId === 'string') setUserSelectedChoiceId(saved.userSelectedChoiceId);
      if (typeof saved.hasSimulated === 'boolean') setHasSimulated(saved.hasSimulated);
      if (saved.simulationResult && typeof saved.simulationResult === 'object' && !Array.isArray(saved.simulationResult)) setSimulationResult(saved.simulationResult as Record<string, unknown>);
      setStateHydrated(true);
    }).catch(() => { if (!cancelled) setStateHydrated(true); });
    return () => { cancelled = true; };
  }, [battleId]);

  React.useEffect(() => {
    if (!battleId || !stateHydrated || readOnly) return;
    const timer = window.setTimeout(() => {
      void sessionApi.saveModule(battleId, 'case-study-lab', { selectedCaseId, userSelectedChoiceId, hasSimulated, simulationResult })
        .catch((error) => setSimulationError(error instanceof Error ? error.message : '案例推演状态保存失败，请重试。'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [battleId, stateHydrated, readOnly, selectedCaseId, userSelectedChoiceId, hasSimulated, simulationResult]);

  const activeCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  if (!activeCase) return <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-6 text-sm text-amber-200">正在加载官方匿名案例目录…</div>;

  const handleSelectChoice = (choiceId: string) => {
    if (readOnly) return;
    setUserSelectedChoiceId(choiceId);
    soundManager.playBlip(750, 0.04);
  };

  const handleRunSimulation = async () => {
    if (readOnly || !userSelectedChoiceId || !battleId || isSimulating) return;
    setSimulationError(null);
    setIsSimulating(true);
    try {
      const result = await TacticalAIService.generateCaseStudyReview(battleId, activeCase, userSelectedChoiceId);
      setSimulationResult(result);
      setHasSimulated(true);
      soundManager.playSuccess();
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : '案例复盘失败，请重试。');
    } finally { setIsSimulating(false); }
  };

  const handleResetSimulation = () => {
    if (readOnly) return;
    setHasSimulated(false);
    setUserSelectedChoiceId(null);
    setSimulationResult(null);
    setSimulationError(null);
    soundManager.playBlip(600, 0.03);
  };

  const selectedChoice = activeCase.choices.find(c => c.id === userSelectedChoiceId);
  const authorChoice = activeCase.choices.find(c => c.isAuthorActualChoice);
  const leadingHistoricalChoice = activeCase.choices.slice().sort((a, b) => b.communityChoicePercent - a.communityChoicePercent)[0];

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
              这里是官方只读案例目录的无风险兵棋练习场。案例内容与统计均为目录快照，不代表实时全网数据；你的选择和复盘仅保存到当前战局。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-xs font-mono-code flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">案例状态:</span>
              <span className="text-amber-400 font-bold text-sm">官方只读 · 推演记录已保存</span>
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
                  <span>目录历史样本 {cs.totalSimulations} 次</span>
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-2 leading-snug">{cs.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">{cs.backgroundSummary}</p>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                <span>平台审计奖励: <strong className="text-amber-300">完成后按规则核发</strong></span>
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
                          官方案例结局标签 {choice.survivalRate}%
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
                        <span>官方目录历史样本占比:</span>
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
              disabled={readOnly || !userSelectedChoiceId}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-black text-xs font-bold font-mono-code flex items-center gap-2 shadow-xl shadow-amber-950/60 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>{isSimulating ? '正在生成结构化复盘…' : '提交推演并生成【决策对比报告】'}</span>
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
                disabled={readOnly}
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
                <span className="text-slate-400 text-[11px]">官方案例结局标签: {selectedChoice?.survivalRate}%（非对你战局的预测）</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
                <span className="text-amber-300 block mb-1">当事人当年真实选择:</span>
                <p className="text-white font-bold text-sm mb-1">{authorChoice?.name}</p>
                <span className="text-slate-400 text-[11px]">真实最终结果: {activeCase.authorActualOutcome || '官方案例未提供结局标签'}</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/50">
                <span className="text-purple-300 block mb-1">官方目录历史样本分布:</span>
                <p className="text-white font-bold text-sm mb-1">
                  {leadingHistoricalChoice?.communityChoicePercent ?? 0}% 偏向【{leadingHistoricalChoice?.typeLabel ?? '待标注'}】
                </p>
                <span className="text-slate-400 text-[11px]">目录快照样本量: {activeCase.totalSimulations} 次博弈</span>
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

        {simulationError && <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">{simulationError}</div>}
        {simulationResult && (
          <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/20 p-5 space-y-3 text-xs">
            <h4 className="font-bold text-cyan-200">服务端结构化复盘结果</h4>
            <p className="text-slate-200">{String(simulationResult.summary ?? '已完成复盘，具体字段见下方。')}</p>
            <div className="grid gap-2 sm:grid-cols-2 text-slate-300">
              <div><span className="text-slate-500">事实：</span>{String(simulationResult.facts ?? '—')}</div>
              <div><span className="text-slate-500">变化：</span>{String(simulationResult.whatChanged ?? '—')}</div>
              <div><span className="text-slate-500">下一调整：</span>{String(simulationResult.nextAdjustment ?? '—')}</div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
