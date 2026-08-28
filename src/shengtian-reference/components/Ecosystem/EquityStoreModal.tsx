/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import type { PlanCatalogItem } from '@singularity-sequence/web-sdk';
import { soundManager } from '../../utils/soundEffects';
import { createAccountCheckout, createGuestCheckout, createGuestPaymentAttempt, listPlatformPlans } from '../../../lib/platform/browser';
import { loadPlatformSession } from '../../../lib/platform/session';
import { requirePlatformClientConfig } from '../../../lib/platform/config';
import { saveStorefrontCheckout } from '../../../lib/platform/storefront-recovery';
import { 
  X, 
  CheckCircle2, 
  Crown, 
  Zap, 
  ArrowRight 
} from 'lucide-react';

interface EquityStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEquity: number;
  onAddEquity: (amount: number, reason: string) => void;
}

export const EquityStoreModal: React.FC<EquityStoreModalProps> = ({
  isOpen,
  onClose,
  userEquity,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [channels, setChannels] = useState<Array<{ channel: string; ready: boolean }>>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const startTimer = window.setTimeout(() => {
      if (cancelled) return;
      setCatalogLoading(true);
      setSuccessToast(null);
    }, 0);
    void (async () => {
      try {
        const catalog = await listPlatformPlans(requirePlatformClientConfig().productCode);
        if (cancelled) return;
        setPlans(catalog.items);
        setChannels(catalog.channels);
      } catch (error) {
        if (!cancelled) setSuccessToast(error instanceof Error ? error.message : '平台套餐读取失败，请重试。');
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => { cancelled = true; window.clearTimeout(startTimer); };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = (plan: PlanCatalogItem) => {
    setIsProcessing(true);
    soundManager.playBlip(800, 0.05);
    void beginCheckout(plan);
  };

  const beginCheckout = async (plan: PlanCatalogItem) => {
    try {
      const config = requirePlatformClientConfig();
      const channel = channels.find((item) => item.ready)?.channel;
      if (!channel) throw new Error('当前没有可用支付方式。');
      const returnUrl = (orderId: string) => `${window.location.origin}/billing/result?order_id=${encodeURIComponent(orderId)}&product_code=${encodeURIComponent(config.productCode)}`;
      const session = loadPlatformSession();
      let checkoutMode: 'account' | 'guest';
      let orderId: string;
      let checkoutToken = '';
      let providerCheckoutUrl: string;
      if (session?.access_token) {
        const checkout = await createAccountCheckout(session.access_token, plan.plan_code, channel, returnUrl, { csrfToken: session.csrf_token });
        checkoutMode = 'account';
        orderId = checkout.orderId;
        providerCheckoutUrl = checkout.providerCheckoutUrl;
      } else {
        const guest = await createGuestCheckout(plan.plan_code, channel);
        const payment = await createGuestPaymentAttempt(guest, channel, returnUrl(guest.order.order_id));
        checkoutMode = 'guest';
        orderId = guest.order.order_id;
        checkoutToken = guest.checkout_token;
        providerCheckoutUrl = payment.provider_checkout_url;
      }
      if (!providerCheckoutUrl) throw new Error('平台没有返回收银台地址。');
      saveStorefrontCheckout({
        orderId,
        productCode: config.productCode,
        checkoutMode,
        checkoutToken,
        planCode: plan.plan_code,
      });
      window.location.assign(providerCheckoutUrl);
    } catch (error) {
      setIsProcessing(false); setSuccessToast(error instanceof Error ? error.message : '支付初始化失败，请重试。');
    }
  };

  const periodLabel = (period: string) => ({ per_use: '按次', monthly: '每月', yearly: '每年', annual: '每年' }[period] ?? period);

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

        {/* Platform catalog: pricing and availability come from the platform. */}
        <div className="space-y-3">
          <div className="text-xs font-mono-code font-bold text-slate-300 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>平台套餐目录（价格与权益以服务端为准）</span>
          </div>
          {catalogLoading ? <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 text-sm text-slate-400">正在读取平台套餐…</div> : null}
          {!catalogLoading && plans.length === 0 ? <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5 text-sm text-amber-200">{successToast ?? '平台暂未发布可购买的胜天半子套餐。'}</div> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan, index) => (
              <div
                key={plan.plan_code}
                className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${index === 0 ? 'bg-gradient-to-b from-amber-950/40 to-black/60 border-amber-500/80 shadow-xl shadow-amber-950/30' : 'bg-black/40 border-white/[0.08]'}`}
              >
                {index === 0 && plans.length > 1 && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                    推荐套餐
                  </span>
                )}

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">{plan.title}</h4>
                    <div className="text-xl font-mono-code font-black text-amber-400 mt-1">
                      ¥ {plan.price_cny.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ {periodLabel(plan.billing_period)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-300 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" /><span>访问范围：{plan.access_scope}</span></div>
                    <div className="text-xs text-slate-400 font-mono-code">套餐代码：{plan.plan_code}</div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-white/[0.05]">
                  <button
                    disabled={isProcessing || !channels.some((item) => item.ready)}
                    onClick={() => handlePurchase(plan)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono-code font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950 cursor-pointer"
                  >
                    <span>前往平台收银台</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
