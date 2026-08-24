import React from 'react';
import { 
  X, 
  Radio, 
  Bot, 
  HeartPulse, 
  Compass, 
  Moon, 
  ArrowRight,
  Shield,
  Activity,
  Sparkles,
  Sliders
} from 'lucide-react';
import { AIPersonaType, BattlefieldState } from '../../types';

interface TacticalSensoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  battlefield: BattlefieldState;
  onOpenObserverModal: () => void;
  onOpenPersonaModal: () => void;
  onOpenEmotionalModal: () => void;
  onOpenValueModal: () => void;
  onOpenMetaphysicsModal: () => void;
}

export const TacticalSensoryModal: React.FC<TacticalSensoryModalProps> = ({
  isOpen,
  onClose,
  battlefield,
  onOpenObserverModal,
  onOpenPersonaModal,
  onOpenEmotionalModal,
  onOpenValueModal,
  onOpenMetaphysicsModal,
}) => {
  if (!isOpen) return null;

  const stressLevel = battlefield.emotionalTelemetry?.stress ?? 0;
  const currentPersona = battlefield.selectedPersona || 'GUARDIAN';
  const personaName = 
    currentPersona === 'GUARDIAN' ? '守护者 (底线对冲)' :
    currentPersona === 'VANGUARD' ? '先锋 (非对称突刺)' :
    currentPersona === 'ANALYST' ? '分析师 (概率贝叶斯)' : '哲人 (第一性原理)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="surface-obsidian border border-white/[0.12] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-blue-950/80 text-blue-300 border border-blue-800/80">
              SENSORY & AUXILIARY HUB
            </span>
            <span className="text-xs font-mono-code text-slate-400">心智与感知调控</span>
          </div>
          <h2 className="text-xl font-serif-sc font-bold text-white tracking-tight">
            战术感知与辅助决策调控中心
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            集中管理 AI 顾问搭档人格、心理带宽警戒、静默雷达与价值观伦理校准。
          </p>
        </div>

        {/* 5 Main Control Modules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          
          {/* 1. AI Persona */}
          <div 
            onClick={() => { onClose(); onOpenPersonaModal(); }}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800/60">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    AI 决策搭档人格
                  </h4>
                  <p className="text-[11px] text-slate-400">当前：{personaName}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2 rounded-lg">
              切换顾问风格（守护者、先锋、分析师、哲人）以获得不同视角的红队攻防。
            </div>
          </div>

          {/* 2. Emotional Telemetry */}
          <div 
            onClick={() => { onClose(); onOpenEmotionalModal(); }}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/[0.03] border border-white/[0.08] hover:border-rose-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${
                  stressLevel > 80 
                    ? 'bg-rose-950/80 text-rose-400 border-rose-800 animate-pulse' 
                    : 'bg-slate-900 text-rose-300 border-white/[0.08]'
                }`}>
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                    心理与情绪带宽
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    当前压力：<span className={stressLevel > 80 ? 'text-rose-400 font-bold' : 'text-slate-300'}>{stressLevel}%</span>
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2 rounded-lg">
              实时监测精力与信心曲线，压力超载80%时自动锁定重大妥协操作。
            </div>
          </div>

          {/* 3. Silent Observer Radar */}
          <div 
            onClick={() => { onClose(); onOpenObserverModal(); }}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    静默观察者雷达
                  </h4>
                  <p className="text-[11px] text-slate-400">2 项异常征兆监测中</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2 rounded-lg">
              自动捕获日历会议骤降、延期激增等信号，先于危机爆发前草拟推演战局。
            </div>
          </div>

          {/* 4. Value & Ethical Calibrator */}
          <div 
            onClick={() => { onClose(); onOpenValueModal(); }}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/[0.03] border border-white/[0.08] hover:border-purple-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/60">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                    价值观与道德校准
                  </h4>
                  <p className="text-[11px] text-slate-400">3 道核心伦理红线已布防</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2 rounded-lg">
              在方案锁定前进行价值观对齐核验，预估心理反噬与声誉代价。
            </div>
          </div>

        </div>

        {/* 5. Metaphysics Timing Ritual */}
        <div 
          onClick={() => { onClose(); onOpenMetaphysicsModal(); }}
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-black/40 to-amber-950/30 hover:from-amber-950/60 border border-amber-900/50 hover:border-amber-600/70 transition-all cursor-pointer flex items-center justify-between gap-4 group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/60 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-200 group-hover:text-amber-100 flex items-center gap-2">
                <span>观天时 · 术数证据叠层与决策仪式</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60 font-mono-code font-normal">
                  奇门遁甲时空局
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                借象明志，在中立时空沙盘上沉淀理智，在战令敲定前凝聚破釜沉舟的执行意志。
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
        </div>

      </div>
    </div>
  );
};
