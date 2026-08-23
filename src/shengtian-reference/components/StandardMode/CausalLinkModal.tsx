/* eslint-disable react-hooks/purity */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BoardRole } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { 
  X, 
  Share2, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  Clock, 
  Lock, 
  Sparkles 
} from 'lucide-react';

interface CausalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  battlefieldTitle: string;
}

export const CausalLinkModal: React.FC<CausalLinkModalProps> = ({
  isOpen,
  onClose,
  battlefieldTitle,
}) => {
  const [selectedRole, setSelectedRole] = useState<BoardRole>('STRATEGIST');
  const [enableRedaction, setEnableRedaction] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const generatedLink = `https://aethel.io/collab/link_${Date.now().toString(36)}?role=${selectedRole.toLowerCase()}&redacted=${enableRedaction}`;

  const handleCopy = () => {
    soundManager.playSuccess();
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#00F0FF', '#3A7DFF', '#FFFFFF'],
    });
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans overflow-y-auto">
      <div className="max-w-xl w-full surface-obsidian-war border border-white/[0.15] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-600/80 flex items-center justify-center text-blue-300 shadow-md">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>生成因果协同链接 · CAUSAL LINK</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  ENCRYPTED 48H
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                创建一次性加密链接 · 邀请智囊或合伙人多方推演
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

        {/* Battlefield Target */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.08] space-y-1">
          <span className="text-[10px] font-mono-code text-slate-400 block">绑定战局</span>
          <div className="text-xs font-bold text-white">{battlefieldTitle}</div>
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="text-xs font-mono-code text-slate-300 font-bold block">
            分配受邀者角色权限：
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { role: 'OBSERVER' as const, label: '观察者', desc: '只读观测视界与指标' },
              { role: 'COMMENTATOR' as const, label: '评论员', desc: '可对底牌发表批注' },
              { role: 'STRATEGIST' as const, label: '战略参谋', desc: '可创建幽灵策略分支' },
            ].map((r) => (
              <button
                key={r.role}
                onClick={() => {
                  setSelectedRole(r.role);
                  soundManager.playBlip(750, 0.02);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedRole === r.role
                    ? 'bg-blue-950/80 border-blue-500 shadow-md shadow-blue-950'
                    : 'bg-black/30 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">{r.label}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Redaction Switch */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>自动启用商业敏感数据脱敏</span>
            </div>
            <p className="text-[11px] text-slate-400">
              自动将真实公司名、财务金额与人名替换为战术代号
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableRedaction}
            onChange={(e) => setEnableRedaction(e.target.checked)}
            className="w-4 h-4 accent-blue-500 cursor-pointer"
          />
        </div>

        {/* Generated Link & Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
            <span>加密链接 (48小时后自动作废)</span>
            <span className="text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 有效期 48:00:00
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={generatedLink}
              className="flex-1 bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono-code text-slate-300 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`py-2 px-4 rounded-xl font-mono-code font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900'
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制链接</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
