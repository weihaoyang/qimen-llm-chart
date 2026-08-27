import React, { useState } from 'react';
import { ShieldAlert, Flame, AlertTriangle, X, Terminal, Cpu } from 'lucide-react';
import { soundManager } from '../../utils/soundEffects';

interface BreakthroughActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  calculatedDays: number;
  readOnly?: boolean;
}

export const BreakthroughActivationModal: React.FC<BreakthroughActivationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  calculatedDays,
  readOnly = false,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (readOnly) return;
    setBusy(true);
    setError(null);
    soundManager.playBreakthroughActivation();
    try { await onConfirm(); } catch (cause) { setError(cause instanceof Error ? cause.message : '破局模式启动失败，请重试。'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0c0f17] border border-red-900/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-red-950/50 relative overflow-hidden space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/90 border border-red-600 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-900/40 animate-pulse">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>启动破局模式 (BREAKTHROUGH MODE)</span>
              </h3>
              <p className="text-xs text-red-400 font-mono-code">
                EMERGENCY WAR ROOM · 高压认知熔炉
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Warning Body */}
        <div className="space-y-3 text-xs text-slate-300">
          <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-red-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>最高战备警告 (CRITICAL PROTOCOL)：</span>
            </div>
            <p className="leading-relaxed text-red-200/90">
              接下来的推演将模拟<strong>绝对残酷的高压决策环境</strong>。AI将从“顾问”切换为“红队压力测试官”，强行剥离所有情绪与幻想，并生成非常规的<strong>高风险非对称策略</strong>。
            </p>
          </div>

          <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono-code text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>当前约束条件:</span>
              <span className="text-amber-400 font-bold">现金跑道约 {calculatedDays} 天</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>信息处理协议:</span>
              <span className="text-red-400 font-bold">非事实资产自动降级 / 人脉可信度衰减</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>推演能耗:</span>
              <span className="text-slate-300">消耗 1 次深度破局权益 (已授权)</span>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            返回常规顾问
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={readOnly || busy}
            className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-red-900/60 flex items-center gap-2 transition-all glow-red"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{busy ? '正在授权破局权益…' : '确认进入破局战情室'}</span>
          </button>
        </div>
        {error && <p className="rounded-lg border border-red-500/50 bg-red-950/50 px-3 py-2 text-xs text-red-200">{error}</p>}

      </div>
    </div>
  );
};
