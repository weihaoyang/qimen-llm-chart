import React, { useState } from 'react';
import { 
  Terminal, 
  Flame, 
  AlertTriangle, 
  Send, 
  ShieldAlert, 
  Cpu, 
  Sparkles, 
  ArrowRight,
  TrendingDown,
  Crosshair,
  Radar
} from 'lucide-react';
import { BattlefieldState } from '../../types';
import { TacticalAIService, RedTeamResponse } from '../../services/aiService';
import { soundManager } from '../../utils/soundEffects';

interface Phase2CognitiveWarfareProps {
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onProceedToPhase3: () => void;
  readOnly?: boolean;
}

export const Phase2CognitiveWarfare: React.FC<Phase2CognitiveWarfareProps> = ({
  battlefield,
  onUpdateBattlefield,
  onProceedToPhase3,
  readOnly = false,
}) => {
  const displayFailureProbability = (value: number) => Math.round(value <= 1 ? value * 100 : value);
  const [userDraft, setUserDraft] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentCritique, setCurrentCritique] = useState<RedTeamResponse | null>(() => {
    const last = battlefield.redTeamLog[battlefield.redTeamLog.length - 1];
    return last ? { critique: last.redTeamCritique, biasWarning: last.biasWarning, failureProbability: displayFailureProbability(last.failureProbability), fatalVulnerability: '来自已保存红队记录，重新提交可获得新的结构化攻击。', suggestedFocus: '继续核验记录中的失败条件。' } : null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presetResponses = [
    '我们必须立刻降价！比对手更低！',
    '去找校友私下吃饭，求他看在校友情分上保住单子。',
    '我们团队投入了整整一年心血研发，必须向客户讲情怀。',
    '直接在社交媒体上公开控诉对手恶性竞争打价格战。',
  ];

  const handleSimulateRedTeam = async (planText?: string) => {
    if (readOnly) return;
    const text = (planText || userDraft).trim();
    if (!text || isSimulating) return;

    soundManager.playWarning();
    setIsSimulating(true);
    setErrorMessage(null);

    try {
      const response = await TacticalAIService.generateRedTeamAttack(text, battlefield);
      setCurrentCritique(response);
      // Keep the submitted plan visible in the log and only clear the input
      // after the audited server job succeeds. Failed/timeout jobs therefore
      // leave the original text available for a one-click retry.
      setUserDraft('');

      // Record to battlefield log
      onUpdateBattlefield(prev => {
        const biases = response.biasWarning && !prev.cognitiveBiasesDetected.includes(response.biasWarning)
          ? [...prev.cognitiveBiasesDetected, response.biasWarning]
          : prev.cognitiveBiasesDetected;

        return {
          ...prev,
          cognitiveBiasesDetected: biases,
          redTeamLog: [
            ...prev.redTeamLog,
            {
              id: `log-${Date.now()}`,
              userDraft: text,
              redTeamCritique: response.critique,
              biasWarning: response.biasWarning,
              failureProbability: response.failureProbability,
              timestamp: new Date().toLocaleTimeString(),
            },
          ],
        };
      });
      soundManager.playBlip(950, 0.04);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '红队推演失败，请重试。');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleNext = () => {
    if (readOnly) return;
    soundManager.playBlip(900, 0.04);
    onProceedToPhase3();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Cognitive Warfare Status */}
      <div className="surface-obsidian border border-red-900/60 rounded-2xl p-5 shadow-2xl hud-corner-red">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-500/80 flex items-center justify-center text-red-300 font-mono-code font-black text-sm shrink-0 shadow-lg shadow-red-950/50">
              <span>02</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>第二阶段：认知对抗 (Cognitive Warfare)</span>
                <span className="text-[10px] font-mono-code px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 tracking-wider">
                  AI扮演首席红队指挥官 (Red Team Lead)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                模拟最无情、最聪明的商业对手，针对你的每一个侥幸想法实施致命打击与认知偏误校正。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full border border-red-500/60 bg-red-950/80 flex items-center justify-center text-red-400 animate-spin">
              <Crosshair className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono-code text-red-400 font-bold">红队实时对决中</span>
          </div>
        </div>
      </div>

      {/* Terminal Battle Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Interactive Red Team Terminal */}
        <div className="lg:col-span-7 surface-obsidian border border-red-900/50 rounded-2xl p-5 shadow-2xl flex flex-col min-h-[580px] font-mono-code hud-corner-red">
          
          {/* Terminal Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-red-950 text-xs text-red-400/80 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-500" />
              <span className="font-bold">RED_TEAM_CHIEF_TERMINAL // V3.7_TACTICAL</span>
            </div>
            <span className="text-[10px] bg-red-950 px-2.5 py-0.5 rounded-full border border-red-900 text-red-300 font-bold tracking-wider">
              STRESS LEVEL: {Math.round(battlefield.emotionalTelemetry?.stress ?? 0)}%
            </span>
          </div>

          {/* Terminal Output Log */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs">
            {errorMessage && <div className="rounded-xl border border-amber-700/70 bg-amber-950/40 p-3 text-amber-200">{errorMessage}</div>}
            <div className="text-slate-400 leading-relaxed border-l-2 border-red-500 pl-3">
              <strong className="text-red-400 block mb-1">AI 首席红队指挥官 &gt;</strong>
              破局模式已激活。系统已自动降级所有非事实信息。当前首先核验：{battlefield.riskBreakers?.[0]?.condition || '尚未记录硬性风险约束'}；当前核心底牌：{battlefield.assets?.[0]?.title || '尚未确认可用底牌'}。原有假设不得直接视为可执行路径。<br />
              <span className="text-amber-300 font-bold">基于此绝境，陈述你的第一反应应对方案：</span>
            </div>

            {battlefield.redTeamLog.map((log) => (
              <div key={log.id} className="space-y-2 pt-2 border-t border-white/[0.04]">
                <div className="bg-black/50 p-3.5 rounded-xl border border-white/[0.06] text-slate-200">
                  <span className="text-blue-400 font-bold">用户初步方案 &gt;</span> {log.userDraft}
                </div>

                <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/80 text-red-200 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-red-400 font-bold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-red-500 animate-spin" />
                      <span>红队打击报告 (Red Team Simulation)</span>
                    </span>
                    <span className="font-bold text-red-400 bg-red-950 px-2.5 py-0.5 rounded-full border border-red-700 font-mono-code">
                      失败概率: {displayFailureProbability(log.failureProbability)}%
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap font-sans text-xs text-red-100/90 leading-relaxed">
                    {log.redTeamCritique}
                  </p>

                  {log.biasWarning && (
                    <div className="mt-2 pt-2 border-t border-red-900/60 text-[11px] text-amber-300 font-sans font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{log.biasWarning}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSimulating && (
              <div className="bg-red-950/40 p-3.5 rounded-xl border border-red-800 text-red-400 flex items-center gap-2 text-xs font-mono-code">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>红队正在进行对抗性推演，扫描方案漏洞与认知偏误...</span>
              </div>
            )}
          </div>

          {/* Quick Preset Inputs */}
          <div className="pt-3 border-t border-white/[0.04] shrink-0 mb-3">
            <div className="text-[10px] text-slate-500 mb-2 font-mono-code">点击测试典型本能方案：</div>
            <div className="flex flex-wrap gap-1.5">
              {presetResponses.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSimulateRedTeam(item)}
                  disabled={readOnly}
                  className="text-[11px] bg-black/40 hover:bg-red-950/80 text-slate-300 hover:text-red-200 border border-white/[0.08] hover:border-red-700/80 px-3 py-1.5 rounded-lg transition-all text-left font-sans cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="relative shrink-0 font-sans">
            <textarea
              value={userDraft}
              disabled={readOnly}
              onChange={(e) => setUserDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSimulateRedTeam();
                }
              }}
              placeholder="输入你直觉想到的应对方案，接受红队首席指挥官残酷压力测试..."
              rows={2}
              className="w-full bg-black/80 border border-red-900/80 rounded-xl pl-3.5 pr-12 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
            <button
              onClick={() => handleSimulateRedTeam()}
              disabled={readOnly || !userDraft.trim() || isSimulating}
              className="absolute right-2.5 bottom-2.5 p-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Right 5 Cols: Cognitive Bias Monitor & Reality Crucible Summary */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Detected Biases Box */}
          <div className="surface-obsidian border border-red-900/60 rounded-2xl p-5 shadow-2xl space-y-3 hud-corner-red">
            <div className="flex items-center justify-between border-b border-red-950 pb-2.5">
              <h3 className="text-xs font-bold text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>已捕获的认知偏误 (Bias Detection)</span>
              </h3>
              <span className="text-[10px] font-mono-code text-red-400 font-bold">
                {battlefield.cognitiveBiasesDetected.length} 项警示
              </span>
            </div>

            {battlefield.cognitiveBiasesDetected.length === 0 ? (
              <div className="text-xs text-slate-500 p-4 border border-dashed border-white/[0.08] rounded-xl text-center">
                尚未发现认知陷阱。请输入或点击方案进行压力测试。
              </div>
            ) : (
              <div className="space-y-2">
                {battlefield.cognitiveBiasesDetected.map((bias, idx) => (
                  <div key={idx} className="bg-red-950/40 p-3 rounded-xl border border-red-800/60 text-xs text-amber-200 leading-relaxed">
                    {bias}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crucible Principles */}
          <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-4 text-xs text-slate-400 space-y-2 font-sans shadow-xl">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Cpu className="w-3.5 h-3.5 text-red-400" />
              <span>认知熔炉法则 (Crucible Rules)</span>
            </div>
            <p className="leading-relaxed">
              1. <strong>绝望是危险信号</strong>：凡是在恐慌下做出的单方面让步（如盲目降价），必然加速死亡。<br />
              2. <strong>沉没成本是死资产</strong>：无论过去投入多少，客户只为未来的不可替代价值买单。<br />
              3. <strong>只有非对称能破局</strong>：放弃在对手的主场硬拼，必须将战局引向对手无法快速复制的新规则。
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              onClick={handleNext}
              disabled={readOnly}
              className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-red-950/60 transition-all cursor-pointer"
            >
              <span>直面现实，进入战略推演沙盘 (三大非对称策略)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
