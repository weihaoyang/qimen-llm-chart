"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { getAccountGate, getAccountPaymentResult, getGuestPaymentResult, restorePlatformAccessState } from '../../lib/platform/browser';
import { requirePlatformClientConfig } from '../../lib/platform/config';
import { loadPlatformSession } from '../../lib/platform/session';
import { clearStorefrontCheckout, loadStorefrontCheckout } from '../../lib/platform/storefront-recovery';

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export const BillingResultView: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id')?.trim() ?? '';
  const productCode = params.get('product_code')?.trim() ?? '';
  const [message, setMessage] = useState('正在读取平台订单。');
  const [stage, setStage] = useState<'loading' | 'paid' | 'waiting' | 'failed'>('loading');
  const [orderStatus, setOrderStatus] = useState('');
  const [retryable, setRetryable] = useState(false);

  const finish = useCallback(async () => {
    try {
      const config = requirePlatformClientConfig();
      const resolvedProductCode = productCode || config.productCode;
      const checkout = loadStorefrontCheckout({ orderId, productCode: resolvedProductCode });
      if (!orderId || resolvedProductCode !== config.productCode || !checkout) throw new Error('这笔订单与当前产品不匹配，未执行操作；请回到工作台重试。');
      setRetryable(false); setStage('loading'); setMessage('正在向平台确认订单，不以支付回跳页面作为依据。');
      let accessToken = ''; let csrfToken = '';
      if (checkout.checkoutMode === 'account') {
        const stored = loadPlatformSession();
        if (!stored) throw new Error('登录状态已失效，请重新登录后恢复订单。');
        const access = await restorePlatformAccessState(stored);
        accessToken = access.session.access_token; csrfToken = access.session.csrf_token;
      } else if (!checkout.checkoutToken) throw new Error('游客支付凭证已失效，请重新发起购买。');
      let entitlementActive = false; let lastStatus = '';
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const result = checkout.checkoutMode === 'account'
          ? await getAccountPaymentResult(accessToken, orderId, resolvedProductCode, { csrfToken })
          : await getGuestPaymentResult(orderId, checkout.checkoutToken);
        const normalized = result as { order?: { status?: string }; status?: string; payment_status?: string; entitlement_active?: boolean };
        lastStatus = normalized.order?.status ?? normalized.status ?? normalized.payment_status ?? '';
        setOrderStatus(lastStatus); setMessage(lastStatus ? `平台订单状态：${lastStatus} · 等待权益确认` : '正在等待平台确认权益。');
        if (normalized.entitlement_active) { entitlementActive = true; break; }
        if (['failed', 'cancelled', 'refunded', 'expired'].includes(lastStatus)) break;
        await wait(1500);
      }
      if (!entitlementActive) {
        setStage('waiting'); setMessage(['failed', 'cancelled', 'refunded', 'expired'].includes(lastStatus) ? `订单未完成：${lastStatus}` : '平台还没有确认权益，支付可能仍在处理中。'); setRetryable(true); return;
      }
      if (checkout.checkoutMode === 'account') {
        const gate = await getAccountGate(accessToken, resolvedProductCode, config.accessScope, { csrfToken });
        if (!gate.allowed) throw new Error(gate.message || '支付已确认，但权益还在激活，请稍后重试。');
      }
      clearStorefrontCheckout(); setStage('paid'); setMessage('权益已由平台确认，正在返回胜天半子。');
      window.setTimeout(() => window.location.replace('/'), 400);
    } catch (error) { setStage('failed'); setMessage(error instanceof Error ? error.message : '订单恢复失败，请重试。'); setRetryable(true); }
  }, [orderId, productCode]);

  useEffect(() => { const timer = window.setTimeout(() => { void finish(); }, 0); return () => window.clearTimeout(timer); }, [finish]);
  const stageLabel = stage === 'paid' ? '平台已确认' : stage === 'waiting' ? '待确认' : stage === 'failed' ? '需要处理' : '处理中';
  return (
    <main className="min-h-screen bg-[#04070d] text-slate-100 tactical-grid grid place-items-center px-6">
      <section className="surface-card w-full max-w-lg rounded-3xl border border-white/[0.12] p-8 text-center shadow-2xl">
        {!retryable ? <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-amber-300" /> : null}
        <span className="mt-5 inline-flex rounded-full border border-amber-700/60 bg-amber-950/30 px-3 py-1 font-mono-code text-[10px] text-amber-200">{stageLabel}</span>
        <h1 className="mt-4 text-2xl font-black">{message}</h1>
        {orderStatus ? <p className="mt-3 text-sm text-slate-400">订单状态：{orderStatus}</p> : null}
        <p className="mt-4 text-xs leading-5 text-slate-500">订单、支付和权益以平台结果为准；刷新或重试不会直接放行受限能力。</p>
        {retryable ? <button type="button" onClick={() => void finish()} className="mt-6 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">重试</button> : null}
        <a href="/" className="mt-5 block text-xs text-slate-400 underline hover:text-white">返回工作台</a>
      </section>
    </main>
  );
};
