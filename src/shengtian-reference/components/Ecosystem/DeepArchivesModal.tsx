/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DeepArchiveItem } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import type { DEEP_ARCHIVES_CATALOG } from '../../../lib/scenarios/ecosystem';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sparkles, 
  Lock, 
  Unlock, 
  History, 
  Flame, 
  Layers, 
  Zap, 
  Clock, 
  Compass, 
  CheckCircle2, 
  Eye 
} from 'lucide-react';

interface DeepArchivesModalProps {
  battleId?: string;
  isOpen: boolean;
  onClose: () => void;
  userEquity: number;
  onSpendEquity: (amount: number, reason: string) => boolean;
  readOnly?: boolean;
}

type CatalogArchive = (typeof DEEP_ARCHIVES_CATALOG)[number];

export const DeepArchivesModal: React.FC<DeepArchivesModalProps> = ({
  battleId,
  isOpen,
  onClose,
  userEquity,
  onSpendEquity,
  readOnly = false,
}) => {
  const [archives, setArchives] = useState<DeepArchiveItem[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<DeepArchiveItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void fetch('/api/catalog/deep-archives', { credentials: 'include' }).then(async (response) => {
      if (!response.ok) throw new Error(`深网档案目录读取失败（${response.status}）。`);
      const payload = await response.json() as { archives?: CatalogArchive[] };
      if (cancelled) return;
      const next = Array.isArray(payload.archives) ? payload.archives : [];
      setArchives(next);
      setSelectedArchive(next[0] ?? null);
    }).catch((error) => { if (!cancelled) setUsageError(error instanceof Error ? error.message : '深网档案目录读取失败，请重试。'); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    void sessionApi.module(battleId, 'deep-archives').then(({ state }) => {
      const envelope = state as { state?: unknown } | null;
      const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { unlockedIds?: unknown } | null;
      const unlocked = saved?.unlockedIds;
      if (cancelled || !Array.isArray(unlocked)) return;
      const ids = new Set(unlocked.filter((value): value is string => typeof value === 'string'));
      setArchives((current) => current.map((archive) => ({ ...archive, isUnlocked: archive.isUnlocked || ids.has(archive.id) })));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [battleId]);

  if (!isOpen) return null;
  if (catalogLoading) return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 text-sm text-slate-300">正在读取官方深网档案目录…</div>;
  if (!selectedArchive) return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 text-sm text-red-200">{usageError ?? '官方深网档案目录为空。'}</div>;

  const handleUnlock = async (archive: DeepArchiveItem) => {
    if (readOnly) return;
    if (isRestoring || archive.isUnlocked) return;
    setUsageError(null);
    if (!battleId) {
      setUsageError('请先复制官方案例或创建战局，历史档案解锁必须绑定到已保存战局。');
      return;
    }
    const nextArchives = archives.map(a => (a.id === archive.id ? { ...a, isUnlocked: true } : a));
    try {
      await sessionApi.consumeUsageAndSaveModule(battleId, 'deep_archive_unlock', `deep-archive:${battleId}:${archive.id}`, 'deep-archives', { unlockedIds:nextArchives.filter((item) => item.isUnlocked).map((item) => item.id) });
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : '平台权益校验失败，请重试。');
      return;
    }

    soundManager.playBlip(600, 0.1);
    // Persist first, then reveal the unlocked state immediately. The visual
    // celebration must never be the thing that makes the unlock appear saved.
    setArchives(nextArchives);
    setSelectedArchive(prev => prev ? { ...prev, isUnlocked: true } : prev);
    setIsRestoring(false);
    soundManager.playStrategyLocked();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#00F0FF', '#3A7DFF', '#FFFFFF'],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans overflow-y-auto">
      <div className="max-w-4xl w-full surface-obsidian-war border border-white/[0.15] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-600/80 flex items-center justify-center text-purple-300 shadow-md">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>深网档案 · 历史绝境因果快照</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  THE DEEP ARCHIVES
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                解密人类商业与博弈史上的经典奇点破局案例
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

        {/* Main Grid: Archives List & Snapshot Detail */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* List of Historical Archives (4 cols) */}
          <div className="md:col-span-4 space-y-2.5">
            <div className="text-xs font-mono-code text-slate-400 mb-1">历史因果案例库</div>
            {archives.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedArchive(item);
                  soundManager.playBlip(750, 0.02);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedArchive.id === item.id
                    ? 'bg-purple-950/50 border-purple-500 shadow-lg shadow-purple-950'
                    : 'bg-black/30 border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-black/60 text-slate-300 border border-white/[0.08]">
                    {item.year} 年
                  </span>
                  {item.isUnlocked ? (
                    <span className="text-[10px] font-mono-code text-emerald-400 flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> 已解密
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono-code text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {item.unlockCostEquity} 权益点
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1">{item.historicEventTitle}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.location}</p>
              </div>
            ))}
          </div>

          {/* Detailed Snapshot & Memory Restoration View (8 cols) */}
          <div className="md:col-span-8 p-5 rounded-2xl bg-black/50 border border-white/[0.1] space-y-4">
            
            {isRestoring ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-2 border-t-purple-500 border-r-cyan-500 border-b-transparent border-l-transparent animate-spin mx-auto" />
                <p className="text-xs font-mono-code text-cyan-300">
                  正在修复历史因果全息快照 · 重构未来视界仪数据...
                </p>
              </div>
            ) : selectedArchive.isUnlocked ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedArchive.historicEventTitle}</h3>
                    <p className="text-xs font-mono-code text-slate-400">
                      {selectedArchive.codeName} · 执棋者烙印: {selectedArchive.historicalSigilName}
                    </p>
                  </div>
                  <div className="text-right font-mono-code">
                    <span className="text-[10px] text-slate-500 block">历史最终α胜率</span>
                    <span className="text-base font-bold text-amber-400">
                      {(selectedArchive.historicalAlphaRate * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-purple-300 font-mono-code">【核心绝境困局】</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                    {selectedArchive.keyDilemma}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-cyan-300 font-mono-code">【战局全景摘要】</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedArchive.summary}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-300 font-mono-code">【关键破局涟漪序列】</span>
                  <div className="space-y-1.5">
                    {selectedArchive.finalRippleSequence.map((step, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-slate-200 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/50 border border-amber-500/60 flex items-center justify-center text-amber-400 mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">此历史档案处于加密碎片状态</h4>
                  <p className="text-xs text-slate-400 font-mono-code">
                    消耗 {selectedArchive.unlockCostEquity} 权益点以解密全息因果推演快照
                  </p>
                </div>
                <button
                  onClick={() => void handleUnlock(selectedArchive)}
                  disabled={readOnly || isRestoring}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-mono-code font-bold text-xs shadow-lg shadow-purple-950 cursor-pointer"
                >
                  解密此历史案例 ({selectedArchive.unlockCostEquity} 权益点)
                </button>
                {usageError && <p className="text-xs text-red-300">{usageError}</p>}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
