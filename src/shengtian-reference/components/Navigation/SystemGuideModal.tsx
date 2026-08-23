import React from 'react';
import { 
  X, 
  Layers, 
  Bot, 
  GitBranch, 
  ShieldAlert, 
  Flame, 
  Users, 
  Building2, 
  Dna, 
  ShoppingBag, 
  HeartPulse, 
  Compass, 
  Moon, 
  Radio, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';
import { soundManager } from '../../utils/soundEffects';

interface SystemGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: 'WAR_ROOM' | 'DECISION_BOARD' | 'CASE_LAB' | 'COGNITIVE_DNA' | 'MARKETPLACE', tab?: 'interview' | 'cards' | 'simulation' | 'risks') => void;
  onOpenBreakthroughModal: () => void;
  onOpenEmotionalModal: () => void;
  onOpenValueModal: () => void;
  onOpenMetaphysicsModal: () => void;
  onOpenObserverModal: () => void;
  onOpenPersonaModal: () => void;
}

export const SystemGuideModal: React.FC<SystemGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenBreakthroughModal,
  onOpenEmotionalModal,
  onOpenValueModal,
  onOpenMetaphysicsModal,
  onOpenObserverModal,
  onOpenPersonaModal,
}) => {
  if (!isOpen) return null;

  const pillars = [
    {
      id: 'PILLAR_1',
      title: '第一支柱：实战指挥舱 (Core War Room)',
      badge: '实战推演',
      badgeColor: 'text-blue-400 border-blue-800 bg-blue-950/60',
      description: '日常决策顾问与生死破局沙盘，从事实收拢到对抗推演的完整闭环。',
      items: [
        {
          name: '日常决策4步流',
          desc: '①战局采访收拢 → ②底牌盘点(6类认知标签) → ③宿命重力线 → ④风险断路器',
          action: () => { onNavigate('WAR_ROOM', 'interview'); onClose(); },
          btnText: '进入日常推演',
        },
        {
          name: '破局战情沙盘 (Breakthrough)',
          desc: '①战局重构 → ②红蓝认知对抗(3轮拆解) → ③非对称沙盘 → ④冷酷复盘归档',
          action: () => { onClose(); onOpenBreakthroughModal(); },
          btnText: '激活破局模式',
        },
      ]
    },
    {
      id: 'PILLAR_2',
      title: '第二支柱：人网智慧参谋 (Hivemind & Cases)',
      badge: '群体智慧',
      badgeColor: 'text-amber-400 border-amber-800 bg-amber-950/60',
      description: '借助外部智囊与历史全网决策者案例，穿透个人经验盲区。',
      items: [
        {
          name: '加密决策委员会 (Decision Board)',
          desc: '生成48h受邀加密链接，严格数据脱敏，邀请智囊评论员与参谋绘制幽灵策略线。',
          action: () => { onNavigate('DECISION_BOARD'); onClose(); },
          btnText: '进入决策委员会',
        },
        {
          name: '匿名案例推演所 (Case Study Lab)',
          desc: '在真实商业绝境案例中无风险试错，对比全网决策分布与当事人真实胜率。',
          action: () => { onNavigate('CASE_LAB'); onClose(); },
          btnText: '进入案例推演所',
        },
      ]
    },
    {
      id: 'PILLAR_3',
      title: '第三支柱：认知进化与战略资产 (Cognitive Growth)',
      badge: '资产沉淀',
      badgeColor: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
      description: '提炼个人决策DNA图谱，反事实推演验证，接入行业战局模板与通证市场。',
      items: [
        {
          name: '决策DNA图谱 & 反事实沙盒',
          desc: '六维雷达量化思维模式，诊断潜在盲区，重新推演被放弃的备选路径。',
          action: () => { onNavigate('COGNITIVE_DNA'); onClose(); },
          btnText: '查看认知图谱',
        },
        {
          name: '技能市场与权益通证',
          desc: '实战推演赚取权益点，订阅危机公关、反向博弈等行业红队专家模型。',
          action: () => { onNavigate('MARKETPLACE'); onClose(); },
          btnText: '浏览生态市场',
        },
      ]
    },
  ];

  const auxiliaryTools = [
    {
      name: '静默观察者雷达',
      desc: '主动监测异常信号并草拟战情',
      icon: Radio,
      color: 'text-cyan-400',
      action: () => { onClose(); onOpenObserverModal(); },
    },
    {
      name: 'AI 顾问搭档人格',
      desc: '切换守护者/先锋/分析师/哲人',
      icon: Bot,
      color: 'text-blue-400',
      action: () => { onClose(); onOpenPersonaModal(); },
    },
    {
      name: '心理与情绪带宽',
      desc: '压力超载熔断机制',
      icon: HeartPulse,
      color: 'text-rose-400',
      action: () => { onClose(); onOpenEmotionalModal(); },
    },
    {
      name: '价值观伦理校准',
      desc: '核心底线与道德代价扫描',
      icon: Compass,
      color: 'text-purple-400',
      action: () => { onClose(); onOpenValueModal(); },
    },
    {
      name: '观天时 · 决策仪式',
      desc: '奇门遁甲时空局与意志凝聚',
      icon: Moon,
      color: 'text-amber-400',
      action: () => { onClose(); onOpenMetaphysicsModal(); },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="surface-obsidian border border-white/[0.12] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-800/80">
              ECOSYSTEM ARCHITECTURE & ROADMAP
            </span>
            <span className="text-xs font-mono-code text-slate-400">五维深度体系</span>
          </div>
          <h2 className="text-2xl font-serif-sc font-bold text-white tracking-tight">
            胜天半子 · 决策全景架构导引
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            系统以「三大实战支柱」为纵深骨架，辅以「心智感知与天时」辅助中枢，助你在极限压力下看透迷雾、下出胜负手。
          </p>
        </div>

        {/* 3 Pillars Structured Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>核心系统三大支柱 (Core Pillars)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pillars.map((pillar) => (
              <div
                key={pillar.id}
                className="bg-black/40 border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-white/[0.15] transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded border ${pillar.badgeColor}`}>
                      {pillar.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">
                    {pillar.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  {pillar.items.map((item, idx) => (
                    <div key={idx} className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] space-y-1.5">
                      <div className="text-xs font-bold text-slate-200">{item.name}</div>
                      <div className="text-[11px] text-slate-400 leading-normal">{item.desc}</div>
                      <button
                        onClick={item.action}
                        className="mt-1.5 w-full py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-blue-600/80 hover:text-white text-blue-300 font-mono-code text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{item.btnText}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auxiliary Control Center (Dimension 3 & 5) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>心智感知与辅助调控中枢 (Sensory & Mind HUD)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {auxiliaryTools.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <button
                  key={idx}
                  onClick={tool.action}
                  className="p-3 rounded-xl bg-black/40 hover:bg-white/[0.04] border border-white/[0.08] text-left transition-all group cursor-pointer"
                >
                  <Icon className={`w-4 h-4 ${tool.color} mb-1.5 group-hover:scale-110 transition-transform`} />
                  <div className="text-xs font-bold text-slate-200 group-hover:text-white">{tool.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tool.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Fast Action */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-mono-code text-slate-500">
            按 ESC 键或点击外部即可关闭此导引
          </span>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs transition-all cursor-pointer shadow-lg shadow-blue-900/30"
          >
            开始决策推演
          </button>
        </div>

      </div>
    </div>
  );
};
