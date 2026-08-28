"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getAccountGate, getAccountPaymentResult, getGuestPaymentResult, restorePlatformAccessState } from "@/lib/platform/browser";
import { requirePlatformClientConfig } from "@/lib/platform/config";
import { loadPlatformSession } from "@/lib/platform/session";
import {
  AGENT_SESSION_TURNS,
  clearPendingPaidAnalysis,
  loadPendingPaidAnalysis,
  saveCompletedPaidAnalysis,
} from "@/lib/platform/pending-analysis";
import {
  clearStorefrontCheckout,
  loadStorefrontCheckout,
} from "@/lib/platform/storefront-recovery";

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function BillingResultClient({ orderId, productCode }: { orderId: string; productCode: string }) {
  const [message, setMessage] = useState("正在读取平台订单");
  const [stage, setStage] = useState<"loading" | "paid" | "waiting" | "failed">("loading");
  const [orderStatus, setOrderStatus] = useState("");
  const [retryable, setRetryable] = useState(false);

  const finish = useCallback(async () => {
    const configuredProductCode = (() => {
      try { return requirePlatformClientConfig().productCode; } catch { return ""; }
    })();
    const resolvedProductCode = productCode || configuredProductCode;
    const pending = loadPendingPaidAnalysis();
    const pendingAnalysis = pending && orderId && pending.orderId === orderId &&
      (!pending.productCode || pending.productCode === resolvedProductCode);
    const storefront = loadStorefrontCheckout({ orderId, productCode: resolvedProductCode });
    const pendingStorefront = storefront && orderId && storefront.orderId === orderId && storefront.productCode === resolvedProductCode;
    if ((!pendingAnalysis && !pendingStorefront) || !orderId || (configuredProductCode && resolvedProductCode !== configuredProductCode)) {
      setStage("failed");
      setMessage("这笔订单与当前产品不匹配，未执行操作；请回到工作台重试。");
      return;
    }

    // A storefront purchase grants platform access only. It must never be
    // routed through the paid-analysis recovery path.
    if (pendingStorefront && !pendingAnalysis) {
      setRetryable(false);
      setStage("loading");
      setMessage("正在向平台确认商店订单，不以支付回跳页面作为依据");
      try {
        let accountAccessToken = "";
        let accountCsrfToken = "";
        if (storefront.checkoutMode === "account") {
          const storedSession = loadPlatformSession();
          if (!storedSession) throw new Error("登录状态已失效，请重新登录后恢复订单。");
          const access = await restorePlatformAccessState(storedSession);
          accountAccessToken = access.session.access_token;
          accountCsrfToken = access.session.csrf_token;
        } else if (!storefront.checkoutToken) {
          throw new Error("游客支付凭证已失效，请重新发起购买。");
        }

        let paid = false;
        let lastStatus = "";
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const result = storefront.checkoutMode === "account"
            ? await getAccountPaymentResult(accountAccessToken, orderId, resolvedProductCode, { csrfToken: accountCsrfToken })
            : await getGuestPaymentResult(orderId, storefront.checkoutToken);
          const normalizedResult = result as {
            order?: { status?: string };
            status?: string;
            payment_status?: string;
            entitlement_active?: boolean;
          };
          lastStatus = normalizedResult.order?.status ?? normalizedResult.status ?? normalizedResult.payment_status ?? "";
          setOrderStatus(lastStatus);
          setMessage(lastStatus ? `平台订单状态：${lastStatus} · 等待权益确认` : "正在等待平台确认权益");
          if (normalizedResult.entitlement_active) {
            paid = true;
            break;
          }
          if (["failed", "cancelled", "refunded", "expired"].includes(lastStatus)) break;
          await wait(1500);
        }
        if (!paid) {
          setStage("waiting");
          setMessage(lastStatus && ["failed", "cancelled", "refunded", "expired"].includes(lastStatus)
            ? `订单未完成：${lastStatus}`
            : "平台还没有确认权益，支付可能仍在处理中");
          setRetryable(true);
          return;
        }

        if (storefront.checkoutMode === "account") {
          const gate = await getAccountGate(accountAccessToken, resolvedProductCode, undefined, { csrfToken: accountCsrfToken });
          if (!gate.allowed) throw new Error(gate.message || "支付已确认，但权益还在激活，请稍后重试。");
        }
        clearStorefrontCheckout();
        setStage("paid");
        setMessage("权益已由平台确认，正在返回胜天半子");
        window.setTimeout(() => window.location.replace("/"), 400);
      } catch (error) {
        setStage("failed");
        setMessage(error instanceof Error ? error.message : "订单恢复失败，请重试。");
        setRetryable(true);
      }
      return;
    }

    // The remaining branch is the original paid-analysis recovery flow.
    if (!pending) {
      setStage("failed");
      setMessage("未找到待恢复的分析订单，请回到工作台重试。");
      return;
    }

    setRetryable(false);
    setStage("loading");
    setMessage("正在向平台确认订单，不以支付回跳页面作为依据");
    try {
      let paid = false;
      let lastStatus = "";
      let accountAccessToken = "";
      let accountCsrfToken = "";
      if (pending.checkoutMode === "account") {
        const storedSession = loadPlatformSession();
        if (!storedSession) throw new Error("登录状态已失效，请重新登录后恢复订单。");
        const access = await restorePlatformAccessState(storedSession);
        accountAccessToken = access.session.access_token;
        accountCsrfToken = access.session.csrf_token;
      }
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const result = pending.checkoutMode === "account"
          ? await getAccountPaymentResult(accountAccessToken, orderId, resolvedProductCode, { csrfToken: accountCsrfToken })
          : await getGuestPaymentResult(orderId, pending.checkoutToken);
        const normalizedResult = result as {
          order?: { status?: string };
          status?: string;
          payment_status?: string;
          entitlement_active?: boolean;
        };
        lastStatus = normalizedResult.order?.status ?? normalizedResult.status ?? normalizedResult.payment_status ?? "";
        setOrderStatus(lastStatus);
        setMessage(lastStatus ? `平台订单状态：${lastStatus} · 等待权益确认` : "正在等待平台确认权益");
        if (normalizedResult.entitlement_active) {
          paid = true;
          break;
        }
        if (["failed", "cancelled", "refunded", "expired"].includes(lastStatus)) break;
        await wait(1500);
      }
      if (!paid) {
        setStage("waiting");
        setMessage(lastStatus && ["failed", "cancelled", "refunded", "expired"].includes(lastStatus)
          ? `订单未完成：${lastStatus}`
          : "平台还没有确认权益，支付可能仍在处理中");
        setRetryable(true);
        return;
      }

      if (pending.checkoutMode === "account") {
        const gate = await getAccountGate(accountAccessToken, resolvedProductCode, undefined, { csrfToken: accountCsrfToken });
        if (!gate.allowed) throw new Error(gate.message || "支付已确认，但权益还在激活，请稍后重试。");
      }
      setStage("paid");
      setMessage("权益已由平台确认，正在预留本次分析次数");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (pending.checkoutMode === "account") {
        if (accountAccessToken) headers.Authorization = `Bearer ${accountAccessToken}`;
      } else headers["X-Guest-Checkout-Token"] = pending.checkoutToken;
      const response = await fetch("/api/agent", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode: pending.mode,
          question: pending.question,
          focus: pending.focus,
          structuredText: pending.structuredText,
          jsonPayload: pending.jsonPayload,
          analysisProduct: pending.analysisProduct ?? "agent",
        }),
      });
      const result = (await response.json()) as {
        content?: string;
        model?: string;
        error?: string;
        usage?: { available?: number; consumed?: number };
      };
      if (!response.ok || !result.content) throw new Error(result.error ?? "分析失败，本次次数未提交，请重试。");

      saveCompletedPaidAnalysis({
        orderId: pending.orderId,
        productCode: pending.productCode ?? resolvedProductCode,
        checkoutToken: pending.checkoutToken,
        checkoutMode: pending.checkoutMode,
        mode: pending.mode,
        focus: pending.focus,
        structuredText: pending.structuredText,
        jsonPayload: pending.jsonPayload,
        messages: [
          { role: "user", content: pending.displayQuestion ?? pending.question },
          { role: "assistant", content: result.content },
        ],
        usageAvailable: Number(result.usage?.available ?? AGENT_SESSION_TURNS - 1),
        usageConsumed: Number(result.usage?.consumed ?? 1),
        totalTurns: AGENT_SESSION_TURNS,
        content: result.content,
        model: result.model ?? null,
        analysisProduct: pending.analysisProduct,
        klineKind: pending.klineKind,
        klineSeries: pending.klineSeries,
      });
      clearPendingPaidAnalysis();
      window.location.replace(pending.returnPath === "/paipan" ? "/paipan" : "/");
    } catch (error) {
      setStage("failed");
      setMessage(error instanceof Error ? error.message : "分析失败，请重试。");
      setRetryable(true);
    }
  }, [orderId, productCode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void finish();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <main className="platform-result-page">
      <div className="platform-result-card">
        {!retryable ? <LoaderCircle className="agent-spin" /> : null}
        <span className={`platform-result-card__stage is-${stage}`}>{stage === "paid" ? "平台已确认" : stage === "waiting" ? "待确认" : stage === "failed" ? "需要处理" : "处理中"}</span>
        <h1>{message}</h1>
        {orderStatus ? <p>订单状态：{orderStatus}</p> : null}
        <p className="platform-result-card__hint">订单、支付和权益以平台结果为准；刷新或重试不会重复扣费。</p>
        {retryable ? <button type="button" onClick={() => void finish()}>重试</button> : null}
      </div>
    </main>
  );
}
