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
  onPersistTelemetry?: (telemetry: EmotionalTelemetry) => Promise<void>;
  readOnly?: boolean;
}

export const EmotionalTelemetryModal: React.FC<EmotionalTelemetryModalProps> = ({
  isOpen,
  onClose,
  battlefield,
  onUpdateBattlefield,
  onPersistTelemetry,
  readOnly = false,
}) => {
  const telemetry = battlefield.emotionalTelemetry;
  const [energy, setEnergy] = useState(telemetry.energy);
  const [stress, setStress] = useState(telemetry.stress);
  const [confidence, setConfidence] = useState(telemetry.confidence);
  const [note, setNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || isSaving) return;

    const today = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const newLog = {
      date: today,
      energy,
      stress,
      confidence,
      note: note.trim() || '日常状态记录',
    };

    let aiInsight = '● 当前记录：情绪指标处于安全区间，可按既定博弈计划执行；继续以可验证事实校准行动。';
    if (stress > 80) {
      aiInsight = '⚠️ 当前记录：压力指数 (>80%) 处于严重超载区。建议暂停不可逆妥协，先核对底牌事实与风险断路器。';
    } else if (energy < 40) {
      aiInsight = '⚠️ 当前记录：精力水平偏低 (<40%)。建议延后不可逆决策，或先安排复核与协作。';
    }

    const nextTelemetry: EmotionalTelemetry = {
      ...telemetry,
      energy,
      stress,
      confidence,
      recentLoggedDate: today,
      historyLogs: [...telemetry.historyLogs, newLog],
      aiStressInsight: aiInsight,
    };
    setSaveError(null);
    setIsSaving(true);
    try {
      if (onPersistTelemetry) await onPersistTelemetry(nextTelemetry);
      onUpdateBattlefield(prev => ({
      ...prev,
      emotionalTelemetry: nextTelemetry,
      }));

      setIsSaved(true);
      soundManager.playSuccess();
      window.setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1200);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '状态保存失败，请重试。');
    } finally {
      setIsSaving(false);
    }
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
              disabled={readOnly}
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
              disabled={readOnly}
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
              disabled={readOnly}
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
              disabled={readOnly}
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
          {saveError && <p className="text-xs text-red-300" role="alert">{saveError}</p>}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            {!readOnly && <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono-code text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08] cursor-pointer"
            >
              取消
            </button>}
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono-code flex items-center gap-1.5 shadow-lg shadow-red-950/60 cursor-pointer"
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? '正在同步…' : isSaved ? '状态已同步' : '记录并校准状态'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
