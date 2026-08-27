/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  DeciderSigil, 
  AIPersonaType, 
  UserProfile 
} from '../../types';
import { 
  generateDeciderSigil, 
  drawSigilToCanvas 
} from '../../utils/sigilGenerator';
import { soundManager } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Bot, 
  ShieldAlert, 
  Layers, 
  GitBranch, 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Terminal, 
  Lock, 
  Compass, 
  Award,
  Eye,
  RefreshCw,
  Clock
} from 'lucide-react';

interface CalibrationFlowProps {
  onCompleteCalibration: (profile: UserProfile, sigil: DeciderSigil, answers: AIPersonaType[]) => void;
  onCancel?: () => void;
}

const CALIBRATION_QUESTIONS = [
  {
    id: 1,
    title: '【问题 01 · 因果秩序观】',
    question: '当你面对极度混乱且突发的危机局势时，你的底层直觉更认同哪种法则？',
    options: [
      {
        key: 'A' as const,
        text: '任何混乱背后都有严密的贝叶斯概率链，唯有剥离情绪量化事实，方能破局。',
        persona: 'ANALYST' as AIPersonaType,
        personaName: '【分析师 / The Analyst】',
      },
      {
        key: 'B' as const,
        text: '历史是一面巨大周期的透视镜，当前的绝境不过是某种宏观因果的必然重演。',
        persona: 'GUARDIAN' as AIPersonaType, // 兼具历史学家底色
        personaName: '【历史学家 / The Historian】',
      },
      {
        key: 'C' as const,
        text: '既定规则皆为虚妄，唯有在规则盲区中进行非对称突刺，才能撕裂既定宿命。',
        persona: 'VANGUARD' as AIPersonaType,
        personaName: '【先锋刺客 / The Vanguard】',
      },
      {
        key: 'D' as const,
        text: '外部条件瞬息万变，唯有坚守第一性原理与道德底线，方能在风暴中立于不败。',
        persona: 'PHILOSOPHER' as AIPersonaType,
        personaName: '【哲人领袖 / The Philosopher】',
      },
    ],
  },
  {
    id: 2,
    title: '【问题 02 · 资源与博弈姿态】',
    question: '当对手企图通过资本优势在关键节点挤压你的生存空间时，你的第一反应是？',
    options: [
      {
        key: 'A' as const,
        text: '测算双方现金跑道消耗速率，构建防御性断路器，等待对手出现致命失误。',
        persona: 'ANALYST' as AIPersonaType,
        personaName: '【分析师】',
      },
      {
        key: 'B' as const,
        text: '坚决不参与消耗战，立刻将战场转移至对手看不懂或不愿涉足的高维新生态。',
        persona: 'VANGUARD' as AIPersonaType,
        personaName: '【先锋刺客】',
      },
      {
        key: 'C' as const,
        text: '联合上下游生态伙伴形成同盟利益网络，借力打力进行多方联合对冲。',
        persona: 'GUARDIAN' as AIPersonaType,
        personaName: '【守护者】',
      },
      {
        key: 'D' as const,
        text: '回归核心用户的真实未被满足价值，不被对手节奏带偏，以纯粹产品力取胜。',
        persona: 'PHILOSOPHER' as AIPersonaType,
        personaName: '【哲人领袖】',
      },
    ],
  },
  {
    id: 3,
    title: '【问题 03 · 终极绝境抉择】',
    question: '若唯有牺牲某项重要原则或核心利益才能换取90%生存几率，你的选择是？',
    options: [
      {
        key: 'A' as const,
        text: '生存是第一要义。任何资源与筹码皆可置换，包括短期的妥协与退让。',
        persona: 'VANGUARD' as AIPersonaType,
        personaName: '【先锋刺客】',
      },
      {
        key: 'B' as const,
        text: '严守不可突破的伦理红线，即便失败亦要在自洽中保有核心火种与声誉。',
        persona: 'PHILOSOPHER' as AIPersonaType,
        personaName: '【哲人领袖】',
      },
      {
        key: 'C' as const,
        text: '建立蒙特卡洛模拟矩阵，精确定量各选项的期望值净收益，严格由数据裁决。',
        persona: 'ANALYST' as AIPersonaType,
        personaName: '【分析师】',
      },
      {
        key: 'D' as const,
        text: '启动多层备用避风港方案，将核心专利与骨干团队隔绝于清算风险之外。',
        persona: 'GUARDIAN' as AIPersonaType,
        personaName: '【守护者】',
      },
    ],
  },
];

