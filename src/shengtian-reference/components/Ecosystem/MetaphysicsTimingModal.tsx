import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Moon, 
  Sun, 
  Compass, 
  ShieldCheck, 
  Lock, 
  Flame, 
  Check,
  Eye,
  Radio
} from 'lucide-react';
import { BattlefieldState, MetaphysicsTimingState } from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface MetaphysicsTimingModalProps {
  isOpen: boolean;
  onClose: () => void;
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onPersistTiming?: (timing: MetaphysicsTimingState) => Promise<void>;
  onLockExecution?: () => void | Promise<void>;
  readOnly?: boolean;
}

export const MetaphysicsTimingModal: React.FC<MetaphysicsTimingModalProps> = ({
  isOpen,
  onClose,
  battlefield,
  onUpdateBattlefield,
  onLockExecution,
  readOnly = false,
}) => {
  const timing = battlefield.metaphysicsTiming;
  const [isRevealed, setIsRevealed] = useState(timing.isViewed);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Rehydrate the modal's draft flag from the battle snapshot on open.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRevealed(timing.isViewed);
    }
  }, [isOpen, timing.isViewed]);

  if (!isOpen) return null;

  const handleReveal = async () => {
    if (readOnly || isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const { timing: nextTiming } = await import('../../session/api').then(({ sessionApi }) => sessionApi.timing(
        battlefield.id,
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      ));
      onUpdateBattlefield(prev => ({ ...prev, metaphysicsTiming: nextTiming }));
      setIsRevealed(true);
      soundManager.playSuccess();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '天时记录保存失败，请重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAndLock = async () => {
    if (readOnly || isLocking) return;
    setSaveError(null);
    setIsLocking(true);
    try {
      await onLockExecution?.();
      onClose();
      soundManager.playBlip(900, 0.05);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '执行战令锁定失败，请重试。');
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="surface-obsidian rounded-3xl border border-amber-500/40 p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300 relative overflow-hidden hud-corner">
        
        {/* Subtle Cosmic Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-900/60 to-slate-900 border border-amber-500/60 flex items-center justify-center text-amber-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-sc tracking-wide">
                观天时 · 术数证据叠层与决策仪式
              </h3>
              <span className="text-[10px] font-mono-code text-amber-300">
                {timing.lunarDate} · {timing.solarTerm}
              </span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Solemn Ritual Explanation */}
        <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
          <p>
            在人类面对巨大不确定性时，理性提供骨架，意志赋予灵魂。系统通过东方传统时空模型（奇门遁甲象数构型），提供一份克制且中立的<strong>心智映照镜</strong>。
          </p>
          <p className="text-slate-400 text-[11px] italic">
            “盘面已现。它不预断吉凶，只映照此刻。请从中寻找与你内心坚定决策相呼应的‘象’，以凝结不可动摇的执行意志。”
          </p>
        </div>

        {/* Unveil Button or Cosmic Board Display */}
        {!isRevealed ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-950/40 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-xl shadow-amber-950/50 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>

            {!readOnly && <button
              onClick={handleReveal}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black text-xs font-bold font-mono-code flex items-center gap-2 shadow-2xl shadow-amber-950/80 cursor-pointer transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>{isSaving ? '正在保存天时记录…' : '开启天时映照仪式 (Observe Timing)'}</span>
            </button>}
            {saveError && <p className="text-xs text-red-300" role="alert">{saveError}</p>}
          </div>
        ) : (
          /* Cosmic Qi Men Chart Plate */
          <div className="space-y-4 animate-in fade-in duration-500">
            
            {/* 3x3 Qi Men Matrix Visual */}
            <div className="p-5 rounded-2xl bg-black/70 border border-amber-500/50 space-y-4 font-mono-code text-xs">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-[11px]">
                <span className="text-amber-400 font-bold">● 时空盘面定局：{timing.qiMenChart.gong}</span>
                <span className="text-slate-400">五行能量：{timing.qiMenChart.elementEnergy}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block mb-1">值符九星</span>
                  <strong className="text-white text-sm">{timing.qiMenChart.star}</strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/60">
                  <span className="text-[10px] text-amber-300 block mb-1">值使八门</span>
                  <strong className="text-amber-300 text-base">{timing.qiMenChart.door}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block mb-1">八神临位</span>
                  <strong className="text-white text-sm">{timing.qiMenChart.deity}</strong>
                </div>
              </div>

              {/* Interpretation reflection */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 leading-relaxed font-sans text-xs">
                <strong className="text-amber-400 font-mono-code block mb-1 font-bold">象数意涵启迪：</strong>
                {timing.symbolicReflection}
              </div>
            </div>

            {/* Lock Action Button */}
            <div className="pt-2 flex justify-end gap-3">
              {!readOnly && <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-mono-code text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08] cursor-pointer"
              >
                收纳天时记录
              </button>}
              <button
                onClick={() => void handleConfirmAndLock()}
                disabled={isLocking}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-bold font-mono-code flex items-center gap-2 shadow-xl shadow-red-950/60 cursor-pointer disabled:cursor-wait disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                <span>{isLocking ? '正在锁定执行战令…' : '明心见性 · 锁定最终执行战令'}</span>
              </button>
            </div>
            {saveError && <p className="text-xs text-red-300" role="alert">{saveError}</p>}

          </div>
        )}

      </div>
    </div>
  );
};
