/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DeepArchiveItem } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
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
}

const HISTORICAL_ARCHIVES: DeepArchiveItem[] = [
  {
    id: 'arch-ltcm-1998',
    codeName: 'ARCH-1998-LTCM',
    historicEventTitle: '1998 长期资本管理公司 (LTCM) 黑天鹅破局',
    year: '1998',
    location: '美国 · 格林威治',
    summary: '诺奖得主模型遭遇俄罗斯债务违约黑天鹅，46亿美元杠杆资产面临挤兑。美联储牵头14家华尔街巨头联合注资36.25亿美元，完成史上经典非对称过桥纾困。',
    keyDilemma: '百亿衍生品持仓在无买盘情况下被迫清算，引发全球金融体系连锁雪崩。',
    finalRippleSequence: [
      '第一步：封存单边利差套利敞口，剥离非核心对冲持仓',
      '第二步：向纽约联储展示系统性传染因果图，倒逼银行业财团介入',
      '第三步：以90%股权让渡换取无追索权过桥资金，保全核心资产信用',
    ],
    historicalSigilName: '【永恒的阿基米德】',
    historicalAlphaRate: 0.9245,
    isUnlocked: true,
    unlockCostEquity: 0,
  },
  {
    id: 'arch-lehman-2008',
    codeName: 'ARCH-2008-LEHMAN',
    historicEventTitle: '2008 雷曼兄弟清算夜：巴克莱资产火种抢救',
    year: '2008',
    location: '美国 · 纽约曼哈顿',
    summary: '在失去最后贷款人支持的绝境72小时内，将优质投行与交易业务与有毒次贷资产彻底物理隔离，由巴克莱以17.5亿美元极速收购，保全逾万名员工火种。',
    keyDilemma: '母公司现金仅剩数小时耗尽，常规破产将导致全球清算链条全盘冻结。',
    finalRippleSequence: [
      '第一步：实施「焦土切割」，将核心交易牌照与有毒资产实体剥离',
      '第二步：在破产法第11条框架下极速完成资产包过桥转让协议',
      '第三步：锁定关键骨干团队留任奖金，维持北美交易柜台不间断运转',
    ],
    historicalSigilName: '【深潜的利维坦】',
    historicalAlphaRate: 0.7850,
    isUnlocked: false,
    unlockCostEquity: 100,
  },
  {
    id: 'arch-tylenol-1982',
    codeName: 'ARCH-1982-TYLENOL',
    historicEventTitle: '1982 强生泰诺投毒事件：第一性伦理奇点突围',
    year: '1982',
    location: '美国 · 芝加哥',
    summary: '遭遇恶意投毒危机后，强生管理层顶住1亿美元直接损失，在全国范围内无条件召回3100万瓶药品，并率先发明三层防篡改包装，次年市占率奇迹回升至30%。',
    keyDilemma: '品牌面临毁灭性公信力崩塌，传统公关辩解只会加速死亡。',
    finalRippleSequence: [
      '第一步：启动第一性伦理原则，无条件全美召回并悬赏缉凶',
      '第二步：率先研发并公开三层防篡改安全包装工业标准',
      '第三步：全面重构消费者信任协议，以诚挚透明重夺市场第一',
    ],
    historicalSigilName: '【孤峰的守望者】',
    historicalAlphaRate: 0.8890,
    isUnlocked: false,
    unlockCostEquity: 80,
  },
];

export const DeepArchivesModal: React.FC<DeepArchivesModalProps> = ({
  battleId,
  isOpen,
  onClose,
  userEquity,
  onSpendEquity,
}) => {
  const [archives, setArchives] = useState<DeepArchiveItem[]>(HISTORICAL_ARCHIVES);
  const [selectedArchive, setSelectedArchive] = useState<DeepArchiveItem>(HISTORICAL_ARCHIVES[0]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    void sessionApi.module(battleId, 'deep-archives').then(({ state }) => {
      const unlocked = (state as { unlockedIds?: unknown } | null)?.unlockedIds;
      if (cancelled || !Array.isArray(unlocked)) return;
      const ids = new Set(unlocked.filter((value): value is string => typeof value === 'string'));
      setArchives(HISTORICAL_ARCHIVES.map((archive) => ({ ...archive, isUnlocked: archive.isUnlocked || ids.has(archive.id) })));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [battleId]);

  if (!isOpen) return null;

  const handleUnlock = async (archive: DeepArchiveItem) => {
    setUsageError(null);
    if (battleId) {
      try {
        await sessionApi.consumeUsage(battleId, 'deep_archive_unlock', `deep-archive:${battleId}:${archive.id}`);
      } catch (error) {
        setUsageError(error instanceof Error ? error.message : '平台权益校验失败，请重试。');
        return;
      }
    } else if (!onSpendEquity(archive.unlockCostEquity, `解锁深网历史档案：${archive.historicEventTitle}`)) return;

    soundManager.playBlip(600, 0.1);
    setIsRestoring(true);

    setTimeout(() => {
      setIsRestoring(false);
      setArchives(prev =>
        prev.map(a => (a.id === archive.id ? { ...a, isUnlocked: true } : a))
      );
      setSelectedArchive(prev => ({ ...prev, isUnlocked: true }));
      if (battleId) void sessionApi.saveModule(battleId, 'deep-archives', { unlockedIds: archives.filter((item) => item.isUnlocked || item.id === archive.id).map((item) => item.id) }).catch(() => undefined);
      soundManager.playStrategyLocked();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#00F0FF', '#3A7DFF', '#FFFFFF'],
      });
    }, 1200);
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
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono-code font-bold text-xs shadow-lg shadow-purple-950 cursor-pointer"
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
