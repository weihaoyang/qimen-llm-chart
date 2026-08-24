import React, { useState, useEffect } from 'react';
import { 
  Dna, 
  CheckCircle2, 
  ArrowLeft, 
  HelpCircle, 
  FileCheck, 
  Sparkles, 
  Award, 
  TrendingUp,
  History,
  Send
} from 'lucide-react';
import { BattlefieldState, DecisionDNARecord } from '../../types';
import { ASYMMETRIC_STRATEGY_PACKAGES } from '../../data/presets';
import { TacticalAIService } from '../../services/aiService';
import { soundManager } from '../../utils/soundEffects';

interface Phase4AutopsyProps {
  battlefield: BattlefieldState;
  onSaveDNARecord: (record: DecisionDNARecord) => void;
  onReturnToStandardMode: () => void;
}

export const Phase4Autopsy: React.FC<Phase4AutopsyProps> = ({
  battlefield,
  onSaveDNARecord,
  onReturnToStandardMode,
}) => {
  const selectedStrategyId = battlefield.lockedAsymmetricStrategyId || 'FIELD_SHIFT';
  const selectedStrategy = ASYMMETRIC_STRATEGY_PACKAGES[selectedStrategyId];

  const [fatalQuestion, setFatalQuestion] = useState('正在请求 AI 致命问题…');
  const [fatalQuestionError, setFatalQuestionError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void TacticalAIService.generateFatalQuestion(selectedStrategy.name, battlefield)
      .then((question) => { if (!cancelled) { setFatalQuestion(question); setFatalQuestionError(null); } })
      .catch((error) => { if (!cancelled) setFatalQuestionError(error instanceof Error ? error.message : '致命问题生成失败，请重试。'); });
    return () => { cancelled = true; };
  }, [selectedStrategy.name, battlefield.id]);
  
  const [reflectionText, setReflectionText] = useState(
    '在公司发展早期，为了追求单点快速增长，过度依赖单一客户（占收入40%），没有建立健康的客户结构防线。这个错误在18个月前签第一单时就已埋下。'
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveAndExit = () => {
    soundManager.playBlip(1000, 0.06);

    const dnaRecord: DecisionDNARecord = {
      id: `dna-${Date.now()}`,
      battlefieldTitle: battlefield.title,
      timestamp: new Date().toLocaleDateString(),
      selectedStrategy: selectedStrategy.codeName,
      survivalOutcome: 'SURVIVED',
      fatalQuestion: fatalQuestion,
      userReflection: reflectionText,
      extractedDNA: [
        '【警惕单一客户收入占比>30%致命依赖】',
        '【高压商业环境下人脉信任度衰减0.6x】',
        '【绝不在现金跑道跌破60天后开启被动防守】',
      ],
    };

    onSaveDNARecord(dnaRecord);
    setIsSaved(true);

    setTimeout(() => {
      onReturnToStandardMode();
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Autopsy Header */}
      <div className="surface-obsidian border border-red-900/60 rounded-2xl p-5 shadow-2xl hud-corner-red">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-500/80 flex items-center justify-center text-red-300 font-mono-code font-black text-sm shrink-0 shadow-lg shadow-red-950/50">
              <span>04</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>第四阶段：冷酷复盘 (The Autopsy)</span>
                <span className="text-[10px] font-mono-code px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 tracking-wider">
                  从“经验”到“本能” · 锻造决策DNA
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                复盘的目的不是总结客观教训，而是彻底直面底层心智漏洞，将教训内化为肌肉记忆。
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400 font-mono-code block">战局推演结果</span>
            <span className="text-xs font-mono-code font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-700">
              ✓ 生存通道已打通
            </span>
          </div>
        </div>
      </div>

      {/* Decision Playback Step Flow */}
      <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
          <History className="w-4 h-4 text-blue-400" />
          <span>危机决策推演全链次回溯 (Step-by-Step Playback)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/50 p-3.5 rounded-xl border border-white/[0.06]">
            <span className="text-[10px] font-mono-code text-blue-400 block mb-1">01 初始战局</span>
            <strong className="text-slate-100 block mb-1">大客户续约危机</strong>
            <span className="text-slate-500 text-[11px] font-mono-code">现金跑道67天 / 70%流失概率</span>
          </div>

          <div className="bg-black/50 p-3.5 rounded-xl border border-white/[0.06]">
            <span className="text-[10px] font-mono-code text-red-400 block mb-1">02 风险击穿</span>
            <strong className="text-slate-100 block mb-1">对手突袭 &amp; 人脉失效</strong>
            <span className="text-slate-500 text-[11px] font-mono-code">校友VP避嫌 / 资产自动降级</span>
          </div>

          <div className="bg-black/50 p-3.5 rounded-xl border border-white/[0.06]">
            <span className="text-[10px] font-mono-code text-amber-400 block mb-1">03 认知对抗</span>
            <strong className="text-slate-100 block mb-1">击碎降价自杀偏误</strong>
            <span className="text-slate-500 text-[11px] font-mono-code">识破恐慌性决策与沉没成本</span>
          </div>

          <div className="bg-black/50 p-3.5 rounded-xl border border-emerald-900/60 ring-1 ring-emerald-500/40">
            <span className="text-[10px] font-mono-code text-emerald-400 block mb-1">04 锁定破局策略</span>
            <strong className="text-emerald-300 block mb-1">{selectedStrategy.name}</strong>
            <span className="text-slate-400 text-[11px] font-mono-code">存活率 {selectedStrategy.survivalProbability}% / 升维重构</span>
          </div>
        </div>
      </div>

      {/* AI's Fatal Question (致命一问) */}
      <div className="surface-obsidian border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl space-y-4 hud-corner">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
          <span>AI 首席顾问 · 致命一问 (THE FATAL QUESTION)：</span>
        </div>

        <blockquote className="font-serif-sc text-base sm:text-lg font-bold text-slate-100 leading-relaxed bg-black/60 p-4.5 rounded-xl border border-amber-800/40">
          {fatalQuestionError ? <span className="text-amber-300">{fatalQuestionError}</span> : <>“{fatalQuestion}”</>}
        </blockquote>

        {/* User Reflection Textarea */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium block">
            你的冷酷深度复盘 (直面自身决策缺陷与盲区)：
          </label>
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            rows={3}
            className="w-full bg-black/70 border border-white/[0.1] rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed resize-none"
          />
        </div>
      </div>

      {/* Extracted Decision DNA Badges Preview */}
      <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Dna className="w-4 h-4 text-amber-400" />
            <span>本次提炼的决策DNA规则 (Extracted Decision DNA)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono-code">将永久写入系统底座</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-black/50 p-4 rounded-xl border border-amber-900/60 text-amber-200">
            <span className="font-mono-code text-[10px] text-amber-400 block mb-1">DNA RULE #01</span>
            <strong>【警惕单一客户收入占比&gt;30%致命依赖】</strong>
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-amber-900/60 text-amber-200">
            <span className="font-mono-code text-[10px] text-amber-400 block mb-1">DNA RULE #02</span>
            <strong>【高压商业环境下人脉信任度衰减0.6x】</strong>
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-amber-900/60 text-amber-200">
            <span className="font-mono-code text-[10px] text-amber-400 block mb-1">DNA RULE #03</span>
            <strong>【绝不在现金跑道跌破60天后开启被动防守】</strong>
          </div>
        </div>
      </div>

      {/* Bottom Completion Action */}
      <div className="flex items-center justify-between p-5 surface-obsidian border border-red-900/60 rounded-2xl shadow-xl hud-corner-red">
        <div className="text-xs text-slate-400">
          点击存档后，系统将把此决策DNA沉淀入库，并平滑转回标准模式。
        </div>

        <button
          onClick={handleSaveAndExit}
          disabled={isSaved}
          className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-xl transition-all cursor-pointer"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>已存档 · 正在转回标准顾问...</span>
            </>
          ) : (
            <>
              <Dna className="w-4 h-4 text-amber-300" />
              <span>确认存档，锻造决策DNA并退出</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
