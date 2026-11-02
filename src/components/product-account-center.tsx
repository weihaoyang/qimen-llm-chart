"use client";

import { useEffect, useRef, useState } from "react";
import { createPlatformClient } from "@singseq/platform-sdk";
import type { components } from "@singseq/platform-sdk";
import "./product-account-center.css";

type Balance = components["schemas"]["UsageBalanceView"];
type Plan = components["schemas"]["PlanView"];
const metricNames: Record<string, string> = { analysis_turn: "AI 分析", kline_report: "人生 K 线报告", battle_analysis: "AI 推演", ai_report: "AI 解读报告" };
const periods: Record<string, string> = { MONTHLY: "月", ANNUAL: "年", WEEKLY: "周", DAILY: "天", QUARTERLY: "季度", BIENNIAL: "两年", NO_BILLING_PERIOD: "次" };
const phaseNames: Record<string, string> = { TRIAL: "试用阶段", EVERGREEN: "常规阶段", DISCOUNT: "优惠阶段", FIXEDTERM: "固定期限" };
const money = (price: { currency: string; value: number }) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: price.currency }).format(price.value);

export function ProductAccountCenter({ open, onClose, accessToken, baseUrl, productCode, productName, subjectId, onLogin }: { open: boolean; onClose: () => void; accessToken?: string | null; baseUrl: string; productCode: string; productName: string; subjectId?: string; onLogin: () => void; }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const billingUrl = new URL("/account", baseUrl);
  billingUrl.searchParams.set("product", productCode);
  if (subjectId) billingUrl.searchParams.set("subject", subjectId);
  const plansUrl = new URL(billingUrl);
  plansUrl.searchParams.set("view", "plans");
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBalances([]); setPlans([]); setError(""); setLoading(true);
    const api = createPlatformClient({ baseUrl, auth: { type: "bearer", token: () => accessToken || "" } });
    const load = async () => {
      const result = await Promise.allSettled([
        accessToken ? api.GET("/api/v1/usage/balance", { params: { query: { product_code: productCode } } }) : Promise.resolve(null),
        api.GET("/api/v1/catalog"),
      ]);
      if (cancelled) return;
      const [usage, catalog] = result;
      const messages: string[] = [];
      if (usage.status === "fulfilled" && usage.value) {
        if (usage.value.data) setBalances(usage.value.data.filter(item => item.product_code === productCode));
        else messages.push(usage.value.response.status === 401 ? "登录已过期，请重新登录后刷新。" : "暂时无法读取权益，请稍后刷新。");
      } else if (usage.status === "rejected") messages.push("暂时无法读取权益，请稍后刷新。");
      if (catalog.status === "fulfilled" && catalog.value.data) setPlans(catalog.value.data.filter(plan => plan.benefits.some(benefit => benefit.product_code === productCode)));
      else messages.push("暂时无法读取会员方案，请稍后刷新。");
      setError(messages.join(" ")); setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [open, accessToken, baseUrl, productCode, revision]);
  return <dialog ref={dialog} className="sg-product-center" aria-labelledby={`sg-title-${productCode}`} onCancel={onClose} onClose={onClose}>
    <header className="sg-center-head"><div><span>我的用户中心</span><h2 id={`sg-title-${productCode}`}>{productName}</h2></div><button type="button" onClick={onClose} aria-label="关闭用户中心">×</button></header>
    <div className="sg-center-body">
      <div className="sg-center-toolbar"><p>本产品的会员权益与 AI 使用额度</p><button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading}>刷新</button></div>
      {error && <p className="sg-center-error" role="alert">{error}</p>}
      {!accessToken && <section className="sg-center-card"><h3>登录后查看你的权益</h3><p>使用奇点序列账号，查看当前产品的剩余次数与有效期。</p><button type="button" onClick={onLogin}>登录奇点序列账号</button></section>}
      {loading ? <p role="status">正在读取权益与方案…</p> : accessToken && !error.includes("权益") && !error.includes("登录") && <section><h3>我的权益</h3>{balances.length ? <div className="sg-center-grid">{balances.map(item => <article className="sg-center-card" key={item.id}><span>{metricNames[item.metric] || item.metric}</span><strong>{item.remaining === null ? "不限次数" : <>{item.remaining.toLocaleString()}<small> 次可用</small></>}</strong><p>{item.ends_at ? `有效至 ${new Date(item.ends_at).toLocaleDateString("zh-CN")}` : "长期有效"}</p></article>)}</div> : <div className="sg-center-card"><p>当前暂无本产品可用权益，可在下方选择方案。</p></div>}</section>}
      <section><h3>会员与额度包</h3><div className="sg-center-grid">{plans.map(plan => {
        const buyUrl = new URL(plansUrl); buyUrl.searchParams.set("plan", plan.name);
        return <article className="sg-center-card" key={plan.name}><h4>{plan.prettyName}</h4>{plan.phases.map((phase, index) => <div className="sg-center-price" key={index}><span>{phaseNames[phase.type] || phase.type}</span>{phase.fixedPrices.map((price, i) => <p key={`fixed-${i}`}>{money(price)} · 一次性费用</p>)}{phase.prices.map((price, i) => <p key={`recurring-${i}`}>{money(price)} / {periods[plan.billingPeriod] || plan.billingPeriod}</p>)}{!!phase.usages.length && <p>含用量计费，计价明细请在结算页确认</p>}</div>)}<ul>{plan.benefits.filter(benefit => benefit.product_code === productCode).map(benefit => <li key={benefit.metric}>{metricNames[benefit.metric] || benefit.metric}：{benefit.quantity === null ? "不限量" : `${benefit.quantity} 次`}</li>)}</ul><a className="sg-center-primary" href={buyUrl.toString()} target="_blank" rel="noopener noreferrer">查看与购买 ↗</a></article>;
      })}</div>{!loading && !plans.length && <p className="sg-center-muted">当前暂无公开销售的本产品方案。</p>}</section>
      <footer className="sg-center-links"><a href={billingUrl.toString()} target="_blank" rel="noopener noreferrer">订单、续费与账单 ↗</a><a href="https://id.singseq.com/account" target="_blank" rel="noopener noreferrer">账号资料与安全 ↗</a></footer>
      <p className="sg-center-note">AI 请求成功后扣减次数；失败释放预留。购买、续费与退款由奇点序列统一处理。</p>
    </div>
  </dialog>;
}
