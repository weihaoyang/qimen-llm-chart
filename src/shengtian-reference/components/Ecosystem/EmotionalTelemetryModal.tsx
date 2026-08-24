import React, { useState } from 'react';
import { 
  HeartPulse, 
  BatteryCharging, 
  Activity, 
  ShieldAlert, 
  Sparkles, 
  HelpCircle, 
  Save, 
  Check,
  TrendingDown,
  Info
} from 'lucide-react';
import { BattlefieldState, EmotionalTelemetry } from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface EmotionalTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
}

export const EmotionalTelemetryModal: React.FC<EmotionalTelemetryModalProps> = ({
  isOpen,
  onClose,
  battlefield,
  onUpdateBattlefield,
}) => {
  const telemetry = battlefield.emotionalTelemetry;
  const [energy, setEnergy] = useState(telemetry.energy);
  const [stress, setStress] = useState(telemetry.stress);
  const [confidence, setConfidence] = useState(telemetry.confidence);
  const [note, setNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const newLog = {
      date: today,
      energy,
      stress,
      confidence,
      note: note.trim() || '日常状态记录',
    };

    let aiInsight = '● 状态平稳：情绪指标处于安全区间，建议按既定博弈计划执行。';
    if (stress > 80) {
      aiInsight = '⚠️ 警报：压力指数 (>80%) 处于严重超载区。历史数据表明，高压状态下你极易出现“恐慌性妥协降价”或“逃避关键谈判”的非理性行为。当前战局切勿轻举妄动，务必核对底牌硬核事实！';
    } else if (energy < 40) {
      aiInsight = '⚠️ 提示：精力水平偏低 (<40%)。认知带宽严重受限，请避免在今晚进行不可逆的重大合同条款决策。';
    }

    onUpdateBattlefield(prev => ({
      ...prev,
      emotionalTelemetry: {
        ...prev.emotionalTelemetry,
        energy,
        stress,
        confidence,
        recentLoggedDate: today,
        historyLogs: [...prev.emotionalTelemetry.historyLogs, newLog],
        aiStressInsight: aiInsight,
      }
    }));

    setIsSaved(true);
    soundManager.playSuccess();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="surface-obsidian rounded-2xl border border-white/[0.12] p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 hud-corner">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-red-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-serif-sc">
              决策者情绪与状态仪表盘 (Emotional Telemetry)
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          现实决策不仅关乎逻辑，更关乎你的生理与心理带宽。系统将你的<strong>精力值</strong>、<strong>压力水平</strong>与<strong>决策信心</strong>量化为状态曲线，防范因恐慌与疲惫引发的“决策变形陷阱”。
        </p>

        {/* Sliders Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Energy Slider */}
          <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
                <span>生理精力值 (Energy Level)</span>
              </span>
              <span className={`font-bold ${energy < 40 ? 'text-red-400' : 'text-emerald-400'}`}>
                {energy}% · {energy > 70 ? '充沛' : energy > 40 ? '正常' : '耗尽预警'}
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Stress Slider */}
          <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                <Activity className="w-4 h-4 text-red-400" />
                <span>心理压力水平 (Stress Level)</span>
              </span>
              <span className={`font-bold ${stress > 80 ? 'text-red-400 animate-pulse' : stress > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stress}% · {stress > 80 ? '红色过载' : stress > 50 ? '中度紧绷' : '平静从容'}
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          {/* Confidence Slider */}
          <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>决策意志与信心 (Confidence)</span>
              </span>
              <span className="text-blue-400 font-bold">
                {confidence}% · {confidence > 70 ? '坚定' : confidence > 40 ? '博弈中' : '自我怀疑'}
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-slate-400 text-xs font-mono-code mb-1">当前心境或触发事件简述 (可选):</label>
            <input 
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：刚收到对方邮件，心跳加快，准备深呼吸后再回复..."
              className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* AI Stress Trap Warning */}
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/60 text-xs text-red-200 leading-relaxed font-mono-code">
            <strong className="text-amber-300 block mb-1">⚠️ 认知行为关联分析：</strong>
            {telemetry.aiStressInsight}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono-code text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08] cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono-code flex items-center gap-1.5 shadow-lg shadow-red-950/60 cursor-pointer"
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaved ? '状态已同步' : '记录并校准状态'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
