/* eslint-disable react-hooks/purity */
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  HelpCircle, 
  Sparkles, 
  Clock, 
  Target, 
  ArrowRight,
  ShieldAlert,
  BrainCircuit
} from 'lucide-react';
import { BattlefieldState, InterviewMessage } from '../../types';
import { TacticalAIService } from '../../services/aiService';
import { soundManager } from '../../utils/soundEffects';

interface InterviewTabProps {
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onNavigateToCards: () => void;
}

export const InterviewTab: React.FC<InterviewTabProps> = ({
  battlefield,
  onUpdateBattlefield,
  onNavigateToCards,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battlefield.interviewHistory, isTyping]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isTyping) return;

    soundManager.playTypewriter();
    setInputText('');

    const userMsg: InterviewMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    onUpdateBattlefield(prev => ({
      ...prev,
      interviewHistory: [...prev.interviewHistory, userMsg],
    }));

    setIsTyping(true);

    try {
      const response = await TacticalAIService.answerInterview(
        battlefield.interviewHistory,
        textToSend,
        battlefield
      );

      const aiMsg: InterviewMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        parameterExtracted: response.parameterExtracted,
      };

      onUpdateBattlefield(prev => ({
        ...prev,
        interviewHistory: [...prev.interviewHistory, aiMsg],
        idealOutcome: response.parameterExtracted?.key === 'ideal_outcome' ? String(response.parameterExtracted.value) : prev.idealOutcome,
        bottomLine: response.parameterExtracted?.key === 'bottom_line' ? String(response.parameterExtracted.value) : prev.bottomLine,
      }));
      soundManager.playBlip(900, 0.05);
    } catch (error) {
      const errorMsg: InterviewMessage = {
        id: `msg-error-${Date.now()}`,
        sender: 'ai',
        text: error instanceof Error ? `采访未完成：${error.message}` : '采访未完成，请重试。',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      onUpdateBattlefield(prev => ({ ...prev, interviewHistory: [...prev.interviewHistory, errorMsg] }));
    } finally {
      setIsTyping(false);
    }
  };

  // Quick preset answers for instant exploration
  const quickPrompts = [
    '我们核心客户流失概率攀升至80%，急需评估保盘对策',
    '如果发生违约，我们的底线是确保核心团队不散且保住主营业务',
    '竞争对手正在进行恶性价格战，我们资金仅剩60天',
    '最理想结果：不仅稳住续约，更以合规优势倒逼对手退出',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left 8 Cols: Structured Interview Dialogue */}
      <div className="lg:col-span-8 surface-obsidian hud-corner rounded-2xl p-5 border border-white/[0.08] shadow-2xl flex flex-col h-[calc(100vh-220px)] min-h-[450px] max-h-[700px] relative">
        
        {/* Dialogue Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-950/90 border border-blue-500/50 flex items-center justify-center text-blue-300 shadow-md inner-glow-blue">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-tight">
                战局现实采访 · 结构化收拢
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/60 font-bold uppercase">
                  Standard Advisor
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                通过层层追问，将混乱模糊的情绪转化为严密的参数与底线指标
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToCards}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-code font-bold bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-700/50 transition-all cursor-pointer shadow-sm"
          >
            <span>前往底牌盘点</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto my-4 pr-2 space-y-4">
          {battlefield.interviewHistory.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm leading-relaxed ${isAI ? 'justify-start' : 'justify-end'}`}
              >
                {isAI && (
                  <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[82%] rounded-2xl p-3.5 ${
                  isAI
                    ? 'bg-slate-900/90 border border-white/[0.08] text-slate-200 shadow-md'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-950/60'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  
                  {msg.parameterExtracted && (
                    <div className="mt-2.5 pt-2 border-t border-white/[0.1] flex items-center gap-2 text-xs font-mono-code">
                      <span className="bg-amber-950/90 text-amber-300 border border-amber-600/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        参数捕获
                      </span>
                      <span className="text-slate-400">{msg.parameterExtracted.label}:</span>
                      <span className="text-amber-200 font-bold">{String(msg.parameterExtracted.value)}</span>
                    </div>
                  )}

                  <div className={`text-[10px] font-mono-code mt-1 text-right ${isAI ? 'text-slate-500' : 'text-blue-200'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {!isAI && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 text-sm items-center text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-300">
                <Bot className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-slate-900/90 border border-white/[0.08] rounded-xl px-4 py-2 text-xs flex items-center gap-2 font-mono-code">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span>顾问正在进行因果逻辑推演与参数收拢...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Prompts */}
        <div className="pt-2 pb-3 border-t border-white/[0.08] shrink-0">
          <div className="text-[11px] font-mono-code text-slate-400 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>快速输入参考：</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="text-xs bg-black/40 hover:bg-blue-950/60 text-slate-300 hover:text-blue-200 border border-white/[0.08] hover:border-blue-500/50 px-2.5 py-1 rounded-lg transition-all text-left cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Box */}
        <div className="relative shrink-0">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="描述当前发生的事件、风险判断或对策预期（Enter发送，Shift+Enter换行）..."
            rows={2}
            className="w-full bg-black/60 border border-white/[0.1] focus:border-blue-500 rounded-xl pl-3.5 pr-12 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors resize-none font-mono-code"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
            className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Right 4 Cols: Structured Reality Parameters Panel */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* Core Reality Model Card */}
        <div className="surface-obsidian hud-corner rounded-2xl p-5 border border-white/[0.08] shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-tight">
              <Target className="w-4 h-4 text-amber-400" />
              <span>当前战局结构化参数</span>
            </h3>
            <span className="text-xs font-mono-code text-slate-400">
              置信度: <strong className="text-emerald-400">{battlefield.confidence}%</strong>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">战局标题 / 核心命题</span>
              <p className="bg-black/50 p-2.5 rounded-xl text-slate-200 border border-white/[0.06] font-bold">
                {battlefield.title}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">理想上行目标 (Best Case)</span>
              <p className="bg-emerald-950/40 p-2.5 rounded-xl text-emerald-300 border border-emerald-700/60 font-medium">
                {battlefield.idealOutcome || '尚未设定'}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">生存硬红线 (Bottom Line)</span>
              <p className="bg-red-950/40 p-2.5 rounded-xl text-red-300 border border-red-700/60 font-medium">
                {battlefield.bottomLine || '尚未量化'}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-mono-code text-[11px]">关键博弈方与约束规则</span>
              <div className="space-y-1.5">
                {battlefield.keyActors.map((actor, idx) => (
                  <div key={idx} className="bg-black/40 p-2 rounded-lg border border-white/[0.06] text-slate-300 flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span>{actor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.08]">
            <button
              onClick={onNavigateToCards}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-950"
            >
              <span>确认参数，进入现实底牌盘点</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Methodological Guidance */}
        <div className="surface-obsidian rounded-2xl p-4.5 border border-white/[0.06] text-xs text-slate-300 space-y-2.5 shadow-xl">
          <div className="flex items-center gap-1.5 text-white font-bold font-mono-code">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>专业决策采访原则</span>
          </div>
          <div className="space-y-1.5 text-slate-400 leading-relaxed text-[11px]">
            <p>1. <strong className="text-slate-200">剥离情绪</strong>：区分客观事实与主观愿望，所有假设将被标记为待验证。</p>
            <p>2. <strong className="text-slate-200">量化红线</strong>：拒绝“不能失败”的模糊表述，明确锁定时间与资金数字。</p>
            <p>3. <strong className="text-slate-200">动态博弈</strong>：对手非静态木偶，每一项策略都必须计算对手的对抗性反应。</p>
          </div>
        </div>

      </div>

    </div>
  );
};
