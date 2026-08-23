/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, DeciderSigil } from '../../types';
import { drawSigilToCanvas } from '../../utils/sigilGenerator';
import { soundManager } from '../../utils/soundEffects';
import { 
  X, 
  Award, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Layers, 
  Zap, 
  Clock, 
  User, 
  RefreshCw,
  Key
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile;
  sigil?: DeciderSigil;
  onOpenDeepArchivesEasterEgg: () => void;
  onRecalibrate: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  sigil,
  onOpenDeepArchivesEasterEgg,
  onRecalibrate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [easterEggClicks, setEasterEggClicks] = useState(0);

  useEffect(() => {
    if (!isOpen || !sigil || !canvasRef.current) return;

    let time = 0;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      time += 0.015;
      drawSigilToCanvas(ctx, sigil, 260, time);
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, sigil]);

  if (!isOpen) return null;

  const handleSigilClick = () => {
    soundManager.playBlip(900 + easterEggClicks * 150, 0.04);
    const nextClicks = easterEggClicks + 1;
    setEasterEggClicks(nextClicks);

    if (nextClicks >= 3) {
      setEasterEggClicks(0);
      onClose();
      onOpenDeepArchivesEasterEgg();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans overflow-y-auto">
      <div className="max-w-3xl w-full surface-obsidian-war border border-white/[0.15] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-600/80 flex items-center justify-center text-blue-300 shadow-md">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>执棋官档案与决策烙印 · DECIDER PROFILE</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  IDENTITY DOSSIER
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                个人决策风格图谱与成就勋章
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Grid: Sigil Badge Display + Personal Details */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Animated Sigil Canvas (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-black/50 rounded-3xl border border-white/[0.1] relative">
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              onClick={handleSigilClick}
              className="cursor-pointer hover:scale-105 transition-transform"
              title="连续点击3次可触发深网彩蛋入口"
            />
            <div className="text-[10px] font-mono-code text-slate-400 text-center mt-2">
              {easterEggClicks > 0 ? (
                <span className="text-purple-400 font-bold">
                  ⚡ 谐振探测中 [{easterEggClicks}/3] 点击解锁深网
                </span>
              ) : (
                <span>✦ 点击烙印核心可感应隐藏因果视界</span>
              )}
            </div>
          </div>

          {/* User Details & Identity Info (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                {sigil ? sigil.name : '【未校准执棋者】'}
              </span>
              <h3 className="text-xl font-bold text-white mt-1.5">
                {userProfile?.username || '观测者 · 核心执棋官'}
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                UUID: {userProfile?.id || 'usr-alpha-001'} · 绑定AI伙伴: {userProfile?.aiPersona || 'ANALYST'}
              </p>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] text-xs text-slate-300 leading-relaxed">
              {sigil?.description || '深居因果重力场极深处，以冷酷的蓄力与一击必杀的非对称突刺重构现实矩阵。'}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono-code">
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/[0.05]">
                <span className="text-[10px] text-slate-500 block">推演场次</span>
                <span className="text-sm font-bold text-white">
                  {userProfile?.totalSimulations ?? 8} 次
                </span>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/[0.05]">
                <span className="text-[10px] text-slate-500 block">奇点突破率</span>
                <span className="text-sm font-bold text-emerald-400">
                  {userProfile?.singularitySuccessRate ?? 87.5}%
                </span>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/[0.05]">
                <span className="text-[10px] text-slate-500 block">权益余额</span>
                <span className="text-sm font-bold text-amber-400">
                  {userProfile?.equityBalance ?? 500} 点
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  onClose();
                  onRecalibrate();
                }}
                className="text-xs font-mono-code text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>重新执行世界观校准与烙印重铸</span>
              </button>
            </div>
          </div>

        </div>

        {/* Achievements Section */}
        <div className="space-y-3 pt-3 border-t border-white/[0.08]">
          <div className="text-xs font-mono-code font-bold text-slate-300 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>获得成就徽章 (ACHIEVEMENTS)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(userProfile?.achievements || [
              { id: '1', title: '烙印铸成', description: '完成首次世界观校准与咖啡馆危机教学推演' },
              { id: '2', title: '首次突破观测者迷雾', description: '在多用户干涉的迷雾状态下成功引爆破局奇点' },
            ]).map((ach, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/[0.08] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">{ach.title}</div>
                  <div className="text-[11px] text-slate-400">{ach.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
