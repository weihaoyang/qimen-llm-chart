/* eslint-disable react-hooks/purity */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BoardRole } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi, type Collaborator } from '../../session/api';
import { 
  X, 
  Share2, 
  ShieldCheck, 
  Clock
} from 'lucide-react';

interface CausalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  battlefieldTitle: string;
  battleId: string;
}

export const CausalLinkModal: React.FC<CausalLinkModalProps> = ({
  isOpen,
  onClose,
  battlefieldTitle,
  battleId,
}) => {
  const [selectedRole, setSelectedRole] = useState<BoardRole>('STRATEGIST');
  const [enableRedaction, setEnableRedaction] = useState(true);
  const [subjectId, setSubjectId] = useState('');
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const roleMap = { OBSERVER: 'viewer', COMMENTATOR: 'contributor', STRATEGIST: 'advisor' } as const;

  const handleInvite = async () => {
    if (!subjectId.trim()) { setError('请输入受邀者的平台账户 ID。'); return; }
    setError(null); setIsSaving(true);
    try {
      const result = await sessionApi.inviteCollaborator(battleId, {
        subjectType: 'user', subjectId: subjectId.trim(), role: roleMap[selectedRole],
        permissions: { redacted: enableRedaction },
      });
      setCollaborator(result.collaborator);
      soundManager.playSuccess();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '邀请失败，请稍后重试。');
    } finally { setIsSaving(false); }
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
                <span>创建受控协作者 · CAUSAL LINK</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  ACCOUNT INVITE
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                向指定的平台账户授予受控协作权限
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

        <div className="space-y-2">
          <label className="text-xs font-mono-code text-slate-300 font-bold block">受邀者平台账户 ID</label>
          <div className="flex gap-2">
            <input value={subjectId} onChange={(event) => setSubjectId(event.target.value)} placeholder="例如 user_01..." disabled={Boolean(collaborator)} className="flex-1 bg-black/60 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-60" />
            <button onClick={() => void handleInvite()} disabled={isSaving || Boolean(collaborator)} className="px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold">{isSaving ? '发送中…' : collaborator ? '已发送' : '发送邀请'}</button>
          </div>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          {collaborator ? <p className="text-[11px] text-emerald-300">邀请已保存。受邀者以该平台账户登录后，可在其战局协作入口接受邀请；当前版本不伪造 URL 令牌或链接过期语义。</p> : null}
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

        {/* Invitation delivery state */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
            <span>邀请交付状态</span>
            <span className="text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 需受邀账户主动接受
            </span>
          </div>
          <div className="rounded-xl border border-white/[0.1] bg-black/60 px-3 py-2 text-xs font-mono-code text-slate-300">
            {collaborator ? `已向 ${collaborator.subjectType}:${collaborator.subjectId} 创建待接受的 ${collaborator.role} 协作邀请。` : '填写受邀者平台账户 ID 并发送邀请后，服务端会保存一条待接受的协作记录。'}
          </div>
        </div>

      </div>
    </div>
  );
};
