/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SubscriptionTier } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { createAccountCheckout, createGuestCheckout, createGuestPaymentAttempt, listPlatformPlans } from '../../../lib/platform/browser';
import { loadPlatformSession } from '../../../lib/platform/session';
import { requirePlatformClientConfig } from '../../../lib/platform/config';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sparkles, 
  CreditCard, 
  CheckCircle2, 
  Flame, 
  Crown, 
  Zap, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';

interface EquityStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEquity: number;
  onAddEquity: (amount: number, reason: string) => void;
}

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'MONTHLY',
    name: '【初级执棋官 · 月度订阅】',
    price: '¥ 98',
    period: '/ 月',
    equityPerMonth: 800,
    features: [
      '每月补充 800 推演权益点',
      '解锁世界脉搏奇点事件介入权限',
      '支持生成 48h 加密协同因果链接',
      '标准 AI 顾问（分析师/历史学家）响应',
    ],
  },
  {
    id: 'ANNUAL',
    name: '【高维战略家 · 年度通行证】',
    price: '¥ 880',
    period: '/ 年',
    equityPerMonth: 1200,
    features: [
      '每月自动补充 1,200 权益点（全年14,400点）',
      '无限次开启深网档案历史案例解密',
      '自定义终端主题与高维金圣几何烙印外框',
      '优先接入先锋刺客 & 哲人领袖红队模型',
    ],
    badge: '最受欢迎',
    isPopular: true,
  },
];

const EQUITY_PACKS = [
  { id: 'p1', points: 200, price: '¥ 28', label: '试局应急包' },
  { id: 'p2', points: 600, price: '¥ 68', label: '非对称突刺包', bonus: '+50点赠送' },
  { id: 'p3', points: 2000, price: '¥ 198', label: '奇点破壁大师包', bonus: '+300点赠送' },
];

export const EquityStoreModal: React.FC<EquityStoreModalProps> = ({
  isOpen,
  onClose,
  userEquity,
}) => {
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchasePack = (pack: typeof EQUITY_PACKS[0]) => {
    setIsProcessing(true);
    soundManager.playBlip(700, 0.05);
    void beginCheckout(`shengtian-banzi-equity-${pack.id}`);
  };

  const handleSubscribe = (tier: SubscriptionTier) => {
    setIsProcessing(true);
    soundManager.playBlip(800, 0.05);

    void beginCheckout(tier.id === 'ANNUAL' ? 'shengtian-banzi-annual' : 'shengtian-banzi-monthly');
  };

  const beginCheckout = async (planHint: string) => {
    try {
      const config = requirePlatformClientConfig();
      const catalog = await listPlatformPlans(config.productCode);
      const plan = catalog.items.find((item) => item.plan_code === planHint) ?? catalog.items.find((item) => item.plan_code.includes('shengtian-banzi'));
      if (!plan) throw new Error('平台暂未发布可购买的胜天半子套餐。');
      const channel = catalog.channels.find((item) => item.ready)?.channel;
      if (!channel) throw new Error('当前没有可用支付方式。');
      const returnUrl = `${window.location.origin}/billing/result?product_code=${encodeURIComponent(config.productCode)}`;
      const session = loadPlatformSession();
      const checkout = session?.access_token
        ? await createAccountCheckout(session.access_token, plan.plan_code, channel, returnUrl, { csrfToken: session.csrf_token })
        : await (async () => { const guest = await createGuestCheckout(plan.plan_code, channel); const payment = await createGuestPaymentAttempt(guest, channel, returnUrl); return { providerCheckoutUrl: payment.provider_checkout_url }; })();
      if (!checkout.providerCheckoutUrl) throw new Error('平台没有返回收银台地址。');
      window.location.assign(checkout.providerCheckoutUrl);
    } catch (error) {
      setIsProcessing(false); setSuccessToast(error instanceof Error ? error.message : '支付初始化失败，请重试。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans overflow-y-auto">
      <div className="max-w-3xl w-full surface-obsidian-war border border-white/[0.15] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-600/80 flex items-center justify-center text-amber-400 shadow-md">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>推演权益商店 · DEDUCTION EQUITY STORE</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  TOKEN LEDGER
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                获取算力与因果干涉筹码 · 充值与订阅中心
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

        {/* Current Balance & Toast */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono-code text-slate-400 block">当前账户权益点余额</span>
            <div className="text-2xl font-mono-code font-black text-amber-400 mt-0.5">
              {userEquity} <span className="text-xs font-normal text-slate-400">点</span>
            </div>
          </div>

          {successToast && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-mono-code animate-fadeIn">
              {successToast}
            </div>
          )}
        </div>

        {/* 1. Subscription Passes */}
        <div className="space-y-3">
          <div className="text-xs font-mono-code font-bold text-slate-300 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>执棋官订阅通行证 (月度 / 年度)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                  tier.isPopular
                    ? 'bg-gradient-to-b from-amber-950/40 to-black/60 border-amber-500/80 shadow-xl shadow-amber-950/30'
                    : 'bg-black/40 border-white/[0.08]'
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                    {tier.badge}
                  </span>
                )}

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">{tier.name}</h4>
                    <div className="text-xl font-mono-code font-black text-amber-400 mt-1">
                      {tier.price} <span className="text-xs font-normal text-slate-400">{tier.period}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-white/[0.05]">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleSubscribe(tier)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono-code font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950 cursor-pointer"
                  >
                    <span>开通订阅权限</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. On-demand Equity Packs */}
        <div className="space-y-3">
          <div className="text-xs font-mono-code font-bold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>按需单次充值包</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EQUITY_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-blue-500/60 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{pack.label}</span>
                    {pack.bonus && (
                      <span className="text-[9px] font-mono-code px-1 py-0.5 rounded bg-red-950 text-red-300">
                        {pack.bonus}
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-mono-code font-bold text-blue-300">
                    +{pack.points} <span className="text-xs text-slate-400 font-normal">点</span>
                  </div>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={() => handlePurchasePack(pack)}
                  className="mt-3 w-full py-2 rounded-xl bg-white/[0.05] hover:bg-blue-600 hover:text-white text-xs font-mono-code text-slate-200 border border-white/[0.08] transition-all cursor-pointer"
                >
                  {pack.price} 立即获取
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
