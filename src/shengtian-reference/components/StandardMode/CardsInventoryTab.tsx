import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Clock, 
  Award, 
  Info, 
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Gauge,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Target,
  Zap,
  Filter,
  CheckCircle2,
  Lock,
  Flame
} from 'lucide-react';
import { 
  BattlefieldState, 
  CardAsset, 
  AssetCategory, 
  EpistemicTag, 
  EPISTEMIC_TAG_CONFIG 
} from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface CardsInventoryTabProps {
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onNavigateToSimulation: () => void;
}

export const CardsInventoryTab: React.FC<CardsInventoryTabProps> = ({
  battlefield,
  onUpdateBattlefield,
  onNavigateToSimulation,
}) => {
  const [activeCategoryModal, setActiveCategoryModal] = useState<AssetCategory | null>(null);
  const [editingCard, setEditingCard] = useState<CardAsset | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({
    'asset-chips-1': true, // default expand the primary linchpin card for instant rich look
  });
  const [activeTagFilter, setActiveTagFilter] = useState<'ALL' | 'FACTS' | 'RISKS_HYPO'>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Card Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTag, setFormTag] = useState<EpistemicTag>('FACT');
  const [formConfidence, setFormConfidence] = useState(80);
  const [formNumericValue, setFormNumericValue] = useState<number | undefined>(undefined);
  const [formUnit, setFormUnit] = useState('');

  // Financial Quick Form
  const [cashInput, setCashInput] = useState(battlefield.financials.availableCash);
  const [burnInput, setBurnInput] = useState(battlefield.financials.monthlyBurn);
  const [otherIncomeInput, setOtherIncomeInput] = useState(battlefield.financials.monthlyIncomeWithoutClient);

  // Recalculate Runway
  const handleUpdateFinancials = (cash: number, burn: number, otherIncome: number) => {
    const netBurn = Math.max(1, burn - otherIncome);
    const calculatedDays = Math.round((cash / netBurn) * 30);
    const alertLevel = calculatedDays <= 30 ? 'CRITICAL' : calculatedDays <= 60 ? 'WARNING' : 'SAFE';

    onUpdateBattlefield(prev => ({
      ...prev,
      financials: {
        availableCash: cash,
        monthlyBurn: burn,
        monthlyIncomeWithoutClient: otherIncome,
        calculatedDays,
        alertLevel,
      },
      assets: prev.assets.map(a => {
        if (a.id === 'asset-fin-1') return { ...a, numericValue: cash };
        if (a.id === 'asset-fin-2') return { ...a, numericValue: burn };
        if (a.id === 'asset-fin-3') return { ...a, numericValue: otherIncome };
        return a;
      }),
    }));
    soundManager.playBlip(700, 0.04);
  };

  const handleGenerateCards = async () => {
    if (!battlefield.id || isGenerating) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/battles/${battlefield.id}/cards/generate`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json','Idempotency-Key':`cards-${battlefield.id}-${Math.floor(Date.now()/60000)}`}, body:JSON.stringify({ idempotencyKey:`cards-${battlefield.id}-${Math.floor(Date.now()/60000)}`, question:'请根据当前战局生成可核验的现实底牌，返回 cards 数组，每项包含 category、title、description、numericValue、unit。' }) });
      if (!response.ok) throw new Error('卡牌生成失败');
      const inventoryResponse = await fetch(`/api/battles/${battlefield.id}/inventory`, { credentials:'include' });
      const payload = await inventoryResponse.json() as { inventory?: Array<Record<string, unknown>> };
      if (Array.isArray(payload.inventory)) {
        const categoryMap: Record<string, CardAsset['category']> = { cash:'FINANCIAL', time:'TIME', information:'INFO', skill:'CHIPS', asset:'CHIPS', relationship:'CHIPS', credential:'CHIPS', channel:'CHIPS', other:'CHIPS' };
        onUpdateBattlefield((previous) => ({ ...previous, assets:payload.inventory!.map((item) => ({ id:String(item.id), category:categoryMap[String(item.category)] ?? 'CHIPS', title:String(item.label ?? ''), description:String(item.description ?? ''), tag:'FACT', confidence:80, numericValue:typeof item.quantity === 'number' ? item.quantity : undefined, unit:typeof item.unit === 'string' ? item.unit : undefined, createdAt:String(item.createdAt ?? new Date().toISOString()) })) }));
      }
    } finally { setIsGenerating(false); }
  };

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
    soundManager.playBlip(550, 0.02);
  };

  const openAddModal = (cat: AssetCategory) => {
    setActiveCategoryModal(cat);
    setEditingCard(null);
    setFormTitle('');
    setFormDesc('');
    setFormTag(cat === 'FINANCIAL' ? 'FACT' : cat === 'INFO' ? 'THIRD_PARTY' : 'OPPORTUNITY');
    setFormConfidence(80);
    setFormNumericValue(undefined);
    setFormUnit('');
    soundManager.playBlip(600, 0.03);
  };

  const openEditModal = (card: CardAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCard(card);
    setActiveCategoryModal(card.category);
    setFormTitle(card.title);
    setFormDesc(card.description);
    setFormTag(card.tag);
    setFormConfidence(card.confidence);
    setFormNumericValue(card.numericValue);
    setFormUnit(card.unit || '');
    soundManager.playBlip(600, 0.03);
  };

  const handleSaveCard = () => {
    if (!formTitle.trim() || !activeCategoryModal) return;

    if (editingCard) {
      onUpdateBattlefield(prev => ({
        ...prev,
        assets: prev.assets.map(a => a.id === editingCard.id ? {
          ...a,
          title: formTitle,
          description: formDesc,
          tag: formTag,
          confidence: formConfidence,
          numericValue: formNumericValue,
          unit: formUnit,
        } : a),
      }));
    } else {
      const newCard: CardAsset = {
        id: `card-${Date.now()}`,
        category: activeCategoryModal,
        title: formTitle,
        description: formDesc,
        tag: formTag,
        confidence: formConfidence,
        numericValue: formNumericValue,
        unit: formUnit,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onUpdateBattlefield(prev => ({
        ...prev,
        assets: [...prev.assets, newCard],
      }));
      setExpandedCardIds(prev => ({ ...prev, [newCard.id]: true }));
    }

    setActiveCategoryModal(null);
    setEditingCard(null);
    soundManager.playBlip(850, 0.05);
  };

  const handleDeleteCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateBattlefield(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a.id !== cardId),
    }));
    soundManager.playBlip(400, 0.04);
  };

  const handleQuickChangeTag = (cardId: string, newTag: EpistemicTag, e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onUpdateBattlefield(prev => ({
      ...prev,
      assets: prev.assets.map(a => a.id === cardId ? { ...a, tag: newTag } : a),
    }));
    soundManager.playBlip(750, 0.03);
  };

  const handleAdjustConfidence = (cardId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateBattlefield(prev => ({
      ...prev,
      assets: prev.assets.map(a => {
        if (a.id === cardId) {
          const next = Math.max(5, Math.min(100, a.confidence + delta));
          return { ...a, confidence: next };
        }
        return a;
      }),
    }));
    soundManager.playBlip(delta > 0 ? 800 : 500, 0.02);
  };

  // Facts vs Assumptions Stats
  const totalAssets = battlefield.assets.length;
  const factCount = battlefield.assets.filter(a => a.tag === 'FACT').length;
  const factPurity = totalAssets > 0 ? Math.round((factCount / totalAssets) * 100) : 0;
  const highRiskCount = battlefield.assets.filter(a => a.tag === 'HYPOTHESIS' || a.tag === 'RISK').length;

  const categories: { 
    key: AssetCategory; 
    code: string;
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    desc: string;
    accentBorder: string;
    accentGlow: string;
    badgeBg: string;
  }[] = [
    { 
      key: 'FINANCIAL', 
      code: 'FIN', 
      label: '财务现状', 
      icon: DollarSign, 
      desc: '可用现金储备、固定燃烧率与无依赖现金流',
      accentBorder: 'border-amber-500/40',
      accentGlow: 'hover:shadow-amber-950/40',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-700/60'
    },
    { 
      key: 'TIME', 
      code: 'TIME', 
      label: '时间资源', 
      icon: Clock, 
      desc: '采购审批周期、法务窗口期与交付倒计时死线',
      accentBorder: 'border-blue-500/40',
      accentGlow: 'hover:shadow-blue-950/40',
      badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-700/60'
    },
    { 
      key: 'CHIPS', 
      code: 'CHIP', 
      label: '核心筹码', 
      icon: Award, 
      desc: '关键决策人脉、定制壁垒、切换成本与谈判底线',
      accentBorder: 'border-purple-500/40',
      accentGlow: 'hover:shadow-purple-950/40',
      badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-700/60'
    },
    { 
      key: 'INFO', 
      code: 'INTEL', 
      label: '关键情报', 
      icon: Info, 
      desc: '对手真实报价、客户内部权力政治与外部变量',
      accentBorder: 'border-emerald-500/40',
      accentGlow: 'hover:shadow-emerald-950/40',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
    },
  ];

  const getFilteredAssets = (catKey: AssetCategory) => {
    return battlefield.assets.filter(a => {
      if (a.category !== catKey) return false;
      if (activeTagFilter === 'FACTS') return a.tag === 'FACT';
      if (activeTagFilter === 'RISKS_HYPO') return a.tag === 'HYPOTHESIS' || a.tag === 'RISK' || a.tag === 'USER_CLAIM';
      return true;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Financial Runway Live Meter & Epistemic Audit */}
      <div className="surface-obsidian rounded-2xl p-5 shadow-2xl border border-white/[0.08] hud-corner">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div><span className="text-xs font-bold text-white">现实底牌盘点</span><p className="mt-1 text-[11px] text-slate-500">AI 只生成待核验候选，保存后仍需你确认事实属性。</p></div>
          <button type="button" onClick={() => void handleGenerateCards()} disabled={isGenerating} className="rounded-xl border border-cyan-600/60 bg-cyan-950/50 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-50">{isGenerating ? '正在生成…' : 'AI 生成底牌候选'}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left 4 Cols: Cash Runway Meter */}
          <div className="lg:col-span-4 space-y-2.5 border-b lg:border-b-0 lg:border-r border-white/[0.06] pb-4 lg:pb-0 lg:pr-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>生命线极限指标</span>
              </span>
              <span className={`text-[10px] font-mono-code px-2.5 py-0.5 rounded-full border uppercase font-bold tracking-wider ${
                battlefield.financials.alertLevel === 'CRITICAL' 
                  ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                  : battlefield.financials.alertLevel === 'WARNING'
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700'
              }`}>
                {battlefield.financials.alertLevel === 'CRITICAL' ? '极度危险' : battlefield.financials.alertLevel === 'WARNING' ? '警戒预警' : '相对安全'}
              </span>
            </div>
            
            <div className="flex items-baseline gap-3">
              <span className="text-xs text-slate-400 font-medium font-mono-code">硬性生存跑道:</span>
              <span className={`text-3xl font-black font-mono-code tracking-tight ${
                battlefield.financials.calculatedDays <= 30
                  ? 'text-red-400'
                  : battlefield.financials.calculatedDays <= 60
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {battlefield.financials.calculatedDays} <span className="text-sm font-sans font-normal text-slate-400">天</span>
              </span>
            </div>

            {/* Visual Runway Progress Bar */}
            <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/[0.06]">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  battlefield.financials.calculatedDays <= 30
                    ? 'bg-red-500'
                    : battlefield.financials.calculatedDays <= 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (battlefield.financials.calculatedDays / 120) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono-code">
              <span>0天(断崖)</span>
              <span>30天(警戒)</span>
              <span>60天</span>
              <span>120天+</span>
            </div>
          </div>

          {/* Right 8 Cols: Quick Adjusters & Reality Audit Bar */}
          <div className="lg:col-span-8 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="digit-display p-3.5 rounded-xl">
                <label className="text-slate-400 block mb-1 font-medium font-mono-code text-[11px]">可用现金储备 (¥)</label>
                <input
                  type="number"
                  value={cashInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCashInput(val);
                    handleUpdateFinancials(val, burnInput, otherIncomeInput);
                  }}
                  className="w-full bg-black/80 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-sm font-mono-code font-bold text-amber-300 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div className="digit-display-red p-3.5 rounded-xl">
                <label className="text-slate-400 block mb-1 font-medium font-mono-code text-[11px]">月固定支出 (¥/月)</label>
                <input
                  type="number"
                  value={burnInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBurnInput(val);
                    handleUpdateFinancials(cashInput, val, otherIncomeInput);
                  }}
                  className="w-full bg-black/80 border border-red-500/40 rounded-lg px-2.5 py-1.5 text-sm font-mono-code font-bold text-red-300 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>

              <div className="digit-display-emerald p-3.5 rounded-xl">
                <label className="text-slate-400 block mb-1 font-medium font-mono-code text-[11px]">长尾独立收入 (¥/月)</label>
                <input
                  type="number"
                  value={otherIncomeInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOtherIncomeInput(val);
                    handleUpdateFinancials(cashInput, burnInput, val);
                  }}
                  className="w-full bg-black/80 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-sm font-mono-code font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            {/* Epistemic Health Bar & Filter Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-4 text-[11px] font-mono-code">
                <span className="text-slate-400">
                  底牌总数: <strong className="text-white font-bold">{totalAssets}</strong>
                </span>
                <span className="text-slate-400">
                  硬性事实纯度: <strong className="text-emerald-400 font-bold">{factPurity}%</strong> ({factCount}项)
                </span>
                <span className="text-slate-400">
                  高危假设/风险: <strong className="text-amber-400 font-bold">{highRiskCount}</strong> 项
                </span>
              </div>

              {/* Tag Quick Filter Buttons */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => { setActiveTagFilter('ALL'); soundManager.playBlip(600, 0.02); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-code font-bold transition-colors cursor-pointer ${
                    activeTagFilter === 'ALL' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  全部 ({totalAssets})
                </button>
                <button
                  onClick={() => { setActiveTagFilter('FACTS'); soundManager.playBlip(600, 0.02); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-code font-bold transition-colors cursor-pointer ${
                    activeTagFilter === 'FACTS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  已证实事实 ({factCount})
                </button>
                <button
                  onClick={() => { setActiveTagFilter('RISKS_HYPO'); soundManager.playBlip(600, 0.02); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-code font-bold transition-colors cursor-pointer ${
                    activeTagFilter === 'RISKS_HYPO' ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  待验证/高危 ({highRiskCount})
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4 Category Inventory Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const categoryAssets = getFilteredAssets(cat.key);
          const Icon = cat.icon;
          const catTotal = battlefield.assets.filter(a => a.category === cat.key).length;

          return (
            <div 
              key={cat.key}
              className="surface-obsidian rounded-2xl p-5 shadow-2xl flex flex-col min-h-[380px] border border-white/[0.08] relative overflow-hidden hud-corner"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-white/[0.12] flex items-center justify-center text-amber-400 shadow-md">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{cat.label}</h3>
                      <span className={`text-[10px] font-mono-code px-2 py-0.2 rounded font-bold border ${cat.badgeBg}`}>
                        {cat.code} · {catTotal} 项
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cat.desc}</p>
                  </div>
                </div>

                <button
                  onClick={() => openAddModal(cat.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs border border-white/[0.1] hover:border-amber-500/50 transition-all font-medium cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>添加底牌</span>
                </button>
              </div>

              {/* Cards List in this category */}
              <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
                {categoryAssets.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                    <p className="text-slate-400 font-medium">当前筛选条件下暂无此分类底牌</p>
                    <button 
                      onClick={() => openAddModal(cat.key)}
                      className="mt-2.5 text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>点击添加第一张战术卡片</span>
                    </button>
                  </div>
                ) : (
                  categoryAssets.map((asset, index) => {
                    const tagMeta = EPISTEMIC_TAG_CONFIG[asset.tag];
                    const isExpanded = !!expandedCardIds[asset.id];
                    const cardCode = `${cat.code}-${String(index + 1).padStart(2, '0')}`;
                    const isFact = asset.tag === 'FACT';
                    const isVPAsset = asset.id === 'asset-chips-1';

                    return (
                      <div
                        key={asset.id}
                        onClick={() => toggleExpandCard(asset.id)}
                        className={`card-tactical rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                          isFact
                            ? 'border-emerald-500/30 hover:border-emerald-400/60 shadow-emerald-950/20'
                            : asset.tag === 'RISK'
                            ? 'border-red-500/40 hover:border-red-400/70 shadow-red-950/30'
                            : asset.tag === 'HYPOTHESIS'
                            ? 'border-amber-500/40 hover:border-amber-400/70 shadow-amber-950/30'
                            : 'border-white/[0.09] hover:border-white/[0.22]'
                        }`}
                      >
                        {/* Hologram sweep shine overlay */}
                        <div className="card-tactical-holo absolute inset-0 pointer-events-none opacity-40"></div>

                        {/* Top Micro Header Bar */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05] bg-black/40 text-[10px] font-mono-code">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold tracking-wider">
                              [{cardCode}]
                            </span>
                            <span className="text-slate-500">|</span>
                            <span className={`px-2 py-0.2 rounded-full font-bold border ${tagMeta.bgColor} ${tagMeta.borderColor} ${tagMeta.textColor}`}>
                              {tagMeta.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Confidence Gauge Pill */}
                            <div className="flex items-center gap-1 text-slate-400">
                              <span>置信度:</span>
                              <span className={`font-bold font-mono-code ${
                                asset.confidence >= 80 ? 'text-emerald-400' :
                                asset.confidence >= 50 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {asset.confidence}%
                              </span>
                            </div>

                            {/* Chevron Toggle */}
                            <div className="text-slate-400 group-hover:text-white transition-colors">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </div>

                        {/* Card Main Body */}
                        <div className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-white tracking-wide">
                                  {asset.title}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                                {asset.description}
                              </p>
                            </div>

                            {/* Digital LED Numeric Impact Badge */}
                            {asset.numericValue !== undefined && (
                              <div className="shrink-0 digit-display px-3 py-1.5 rounded-xl text-right">
                                <span className="text-[9px] text-amber-500 font-mono-code block uppercase tracking-wider">
                                  量化指标
                                </span>
                                <span className="text-sm font-black font-mono-code text-amber-300">
                                  {asset.unit ? `${asset.unit}${asset.numericValue.toLocaleString()}` : asset.numericValue}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Confidence Level Energy Bar */}
                          <div className="w-full bg-black/70 rounded-full h-1.5 overflow-hidden border border-white/[0.04] mt-1">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                asset.confidence >= 80 ? 'bg-emerald-500' :
                                asset.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${asset.confidence}%` }}
                            />
                          </div>
                        </div>

                        {/* Expandable Tactical Drawer (AI Penetration Audit & Controls) */}
                        {isExpanded && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="px-4 pb-4 pt-3 border-t border-white/[0.06] bg-black/60 space-y-3 animate-in fade-in duration-200"
                          >
                            {/* AI Penetration Assessment Box */}
                            <div className="bg-slate-950/90 rounded-xl p-3 border border-white/[0.06] space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-amber-400 font-bold flex items-center gap-1.5 font-mono-code">
                                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                                  <span>AI 战术穿透审查 (Tactical Audit)</span>
                                </span>
                                <span className="text-[10px] font-mono-code text-slate-400">
                                  抗压权重: <strong className="text-white">{isFact ? '1.0x (硬核事实)' : '0.6x (主观折损)'}</strong>
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {isVPAsset ? (
                                  <span className="text-red-300">
                                    ⚠️ <strong>高危穿透：</strong>该资源依赖单一校友私交。在企业合规采购审计压力下，对方无法承担越级担保责任，在破局模式中已被自动隔离。
                                  </span>
                                ) : isFact ? (
                                  <span className="text-emerald-300">
                                    ✓ <strong>事实已锚定：</strong>该资产具有客观银行流水/签约存根支撑，可作为后续一切策略推演的坚固基石。
                                  </span>
                                ) : (
                                  <span className="text-slate-300">
                                    ℹ️ <strong>验证建议：</strong>当前被标记为待验证变量。在进入执行前建议通过第三方背调或排他信号进行二次事实锁定。
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Interactive Micro Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                              {/* Quick Confidence Tweak */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono-code text-[10px]">微调置信:</span>
                                <button
                                  onClick={(e) => handleAdjustConfidence(asset.id, -5, e)}
                                  className="w-6 h-6 rounded bg-black/70 hover:bg-red-950 text-slate-300 hover:text-red-300 border border-white/[0.08] hover:border-red-700 flex items-center justify-center font-mono-code font-bold cursor-pointer"
                                  title="降低5%置信度"
                                >
                                  -
                                </button>
                                <span className="font-mono-code font-bold text-white px-1 text-xs">
                                  {asset.confidence}%
                                </span>
                                <button
                                  onClick={(e) => handleAdjustConfidence(asset.id, 5, e)}
                                  className="w-6 h-6 rounded bg-black/70 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-700 flex items-center justify-center font-mono-code font-bold cursor-pointer"
                                  title="增加5%置信度"
                                >
                                  +
                                </button>
                              </div>

                              {/* Epistemic Tag Selector */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono-code text-[10px]">认知属性:</span>
                                <select
                                  value={asset.tag}
                                  onChange={(e) => handleQuickChangeTag(asset.id, e.target.value as EpistemicTag, e)}
                                  className={`text-[10px] font-semibold rounded-lg px-2.5 py-1 border cursor-pointer ${tagMeta.bgColor} ${tagMeta.borderColor} ${tagMeta.textColor} focus:outline-none`}
                                >
                                  <option value="FACT">已证实事实 (100%权重)</option>
                                  <option value="USER_CLAIM">用户陈述 (主观感知)</option>
                                  <option value="THIRD_PARTY">第三方信息 (传闻情报)</option>
                                  <option value="HYPOTHESIS">假设 (待验证高危)</option>
                                  <option value="RISK">风险 (明确威胁)</option>
                                  <option value="OPPORTUNITY">机会 (潜在利好)</option>
                                </select>
                              </div>

                              {/* Edit & Delete Action Buttons */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => openEditModal(asset, e)}
                                  className="px-2.5 py-1 text-slate-300 hover:text-white rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>编辑</span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteCard(asset.id, e)}
                                  className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/60 border border-transparent hover:border-red-800/60 cursor-pointer transition-colors"
                                  title="删除底牌"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation to Timeline Simulation */}
      <div className="flex items-center justify-between p-5 surface-obsidian border border-white/[0.08] rounded-2xl shadow-2xl hud-corner">
        <div className="text-xs text-slate-400 space-y-0.5">
          <div className="text-white font-bold">底牌库盘点就绪</div>
          <div>已盘点 <strong className="text-amber-400 font-mono-code font-bold">{battlefield.assets.length}</strong> 项现实底牌资产。确认无漏项后，即可排布进入多分支路径推演沙盘。</div>
        </div>
        <button
          onClick={onNavigateToSimulation}
          className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xl shadow-blue-950/50 cursor-pointer"
        >
          <span>进入路径推演沙盘</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add / Edit Card Modal */}
      {activeCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="surface-obsidian border border-white/[0.12] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 hud-corner">
            
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{editingCard ? '编辑底牌资产信息' : '添加战术底牌资产'}</span>
              </h3>
              <button
                onClick={() => setActiveCategoryModal(null)}
                className="text-slate-400 hover:text-white text-xs p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"
              >
                ✕ 关闭
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">底牌标题 / 核心关键信息</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="例如：大客户核心VP为校友关系 / 竞对启动0元试用抢客"
                  className="w-full bg-black/80 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">详细描述与背景证据</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="补充背景细节、客观依据或上下文支持..."
                  rows={3}
                  className="w-full bg-black/80 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">认知真实度标签</label>
                  <select
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value as EpistemicTag)}
                    className="w-full bg-black/80 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="FACT">已证实事实 (100%权重)</option>
                    <option value="USER_CLAIM">用户陈述 (主观感知)</option>
                    <option value="THIRD_PARTY">第三方信息 (传闻情报)</option>
                    <option value="HYPOTHESIS">假设 (待验证高危)</option>
                    <option value="RISK">风险 (明确威胁)</option>
                    <option value="OPPORTUNITY">机会 (潜在利好)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">
                    置信度: <span className="font-mono-code text-amber-400 font-bold">{formConfidence}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={formConfidence}
                    onChange={(e) => setFormConfidence(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">量化数值 (可选)</label>
                  <input
                    type="number"
                    value={formNumericValue === undefined ? '' : formNumericValue}
                    onChange={(e) => setFormNumericValue(e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="如：250000 / 67 / 3"
                    className="w-full bg-black/80 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono-code focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">单位前缀/后缀 (可选)</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="如：¥ / 天 / %"
                    className="w-full bg-black/80 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setActiveCategoryModal(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-medium cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveCard}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-950/50 cursor-pointer"
              >
                {editingCard ? '保存修改' : '存入底牌库'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
