/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { 
  Coins, 
  Star, 
  Download, 
  Check, 
} from 'lucide-react';
import { SkillMarketplaceItem } from '../../types';
import { INITIAL_MARKETPLACE_ITEMS } from '../../data/presets';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';

interface SkillMarketplaceViewProps {
  battleId?: string;
  onLoadTemplate?: (templateId: string) => void;
  userEquity?: number;
  onRequestPurchase?: (item: SkillMarketplaceItem) => void;
}

export const SkillMarketplaceView: React.FC<SkillMarketplaceViewProps> = ({
  battleId,
  onLoadTemplate,
  userEquity,
  onRequestPurchase,
}) => {
  const [items] = useState<SkillMarketplaceItem[]>(INITIAL_MARKETPLACE_ITEMS);
  // Ownership is authoritative in the platform entitlement/module response.
  // Catalog `isOwned` flags are demo metadata and must never unlock a user's account.
  const [ownedTemplateIds, setOwnedTemplateIds] = useState<string[]>([]);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const equityBalance = userEquity ?? 0;
  const [filterType, setFilterType] = useState<'ALL' | 'TEMPLATE' | 'AI_KNOWLEDGE_PACK'>('ALL');
  const [activeTab, setActiveTab] = useState<'MARKET' | 'WALLET'>('MARKET');

  React.useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    void sessionApi.module(battleId, 'marketplace').then(({ state }) => {
      const envelope = state as { state?: unknown } | null;
      const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { ownedTemplateIds?: unknown } | null;
      const ids = saved?.ownedTemplateIds;
      if (!cancelled && Array.isArray(ids)) setOwnedTemplateIds(ids.filter((value): value is string => typeof value === 'string'));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [battleId]);

  const handlePurchase = (item: SkillMarketplaceItem) => {
    if (ownedTemplateIds.includes(item.id)) {
      if (onLoadTemplate) onLoadTemplate(item.id);
      return;
    }

    if (!onRequestPurchase) return;
    if (!battleId) { onRequestPurchase(item); return; }
    setActivatingId(item.id);
    setActivationError(null);
    void sessionApi.activateTemplate(battleId, item.id).then(({ ownedTemplateIds: ids }) => {
      setOwnedTemplateIds(ids);
      if (onLoadTemplate) onLoadTemplate(item.id);
    }).catch((error) => {
      setActivationError(error instanceof Error ? error.message : '模板尚未解锁，请先完成平台购买。');
      onRequestPurchase(item);
    }).finally(() => setActivatingId(null));
  };

  const filteredItems = items.filter(item => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Marketplace & Equity Token Economy */}
      <div className="surface-obsidian rounded-2xl p-5 sm:p-6 border border-white/[0.08] shadow-2xl relative overflow-hidden hud-corner">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-serif-sc">
                <span>战局模板与专家AI技能市场 (Skill Module & Equity Hub)</span>
                <span className="text-[11px] font-mono-code bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  MARKETPLACE
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              这里是决策生态的智慧流通市场。沉淀的经验不再躺在档案中，而是可以转化为流动的【推演权益】。你可以加载行业专家构建的绝境战局模板，或引入严苛的专业AI红队知识包。
            </p>
          </div>

          {/* Equity Wallet Pill & Tab Switcher */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-xs font-mono-code flex items-center gap-2 shadow-lg">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">可用推演权益:</span>
              <span className="text-amber-400 font-bold text-base">{equityBalance} 点</span>
            </div>

            <button
              onClick={() => {
                setActiveTab(activeTab === 'MARKET' ? 'WALLET' : 'MARKET');
                soundManager.playBlip(700, 0.04);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.1] text-slate-300 hover:text-white text-xs font-mono-code cursor-pointer transition-all"
            >
              {activeTab === 'MARKET' ? '查看权益收支' : '返回技能市场'}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {activeTab === 'MARKET' && (
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.06] text-xs font-mono-code">
            <span className="text-slate-400 mr-2">分类筛选:</span>
            {[
              { key: 'ALL', label: '全部模块' },
              { key: 'TEMPLATE', label: '战局实战模板' },
              { key: 'AI_KNOWLEDGE_PACK', label: 'AI 红队知识包' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => {
                  setFilterType(f.key as any);
                  soundManager.playBlip(600, 0.03);
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer border ${
                  filterType === f.key
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-bold'
                    : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main View: Market Grid */}
      {activeTab === 'MARKET' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isAI = item.type === 'AI_KNOWLEDGE_PACK';

            return (
              <div
                key={item.id}
                className={`card-tactical rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between shadow-2xl relative overflow-hidden group ${
                  ownedTemplateIds.includes(item.id)
                    ? 'border-emerald-500/60 bg-emerald-950/20 hud-corner'
                    : isAI
                    ? 'border-purple-500/40 bg-purple-950/20'
                    : 'border-white/[0.08] hover:border-white/[0.2]'
                }`}
              >
                <div className="card-tactical-holo absolute inset-0 pointer-events-none opacity-30"></div>

                <div>
                  {/* Top Category & Stats */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-[10px] font-mono-code">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                      isAI
                        ? 'bg-purple-950 text-purple-300 border-purple-700'
                        : 'bg-blue-950 text-blue-300 border-blue-700'
                    }`}>
                      {isAI ? '● AI 知识包' : '● 实战模板'}
                    </span>

                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {item.rating}
                      </span>
                      <span>|</span>
                      <span>{item.downloads} 激活</span>
                    </div>
                  </div>

                  {/* Title & Author */}
                  <h3 className="text-xs font-bold text-white mb-1.5 leading-snug">{item.title}</h3>
                  <div className="text-[11px] text-slate-400 font-mono-code mb-3">
                    由 <strong className="text-slate-200">{item.author}</strong> ({item.authorTitle}) 制作
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{item.description}</p>

                  {/* Included features pill */}
                  <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] space-y-1.5 mb-4 text-xs font-mono-code">
                    <span className="text-slate-400 text-[10px] block font-bold">模块包含关键能力：</span>
                    {item.includes.map((inc, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.map((t, i) => (
                      <span key={i} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono-code">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Purchase or Load Button */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono-code text-xs">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-white font-bold text-sm">
                      {ownedTemplateIds.includes(item.id) ? '已解锁' : `${item.price} · 验证平台权益`}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={activatingId === item.id}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-mono-code flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      ownedTemplateIds.includes(item.id)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black'
                    }`}
                  >
                    {ownedTemplateIds.includes(item.id) ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>载入当前战局</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>消耗权益解锁</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Wallet View: Token Economy Transactions */
        <div className="surface-obsidian rounded-2xl p-6 border border-white/[0.08] shadow-2xl space-y-5 hud-corner">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono-code">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>推演权益明细流水账本 (Equity Token Ledger)</span>
            </h3>
            <span className="text-xs text-amber-400 font-mono-code font-bold">
              当前总权益: {equityBalance} 点
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-black/60 border border-white/[0.06] text-xs text-slate-300 leading-relaxed">
              平台权益流水由统一账户与支付平台维护，qmdj 不复制或缓存一份本地账本。当前页面只展示实时可用权益；完成平台购买或权益变更后，请刷新以重新读取账户状态。
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/50 text-xs text-blue-200 leading-relaxed font-mono-code">
            <strong className="text-blue-300 block mb-1 font-bold">💡 权益通证经济规则：</strong>
            1. 在「推演案例库」中完成绝境案例推演，每次可获得 +6~8 权益点。<br />
            2. 在「决策委员会」为他人提供参谋策略并被采纳，可获 +5 权益点。<br />
            3. 权益可用于解锁专家模板、加载危机AI模型，或在紧急时刻激活破局战情室。
          </div>
        </div>
      )}
      {activationError && <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-xs text-amber-200">{activationError}</div>}

    </div>
  );
};
