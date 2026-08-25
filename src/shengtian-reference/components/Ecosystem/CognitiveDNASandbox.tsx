/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import { 
  Dna, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  HelpCircle, 
  RotateCcw, 
  Layers, 
  Flame, 
  CheckCircle, 
  History, 
  Compass, 
  ArrowRight,
  Shield,
  Activity,
  Cpu
} from 'lucide-react';
import { 
  DecisionDNARecord, 
  DecisionDNARadarMetrics, 
  CognitivePatternInsight, 
  CounterfactualReviewItem 
} from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import { resolveJob } from '../../services/aiService';

interface CognitiveDNASandboxProps {
  dnaRecords: DecisionDNARecord[];
  battleId?: string;
}

export const CognitiveDNASandbox: React.FC<CognitiveDNASandboxProps> = ({
  dnaRecords,
  battleId,
}) => {
  const [activeTab, setActiveTab] = useState<'RADAR' | 'INSIGHTS' | 'COUNTERFACTUAL' | 'ARCHIVE'>('RADAR');
  const radar = useMemo<DecisionDNARadarMetrics>(() => {
    if (!dnaRecords.length) return { riskAppetite: 0, infoRigor: 0, decisionSpeed: 0, adversityTenacity: 0, counterIntuition: 0, valueAlignment: 0 };
    const outcomeScore = dnaRecords.filter((record) => record.survivalOutcome === 'SURVIVED').length / dnaRecords.length;
    const evidenceScore = Math.min(100, Math.round(dnaRecords.reduce((sum, record) => sum + record.extractedDNA.length, 0) / dnaRecords.length * 20));
    const reflectionScore = Math.min(100, Math.round(dnaRecords.reduce((sum, record) => sum + record.userReflection.length, 0) / dnaRecords.length));
    return { riskAppetite: Math.round(45 + outcomeScore * 30), infoRigor: evidenceScore, decisionSpeed: Math.min(100, 40 + dnaRecords.length * 8), adversityTenacity: Math.round(35 + outcomeScore * 55), counterIntuition: Math.min(100, 30 + reflectionScore / 2), valueAlignment: Math.min(100, 30 + reflectionScore / 1.5) };
  }, [dnaRecords]);
  const insights = useMemo<CognitivePatternInsight[]>(() => dnaRecords.length ? [{ id: 'derived-evidence', type: 'WINNING_FORMULA', title: '从已保存复盘中提取的决策规律', detail: `已分析 ${dnaRecords.length} 条本人复盘记录。`, evidence: dnaRecords.flatMap((record) => record.extractedDNA).slice(0, 4).join('；') || '当前复盘尚未提取明确 DNA。', actionableGuidance: '继续完成真实复盘，积累足够样本后再生成稳定模式。', createdAt: '实时计算' }] : [], [dnaRecords]);
  const [counterfactuals, setCounterfactuals] = useState<CounterfactualReviewItem[]>([]);
  const [selectedCfId, setSelectedCfId] = useState<string>('');
  const [counterfactualLoading, setCounterfactualLoading] = useState(false);
  const [counterfactualError, setCounterfactualError] = useState<string | null>(null);

  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    void sessionApi.module(battleId, 'counterfactual').then(({ state }) => {
      const envelope = state as { state?: unknown } | null;
      const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { results?: unknown } | null;
      if (cancelled || !Array.isArray(saved?.results)) return;
      const results = saved.results.filter((item): item is CounterfactualReviewItem => Boolean(item && typeof item === 'object' && typeof (item as CounterfactualReviewItem).id === 'string'));
      setCounterfactuals(results);
      setSelectedCfId(results[0]?.id ?? '');
    }).catch((error) => { if (!cancelled) setCounterfactualError(error instanceof Error ? error.message : '反事实历史记录读取失败，请重试。'); });
    return () => { cancelled = true; };
  }, [battleId]);

  const generateCounterfactual = async () => {
    const record = dnaRecords[0];
    if (!battleId || !record || counterfactualLoading) return;
    setCounterfactualLoading(true);
    setCounterfactualError(null);
    try {
      const response = await sessionApi.ai(battleId, 'review', {
        idempotencyKey: `counterfactual:${battleId}:${record.id}`,
        question: `请基于已保存复盘“${record.battlefieldTitle}”构造一条明确的反事实替代路径。当前策略：${record.selectedStrategy}；用户反思：${record.userReflection}。不要伪造事实，严格返回 review JSON，并在 summary、facts、whatChanged、nextAdjustment 中说明假设、代价和验证边界。`,
        counterfactual: { recordId: record.id, strategy: record.selectedStrategy, reflection: record.userReflection },
      });
      const result = await resolveJob(battleId, response.job);
      const value = result as Record<string, unknown>;
      const item: CounterfactualReviewItem = {
        id: `counterfactual-${record.id}`,
        strategyName: `替代路径：${record.selectedStrategy}`,
        scenarioName: record.battlefieldTitle,
        hypotheticalPremise: String(value.facts ?? record.userReflection),
        simulatedOutcome: String(value.summary ?? value.whatChanged ?? '服务端未返回可用结局。'),
        survivalProbability: typeof value.survivalProbability === 'number' ? value.survivalProbability : -1,
        retainedValuation: String(value.retainedValuation ?? '服务端未评估'),
        aiComparativeHindsight: String(value.nextAdjustment ?? '请结合实际执行结果继续核验。'),
      };
      setCounterfactuals((previous) => [item, ...previous.filter((entry) => entry.id !== item.id)].slice(0, 20));
      setSelectedCfId(item.id);
      await sessionApi.saveModule(battleId, 'counterfactual', { results: [item, ...counterfactuals.filter((entry) => entry.id !== item.id)].slice(0, 20) }, { source: 'counterfactual_review' });
    } catch (error) {
      setCounterfactualError(error instanceof Error ? error.message : '反事实推演失败，请重试。');
    } finally { setCounterfactualLoading(false); }
  };

  const activeCounterfactual = counterfactuals.find(c => c.id === selectedCfId) || counterfactuals[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Cognitive DNA & Dialogue with Self */}
      <div className="surface-obsidian rounded-2xl p-5 sm:p-6 border border-white/[0.08] shadow-2xl relative overflow-hidden hud-corner">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-serif-sc">
                <span>决策DNA图谱与认知跃迁 (Decision DNA & Self-Dialogue)</span>
                <span className="text-[11px] font-mono-code bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded-full">
                  COGNITIVE PROFILE
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              这里是决策者与自我的终极对话舱。系统不仅帮你赢下当下的战役，更通过“决策DNA图谱”、“认知惯性穿透”与“反事实事后复盘”，将每一次生死抉择提炼为量化的认知资产。
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono-code text-xs">
            <span className="text-slate-400">已沉淀认知法则:</span>
              <span className="text-amber-400 font-bold bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-800">
              {dnaRecords.length} 条已保存复盘
            </span>
          </div>
        </div>

        {/* 4 Internal Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.06] overflow-x-auto">
          {[
            { key: 'RADAR', label: '01 决策DNA雷达', icon: Activity },
            { key: 'INSIGHTS', label: '02 认知模式洞察', icon: Sparkles },
            { key: 'COUNTERFACTUAL', label: '03 反事实推演沙盒', icon: RotateCcw },
            { key: 'ARCHIVE', label: '04 历史复盘档案', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  soundManager.playBlip(700, 0.04);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono-code font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600 shadow-md shadow-amber-950/40'
                    : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Decision DNA Radar (雷达图谱与六维量化) */}
      {activeTab === 'RADAR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left 6 Cols: Visual Radar Gauge */}
          <div className="lg:col-span-6 surface-obsidian rounded-2xl p-6 border border-white/[0.08] shadow-2xl space-y-5 hud-corner">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 font-mono-code">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>决策六维倾向雷达 (Decision Radar Dimensions)</span>
              </h3>
              <span className="text-[10px] font-mono-code text-slate-500">动态拟合</span>
            </div>

            {/* Simulated Geometric Polygon Radar */}
            <div className="relative py-4 flex items-center justify-center">
              <div className="w-64 h-64 relative flex items-center justify-center">
                {/* Radar Grid Circles */}
                <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
                <div className="absolute inset-8 rounded-full border border-white/[0.08]" />
                <div className="absolute inset-16 rounded-full border border-white/[0.08]" />
                <div className="absolute inset-24 rounded-full border border-white/[0.08]" />
                
                {/* Axis lines */}
                <div className="absolute w-full h-[1px] bg-white/[0.06]" />
                <div className="absolute h-full w-[1px] bg-white/[0.06]" />
                <div className="absolute w-full h-[1px] bg-white/[0.06] rotate-45" />
                <div className="absolute w-full h-[1px] bg-white/[0.06] -rotate-45" />

                {/* Radar Polygon Shape */}
                <div className="w-44 h-44 bg-gradient-to-tr from-amber-500/20 via-blue-500/30 to-purple-500/20 border-2 border-amber-400/80 rounded-2xl rotate-12 flex items-center justify-center shadow-lg shadow-amber-950/40">
                  <div className="text-center font-mono-code text-[11px] text-amber-300 font-bold">
                    <span>综合战力</span>
                    <span className="block text-white text-base font-black">{dnaRecords.length ? Math.round(Object.values(radar).reduce((sum, value) => sum + value, 0) / 6) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend / Archetype Tag */}
            <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06] text-xs font-mono-code text-center">
              <span className="text-slate-400">当前主导决策型格：</span>
              <strong className="text-amber-300 ml-1">【严谨事实派 · 升维打击者】</strong>
            </div>
          </div>

          {/* Right 6 Cols: Dimension Bars */}
          <div className="lg:col-span-6 surface-obsidian rounded-2xl p-6 border border-white/[0.08] shadow-2xl space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 font-mono-code border-b border-white/[0.06] pb-3">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>六大核心决策维度解析与校准</span>
            </h3>

            <div className="space-y-3.5 text-xs font-mono-code">
              {[
                { label: '信息严谨度 (事实依赖)', val: radar.infoRigor, desc: '偏好已证实硬核事实，对主观陈述保持高度警惕' },
                { label: '逆境韧性 (破局意愿)', val: radar.adversityTenacity, desc: '面对清算死线时，拒绝被动等待，主动寻找非对称杠杆' },
                { label: '反直觉对抗力 (升维思维)', val: radar.counterIntuition, desc: '跳出对手设置的泥潭战场，开辟新维度的能力' },
                { label: '价值观自洽度 (底线坚守)', val: radar.valueAlignment, desc: '在极度诱惑或压力下，不轻易突破商业底线与诚信' },
                { label: '决策果断度 (执行速度)', val: radar.decisionSpeed, desc: '在关键关门点前快速锁定策略，避免犹豫拖延' },
                { label: '风险偏好 (冒险倾向)', val: radar.riskAppetite, desc: '在可控损失范围内敢于押注结构性支点' },
              ].map((dim, i) => (
                <div key={i} className="p-3 rounded-xl bg-black/50 border border-white/[0.05] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-bold">{dim.label}</span>
                    <span className="text-amber-400 font-bold">{dim.val}/100</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${dim.val}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{dim.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Cognitive Pattern Insights (胜利方程式 vs 盲区报告) */}
      {activeTab === 'INSIGHTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI 周期性认知模式报告 (Cognitive Pattern Audit)</span>
            </h3>
            <span className="text-[11px] font-mono-code text-slate-400">基于多轮推演历史生成</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {insights.length ? insights.map((insight) => {
              const isWinning = insight.type === 'WINNING_FORMULA';
              return (
                <div 
                  key={insight.id}
                  className={`card-tactical rounded-2xl p-5 border shadow-2xl space-y-3.5 relative overflow-hidden ${
                    isWinning
                      ? 'border-emerald-600/70 bg-emerald-950/20 hud-corner'
                      : 'border-amber-600/70 bg-amber-950/20 hud-corner-red'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 text-[10px] font-mono-code">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                      isWinning
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}>
                      {isWinning ? '★ 胜利方程式 (WINNING FORMULA)' : '⚠️ 潜在思维盲区 (POTENTIAL BLINDSPOT)'}
                    </span>
                    <span className="text-slate-400">{insight.createdAt}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">{insight.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{insight.detail}</p>

                  <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-xs font-mono-code space-y-1">
                    <span className="text-slate-400 text-[11px] block">● 历史推演证据 (Historical Evidence):</span>
                    <p className="text-amber-200">{insight.evidence}</p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] text-xs font-mono-code">
                    <span className="text-slate-400 block mb-0.5">● 行动校准指引 (Actionable Guidance):</span>
                    <p className="text-white font-medium">{insight.actionableGuidance}</p>
                  </div>
                </div>
              );
            }) : <div className="rounded-xl border border-white/[0.08] bg-black/40 p-6 text-center text-xs text-slate-400">完成并保存至少一次真实复盘后，这里才会生成你的认知模式报告。</div>}
          </div>
        </div>
      )}

      {/* Tab 3: Counterfactual Review Sandbox (反事实事后推演) */}
      {activeTab === 'COUNTERFACTUAL' && (
        <div className="surface-obsidian rounded-2xl p-6 border border-white/[0.08] shadow-2xl space-y-6 hud-corner">
          <div className="border-b border-white/[0.06] pb-4 space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono-code">
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <span>反事实推演沙盒 (Counterfactual Hindsight Sandbox)</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              基于事后已明确的市场真实反应，重新模拟那些“被你放弃的备选路径”。通过反事实对照，看清不同选择背后的真实代价，校准未来决策直觉。
            </p>
            <button onClick={() => void generateCounterfactual()} disabled={!battleId || !dnaRecords.length || counterfactualLoading} className="mt-3 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
              {counterfactualLoading ? '正在生成反事实推演…' : '基于最近一次真实复盘生成替代路径'}
            </button>
            {counterfactualError && <p className="mt-2 text-xs text-red-300">{counterfactualError}</p>}
          </div>

          {/* Alternative Pathway Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {counterfactuals.length ? counterfactuals.map((cf) => {
              const isSelected = cf.id === selectedCfId;
              return (
                <button
                  key={cf.id}
                  onClick={() => {
                    setSelectedCfId(cf.id);
                    soundManager.playBlip(700, 0.04);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/40'
                      : 'bg-black/50 border-white/[0.06] hover:border-white/[0.18]'
                  }`}
                >
                  <span className="text-[10px] font-mono-code text-purple-300 block mb-1">
                    {cf.scenarioName}
                  </span>
                  <h4 className="text-xs font-bold text-white">{cf.strategyName}</h4>
                </button>
              );
            }) : <div className="rounded-xl border border-white/[0.08] bg-black/40 p-6 text-center text-xs text-slate-400">反事实沙盒需要已保存的真实策略与执行结果，目前没有可验证的替代路径。</div>}
          </div>

          {/* Counterfactual Simulation Result Details */}
          {activeCounterfactual && <div className="p-5 rounded-2xl bg-black/60 border border-purple-500/40 space-y-4 font-mono-code text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-purple-300 font-bold">反事实假设：{activeCounterfactual.strategyName}</span>
              <span className="text-emerald-400 font-bold text-sm">
                {activeCounterfactual.survivalProbability >= 0 ? `服务端估计存活概率: ${activeCounterfactual.survivalProbability}%` : '服务端未提供可验证存活概率'}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-slate-400 block text-[11px]">● 假设前提与当时情境：</span>
              <p className="text-slate-200 leading-relaxed font-sans">{activeCounterfactual.hypotheticalPremise}</p>
            </div>

            <div className="space-y-2">
              <span className="text-slate-400 block text-[11px]">● AI 重新推演真实事后结局：</span>
              <p className="text-amber-200 leading-relaxed font-sans">{activeCounterfactual.simulatedOutcome}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-white/[0.06]">
                <span className="text-slate-400 block text-[10px]">最终估值/核心资产保留:</span>
                <span className="text-white font-bold">{activeCounterfactual.retainedValuation}</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800">
                <span className="text-purple-300 block text-[10px]">反事实对齐结论:</span>
                <span className="text-emerald-300 font-bold">已基于服务端复盘结果生成，需结合事实与执行记录人工核验</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/60 text-blue-200 leading-relaxed font-sans">
              <strong className="text-amber-300 block mb-1">💡 首席顾问事后上帝视角洞察：</strong>
              {activeCounterfactual.aiComparativeHindsight}
            </div>
          </div>}
        </div>
      )}

      {/* Tab 4: Historical DNA Archive */}
      {activeTab === 'ARCHIVE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span>决策复盘与DNA提取档案库 ({dnaRecords.length})</span>
            </h3>
          </div>

          <div className="space-y-4">
            {dnaRecords.map((record) => (
              <div key={record.id} className="surface-obsidian rounded-2xl p-5 border border-white/[0.08] shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 text-xs font-mono-code">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">[{record.timestamp}]</span>
                    <span className="text-white font-bold">{record.battlefieldTitle}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                    record.survivalOutcome === 'SURVIVED'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                  }`}>
                    {record.survivalOutcome === 'SURVIVED' ? '● 战局突围成功' : '● 部分达成 / 深度复盘'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-400">
                    <strong className="text-slate-300 font-mono-code">执行策略：</strong> {record.selectedStrategy}
                  </p>
                  <p className="text-slate-400">
                    <strong className="text-amber-300 font-mono-code">致命灵魂追问：</strong> {record.fatalQuestion}
                  </p>
                  <p className="text-slate-300 bg-black/50 p-3 rounded-xl border border-white/[0.04] leading-relaxed">
                    <strong className="text-blue-300 font-mono-code block mb-1">当事人反思：</strong>
                    {record.userReflection}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-mono-code">萃取的决策DNA:</span>
                  {record.extractedDNA.map((dna, idx) => (
                    <span key={idx} className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-lg font-mono-code font-bold">
                      {dna}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
