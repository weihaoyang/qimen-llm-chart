import React from 'react';
import { 
  Bot, 
  Layers, 
  GitBranch, 
  ShieldAlert, 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Compass, 
  HelpCircle,
  Sparkles,
  TrendingDown,
  Clock,
  Shield,
  Layers2
} from 'lucide-react';
import { BattlefieldState } from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface TacticalWorkflowHUDProps {
  battlefield: BattlefieldState;
  activeStandardTab: 'interview' | 'cards' | 'simulation' | 'risks';
  onSelectTab: (tab: 'interview' | 'cards' | 'simulation' | 'risks') => void;
  onLaunchBreakthrough: () => void;
  onOpenGuide: () => void;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export const TacticalWorkflowHUD: React.FC<TacticalWorkflowHUDProps> = ({
  battlefield,
  activeStandardTab,
  onSelectTab,
  onLaunchBreakthrough,
  onOpenGuide,
  selectedPresetId,
  onSelectPreset,
}) => {
  // Compute progress metrics
  const assetsList = battlefield.assets || [];
  const cardsCount = assetsList.length;
  const verifiedFactsCount = assetsList.filter(c => c.tag === 'FACT').length;
  const assumptionsCount = assetsList.filter(c => c.tag === 'HYPOTHESIS' || c.tag === 'USER_CLAIM' || c.tag === 'THIRD_PARTY').length;
  const activeTriggers = (battlefield.riskBreakers || []).filter(r => r.isTriggered).length;
  const isCashCritical = (battlefield.financials?.calculatedDays ?? 100) <= 45;

  const steps = [
    {
      id: 'interview' as const,
      stepNum: '01',
      title: '战局收拢',
      subtitle: '目标与底线对齐',
      icon: Bot,
      status: battlefield.idealOutcome ? 'COMPLETED' : 'IN_PROGRESS',
      badge: battlefield.idealOutcome ? '已收拢' : '采访中',
    },
    {
      id: 'cards' as const,
      stepNum: '02',
      title: '底牌盘点',
      subtitle: '6类事实与认知标签',
      icon: Layers,
      status: cardsCount >= 4 ? 'COMPLETED' : 'IN_PROGRESS',
      badge: `${cardsCount} 张底牌`,
    },
    {
      id: 'simulation' as const,
      stepNum: '03',
      title: '宿命重力线',
      subtitle: '自然下坠终局推演',
      icon: GitBranch,
      status: (battlefield.financials?.calculatedDays ?? 100) < 90 ? 'WARNING' : 'IN_PROGRESS',
      badge: `${battlefield.financials?.calculatedDays ?? 0}天跑道`,
    },
    {
      id: 'risks' as const,
      stepNum: '04',
      title: '风险断路器',
      subtitle: '触发阈值与防守令',
      icon: ShieldAlert,
      status: activeTriggers > 0 ? 'ALERT' : 'NORMAL',
      badge: activeTriggers > 0 ? `${activeTriggers} 项告警` : '4道防线',
    },
  ];

  // Dynamic tactical guidance message
  let guidanceText = '战术建议：当前处于战局侦测收拢阶段，请与AI顾问完成采访，明确破局目标与绝对不可退让的底线。';
  let nextActionLabel = '盘点现实底牌';
  let nextActionTab: 'interview' | 'cards' | 'simulation' | 'risks' = 'cards';

  if (activeStandardTab === 'interview') {
    guidanceText = '第一步：请在下方与顾问对话或直接编辑右侧战局情报，确保「理想目标」与「不可退让底线」真实无粉饰。';
    nextActionLabel = '前往第2步：盘点底牌';
    nextActionTab = 'cards';
  } else if (activeStandardTab === 'cards') {
    guidanceText = `第二步：已标记 ${cardsCount} 张底牌（${verifiedFactsCount}项硬事实、${assumptionsCount}项致命假设/传闻）。重点核实假设是否经受过验证！`;
    nextActionLabel = '前往第3步：测算宿命重力线';
    nextActionTab = 'simulation';
  } else if (activeStandardTab === 'simulation') {
    guidanceText = `第三步：当前现金跑道仅余 ${battlefield.financials?.calculatedDays ?? 0} 天，若按常规路径发展将在关门窗口前窒息，建议准备启动非对称破局！`;
    nextActionLabel = '前往第4步：核查风险断路器';
    nextActionTab = 'risks';
  } else if (activeStandardTab === 'risks') {
    guidanceText = activeTriggers > 0 
      ? `第四步：已触发 ${activeTriggers} 道风险断路器！常规推演已无生路，请立即启动「破局战情沙盘」重构战局！`
      : '第四步：断路器时刻监控现金与对手底线，一旦突破硬性指标将自动强制熔断。';
    nextActionLabel = '启动破局模式 (Breakthrough)';
  }

  return (
    <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      
      {/* Top Banner: Scenario Selector & System Blueprint Trigger */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        
        {/* Scenario Pill Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono-code text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>实战战局范式:</span>
          </span>

          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
            {[
              { id: 'saas', label: 'SaaS客户争夺', tag: '生死存亡' },
              { id: 'promotion', label: '高管卡位重组', tag: '职场博弈' },
              { id: 'funding', label: '资方毁约断粮', tag: '现金跑道' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedPresetId === p.id
                    ? 'bg-blue-600/90 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>{p.label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded ${
                  selectedPresetId === p.id ? 'bg-black/30 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Guide & Quick Breakthrough Launcher */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenGuide}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-mono-code flex items-center gap-1.5 transition-all cursor-pointer"
            title="查看五维决策生态全景架构与工作流指南"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>决策生态导引图</span>
          </button>

          <button
            onClick={onLaunchBreakthrough}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-950 via-red-900 to-red-800 hover:from-red-900 hover:to-red-700 text-red-200 hover:text-white border border-red-700/80 text-xs font-mono-code font-bold flex items-center gap-1.5 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>一键激活绝境破局</span>
          </button>
        </div>

      </div>

      {/* 4-Step Decision Workflow Progress Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step) => {
          const isActive = activeStandardTab === step.id;
          const Icon = step.icon;

          let cardBorder = 'border-white/[0.06]';
          let cardBg = 'bg-black/30 hover:bg-white/[0.02]';
          let stepNumberColor = 'text-slate-500';
          let iconColor = 'text-slate-400';
          let badgeColor = 'bg-slate-800/80 text-slate-400 border-slate-700/60';

          if (isActive) {
            cardBorder = 'border-blue-500/60 shadow-lg shadow-blue-950/30';
            cardBg = 'bg-blue-950/30';
            stepNumberColor = 'text-blue-400';
            iconColor = 'text-blue-400';
            badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-700/80';
          } else if (step.status === 'ALERT') {
            cardBorder = 'border-red-600/60 animate-pulse';
            badgeColor = 'bg-red-950 text-red-300 border-red-700';
            iconColor = 'text-red-400';
          }

          return (
            <button
              key={step.id}
              onClick={() => {
                onSelectTab(step.id);
                soundManager.playBlip(700, 0.02);
              }}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${cardBorder} ${cardBg}`}
            >
              {/* Active Indicator Top Line */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500" />
              )}

              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono-code font-black ${stepNumberColor}`}>
                    {step.stepNum}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-black/40 border border-white/[0.06] ${iconColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full border ${badgeColor}`}>
                  {step.badge}
                </span>
              </div>

              <div>
                <h4 className={`text-xs font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                  {step.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {step.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Contextual Guidance & Quick Next Step Action Bar */}
      <div className="bg-[#0e131f] border border-blue-900/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed truncate">
            <span className="font-bold text-blue-300 font-mono-code mr-1.5">[战术导引]</span>
            {guidanceText}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {activeStandardTab !== 'risks' ? (
            <button
              onClick={() => {
                onSelectTab(nextActionTab);
                soundManager.playBlip(750, 0.03);
              }}
              className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/40 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{nextActionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onLaunchBreakthrough}
              className="py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono-code font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-950/60 transition-all cursor-pointer whitespace-nowrap"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>启动破局沙盘推演</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