export const CalibrationFlow: React.FC<CalibrationFlowProps> = ({
  onCompleteCalibration,
  onCancel,
}) => {
  // Stages: 'FIELD_CONNECT' -> 'CALIBRATION_QUESTIONS' -> 'TUTORIAL_WAR' -> 'FORGING_CEREMONY' -> 'SIGIL_DOSSIER'
  const [stage, setStage] = useState<'FIELD_CONNECT' | 'CALIBRATION_QUESTIONS' | 'TUTORIAL_WAR' | 'FORGING_CEREMONY' | 'SIGIL_DOSSIER'>('FIELD_CONNECT');
  
  // Connection animation state
  const [connectProgress, setConnectProgress] = useState(0);
  const [connectLog, setConnectLog] = useState<string[]>([]);
  
  // Worldview selection
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, AIPersonaType>>({});
  const [assignedPersona, setAssignedPersona] = useState<AIPersonaType>('ANALYST');
  
  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState<1 | 2 | 3>(1); // 1: 盘点底牌, 2: 路径推演, 3: 引爆奇点
  const [tutorialCards, setTutorialCards] = useState([
    { id: 'c1', title: '房东通知下月租金暴涨 40%', tag: 'FACT', verified: true },
    { id: 'c2', title: '隔壁连锁品牌开展为期30天的 0 元抢客活动', tag: 'FACT', verified: true },
    { id: 'c3', title: '假设只要咬牙降价 20% 就能稳住 80% 老客', tag: 'HYPOTHESIS', verified: false, isTrap: true },
    { id: 'c4', title: '已有 15 家企业客户长期私下订购定制挂耳包', tag: 'OPPORTUNITY', verified: true },
  ]);
  const [trapEliminated, setTrapEliminated] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<'PRICE_WAR' | 'ASYMMETRIC_PIVOT' | null>(null);
  const [singularityIgnited, setSingularityIgnited] = useState(false);
  
  // Sigil Forging State
  const [forgingProgress, setForgingProgress] = useState(0);
  const [generatedSigil, setGeneratedSigil] = useState<DeciderSigil | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Field Connect Animation Effect
  useEffect(() => {
    if (stage !== 'FIELD_CONNECT') return;

    soundManager.playBlip(440, 0.08);
    const logs = [
      'INITIATING QUANTUM FIELD PROTOCOL...',
      'SCANNING CAUSAL HORIZON FREQUENCIES [8.420 GHz]...',
      'INTERCEPTING DECISION GRAVITY VECTORS...',
      'SYNCHRONIZING OBSERVER MATRIX NODES...',
      'REALITY FIELD ACCESS ESTABLISHED [100%]',
    ];

    let logIndex = 0;
    const interval = setInterval(() => {
      setConnectProgress(prev => {
        const next = prev + 1.2;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStage('CALIBRATION_QUESTIONS');
            soundManager.playSuccess();
          }, 800);
          return 100;
        }

        if (next > (logIndex + 1) * 20 && logIndex < logs.length) {
          setConnectLog(l => [...l, logs[logIndex]]);
          logIndex++;
          soundManager.playBlip(600 + logIndex * 100, 0.03);
        }
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [stage]);

  // Answer question handler
  const handleSelectOption = (persona: AIPersonaType) => {
    soundManager.playBlip(750, 0.03);
    const updated = { ...selectedAnswers, [currentQuestionIdx]: persona };
    setSelectedAnswers(updated);

    if (currentQuestionIdx < CALIBRATION_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Calculate majority persona
      const counts: Record<string, number> = {};
      Object.values(updated).forEach((p: AIPersonaType) => {
        const key = String(p);
        counts[key] = (counts[key] || 0) + 1;
      });
      let highestPersona: AIPersonaType = 'ANALYST';
      let highestCount = 0;
      Object.entries(counts).forEach(([k, v]) => {
        if (v > highestCount) {
          highestCount = v;
          highestPersona = k as AIPersonaType;
        }
      });
      setAssignedPersona(highestPersona);
      setStage('TUTORIAL_WAR');
      soundManager.playSuccess();
    }
  };

  // Tutorial Actions
  const handleEliminateTrap = () => {
    soundManager.playBlip(900, 0.05);
    setTrapEliminated(true);
    setTutorialCards(prev => prev.map(c => c.isTrap ? { ...c, verified: true, tag: 'RISK' } : c));
  };

  const handleProceedToPathfinding = () => {
    soundManager.playSuccess();
    setTutorialStep(2);
  };

  const handleSelectStrategy = (strat: 'PRICE_WAR' | 'ASYMMETRIC_PIVOT') => {
    setSelectedStrategy(strat);
    soundManager.playBlip(800, 0.04);
  };

  const handleIgniteSingularity = () => {
    soundManager.playStrategyLocked();
    setSingularityIgnited(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFB800', '#3A7DFF', '#00F0FF', '#FFFFFF'],
    });

    setTimeout(() => {
      // Begin Sigil Forging Ceremony
      setStage('FORGING_CEREMONY');
      startSigilForging();
    }, 1400);
  };

  // 4. Sigil Forging Ceremony
  const startSigilForging = () => {
    soundManager.playBlip(520, 0.1);
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setForgingProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        // Generate actual procedural sigil
        const sigil = generateDeciderSigil({
          decisionSpeedSec: 14.2,
          riskPreference: selectedStrategy === 'ASYMMETRIC_PIVOT' ? 'ASYMMETRIC_AGGRESSIVE' : 'PROBABILISTIC',
          resourceAllInRatio: 0.75,
          cognitiveRigorScore: 9.4,
        });
        setGeneratedSigil(sigil);
        setStage('SIGIL_DOSSIER');
        soundManager.playSuccess();
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 },
          colors: [sigil.glowColor, sigil.secondaryColor, '#FFFFFF'],
        });
      }
    }, 50);
  };

  // Canvas animated render for Sigil
  useEffect(() => {
    if (stage !== 'SIGIL_DOSSIER' || !generatedSigil || !canvasRef.current) return;

    let time = 0;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      time += 0.015;
      drawSigilToCanvas(ctx, generatedSigil, 280, time);
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stage, generatedSigil]);

  const handleFinishOnboarding = () => {
    if (!generatedSigil) return;
    const newProfile: UserProfile = {
      // Identity belongs to the platform session. The calibration flow only
      // produces preferences; it must not mint a synthetic account or expose
      // a fabricated email address in the user's profile.
      id: 'current-account',
      username: '当前执棋官',
      email: '',
      sigil: generatedSigil,
      aiPersona: assignedPersona,
      isCalibrated: true,
      totalSimulations: 0,
      singularitySuccessRate: 0,
      favoriteStrategyType: '',
      // Entitlements are resolved by the unified platform after calibration;
      // never mint local equity in the browser.
      equityBalance: 0,
      achievements: [],
    };

    soundManager.playSuccess();
    onCompleteCalibration(newProfile, generatedSigil, CALIBRATION_QUESTIONS.map((_, index) => selectedAnswers[index]).filter((value): value is AIPersonaType => Boolean(value)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05080D] text-slate-100 font-sans overflow-y-auto">
      <div className="max-w-3xl w-full surface-obsidian-war border border-white/[0.15] rounded-3xl p-6 sm:p-9 shadow-2xl relative my-auto">
        
        {/* Top Header info */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-700/80 flex items-center justify-center text-amber-400 font-serif-sc font-bold text-sm">
              胜
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif-sc tracking-wide text-white flex items-center gap-2">
                <span>AETHEL · 现实因果推演系统</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  CALIBRATION PROTOCOL
                </span>
              </h2>
              <p className="text-[11px] font-mono-code text-slate-400">身份确立与认知校准协议</p>
            </div>
          </div>

          {stage === 'FIELD_CONNECT' && (
            <button
              onClick={() => setStage('CALIBRATION_QUESTIONS')}
              className="text-xs font-mono-code text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-all cursor-pointer"
            >
              跳过接入序列 →
            </button>
          )}
        </div>

        {/* STAGE 1: FIELD_CONNECT (10-15s Sci-Fi Field Access Visual) */}
        {stage === 'FIELD_CONNECT' && (
          <div className="py-8 space-y-6 text-center animate-fadeIn">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/40 animate-spin" style={{ animationDuration: '10s' }} />
              <div className="absolute inset-2 rounded-full border border-amber-500/50 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-950 via-slate-900 to-amber-950/80 border border-white/[0.2] flex items-center justify-center shadow-2xl">
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-bold font-serif-sc text-white tracking-wider">
                正在接入现实因果信息场域...
              </h3>
              <p className="text-xs font-mono-code text-slate-400">
                Quantum Causal Field Calibration · 同步脑电波与决策重力场
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-2">
              <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/[0.1]">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-400 transition-all duration-150"
                  style={{ width: `${connectProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono-code text-slate-400">
                <span>场域共振中</span>
                <span className="text-amber-400 font-bold">{Math.round(connectProgress)}%</span>
              </div>
            </div>

            {/* Terminal Stream Logs */}
            <div className="bg-black/60 border border-white/[0.08] rounded-2xl p-4 max-w-md mx-auto text-left font-mono-code text-[11px] text-slate-300 h-32 overflow-y-auto space-y-1.5 shadow-inner">
              {connectLog.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2 text-cyan-300">
                  <span className="text-slate-500">[{idx + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 2: WORLDVIEW CALIBRATION QUESTIONS */}
        {stage === 'CALIBRATION_QUESTIONS' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code text-amber-400 font-bold uppercase tracking-wider">
                  {CALIBRATION_QUESTIONS[currentQuestionIdx].title}
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  {currentQuestionIdx + 1} / {CALIBRATION_QUESTIONS.length}
                </span>
              </div>
              <h3 className="text-base font-bold text-white leading-relaxed">
                {CALIBRATION_QUESTIONS[currentQuestionIdx].question}
              </h3>
            </div>

            <div className="space-y-3">
              {CALIBRATION_QUESTIONS[currentQuestionIdx].options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSelectOption(opt.persona)}
                  className="w-full text-left p-4 rounded-2xl bg-black/40 hover:bg-blue-950/40 border border-white/[0.08] hover:border-blue-500/60 transition-all cursor-pointer group flex items-start gap-3.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-white/[0.06] group-hover:bg-blue-600 group-hover:text-white border border-white/[0.1] flex items-center justify-center font-mono-code font-bold text-xs text-slate-300 shrink-0 transition-colors">
                    {opt.key}
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-200 group-hover:text-white leading-relaxed">
                      {opt.text}
                    </p>
                    <span className="inline-block text-[10px] font-mono-code text-slate-500 group-hover:text-blue-300">
                      匹配偏好：{opt.personaName}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 3: TUTORIAL WAR (CAFE CRISIS) */}
        {stage === 'TUTORIAL_WAR' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Step Banner */}
            <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                  实战教学关卡
                </span>
                <span className="text-xs text-white font-bold">「精品咖啡馆生存危机」</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono-code text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span>跑道仅余 35 天</span>
              </div>
            </div>

            {/* Tutorial Sub-Step 1: Cards Inventory */}
            {tutorialStep === 1 && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-xl text-xs text-blue-200 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    【{assignedPersona === 'ANALYST' ? '分析师' : assignedPersona === 'VANGUARD' ? '先锋' : '顾问'}提醒】：
                    在四张情报中，发现一张带有致命自欺欺人的「虚假假设」！请点击并识破它。
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tutorialCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => card.isTrap && handleEliminateTrap()}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        card.isTrap
                          ? trapEliminated
                            ? 'bg-red-950/60 border-red-500 shadow-md shadow-red-950'
                            : 'bg-amber-950/30 border-amber-500/70 hover:scale-[1.02] animate-pulse'
                          : 'bg-black/30 border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-mono-code px-1.5 py-0.5 rounded border ${
                          card.tag === 'FACT' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                          card.tag === 'OPPORTUNITY' ? 'bg-teal-950 text-teal-300 border-teal-800' :
                          'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {card.tag === 'FACT' ? '硬事实' : card.tag === 'OPPORTUNITY' ? '机会' : '致命假设'}
                        </span>
                        {card.isTrap && !trapEliminated && (
                          <span className="text-[10px] text-amber-400 font-mono-code font-bold">
                            👈 点击识破陷阱
                          </span>
                        )}
                        {card.isTrap && trapEliminated && (
                          <span className="text-[10px] text-red-400 font-mono-code font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 已识破自欺
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200">{card.title}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    disabled={!trapEliminated}
                    onClick={handleProceedToPathfinding}
                    className={`py-2 px-5 rounded-xl font-mono-code font-bold text-xs flex items-center gap-2 transition-all ${
                      trapEliminated
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>进入第2步：路径推演与奇点引爆</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tutorial Sub-Step 2: Pathfinding & Singularity */}
            {tutorialStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 bg-red-950/30 border border-red-800/60 rounded-xl text-xs text-red-200">
                  <span className="font-bold text-red-400 mr-1.5">[宿命重力线预测]</span>
                  若选择常规「降价肉搏」，35天后现金耗尽，倒闭概率 94.2%。请选择「非对称升维突刺」！
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handleSelectStrategy('PRICE_WAR')}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      selectedStrategy === 'PRICE_WAR'
                        ? 'bg-red-950/80 border-red-500'
                        : 'bg-black/40 border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-300 mb-1">常规路径：降价肉搏</div>
                    <p className="text-[11px] text-slate-400 mb-2">跟进0元咖啡，消耗剩余现金补贴，寄希望于竞品先离场。</p>
                    <div className="text-[11px] font-mono-code text-red-400 font-bold">预期胜率: 5.8% (宿命毁灭)</div>
                  </button>

                  <button
                    onClick={() => handleSelectStrategy('ASYMMETRIC_PIVOT')}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      selectedStrategy === 'ASYMMETRIC_PIVOT'
                        ? 'bg-gradient-to-br from-amber-950/80 to-blue-950/80 border-amber-400 shadow-xl shadow-amber-950/50'
                        : 'bg-black/40 border-white/[0.08] hover:border-amber-500/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>非对称突破：全员转向企业B端订阅</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-2">
                      放弃到店散客缠斗，退租沿街昂贵门面，将设备与产能全盘all-in企业定制挂耳与周度工位咖啡。
                    </p>
                    <div className="text-[11px] font-mono-code text-emerald-400 font-bold">预期胜率: 87.5% (奇点突破)</div>
                  </button>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    disabled={selectedStrategy !== 'ASYMMETRIC_PIVOT'}
                    onClick={handleIgniteSingularity}
                    className={`py-2.5 px-6 rounded-xl font-mono-code font-bold text-xs flex items-center gap-2 transition-all ${
                      selectedStrategy === 'ASYMMETRIC_PIVOT'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-950/60 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-red-900" />
                    <span>引爆奇点 · 铸成你的决策者烙印</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 4: FORGING CEREMONY */}
        {stage === 'FORGING_CEREMONY' && (
          <div className="py-12 text-center space-y-6 animate-fadeIn">
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600/30 to-blue-600/30 backdrop-blur-md flex items-center justify-center">
                <Zap className="w-10 h-10 text-amber-300 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-serif-sc font-bold text-white tracking-widest">
                正在聚合金圣几何能量 · 铸成唯一决策者烙印
              </h3>
              <p className="text-xs font-mono-code text-amber-400">
                FORGING SACRED SIGIL · ANALYZING COGNITIVE SIGNATURE
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-2">
              <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/[0.1]">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: `${forgingProgress}%` }}
                />
              </div>
              <div className="text-[11px] font-mono-code text-slate-400">
                烙印结构拟合度: {forgingProgress}%
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: SIGIL DOSSIER & PROFILE UNVEILING */}
        {stage === 'SIGIL_DOSSIER' && generatedSigil && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest px-3 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                DECIDER SIGIL FORGED · 决策者专属烙印
              </span>
              <h3 className="text-2xl font-serif-sc font-black text-white tracking-wide mt-2">
                {generatedSigil.name}
              </h3>
              <p className="text-xs font-mono-code text-slate-400">
                ID: {generatedSigil.codeName} · 种子标号 #{generatedSigil.geometricSeed}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* Sigil Canvas with glowing frame */}
              <div className="relative flex items-center justify-center p-4 bg-black/60 rounded-3xl border border-white/[0.12] shadow-2xl">
                <canvas 
                  ref={canvasRef} 
                  width={280} 
                  height={280} 
                  className="max-w-full h-auto cursor-pointer hover:scale-105 transition-transform"
                  title="点击核心可探索深网暗号"
                />
                <div className="absolute bottom-3 left-3 text-[9px] font-mono-code text-slate-500">
                  SACRED GEOMETRY: {generatedSigil.primaryGeometry}
                </div>
              </div>

              {/* Dossier Breakdown */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2">
                  <div className="text-xs font-bold text-amber-300 font-mono-code">【决策风格与心智特征】</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {generatedSigil.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                    <span className="text-slate-500 text-[10px]">AI 伙伴搭档</span>
                    <div className="font-bold text-blue-300 mt-0.5">
                      {assignedPersona === 'ANALYST' ? '分析师' : assignedPersona === 'VANGUARD' ? '先锋' : assignedPersona === 'PHILOSOPHER' ? '哲人' : '守护者'}
                    </div>
                  </div>

                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                    <span className="text-slate-500 text-[10px]">初始推演权益</span>
                    <div className="font-bold text-amber-400 mt-0.5">
                      500 权益点
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleFinishOnboarding}
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-mono-code font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-950/60 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>接受烙印，开启因果推演工坊</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
