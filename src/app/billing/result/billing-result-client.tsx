"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getGuestPaymentResult } from "@/lib/platform/browser";
import {
  clearPendingPaidAnalysis,
  loadPendingPaidAnalysis,
  saveCompletedPaidAnalysis,
} from "@/lib/platform/pending-analysis";

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function BillingResultClient({ orderId }: { orderId: string; productCode: string }) {
  const [message, setMessage] = useState("正在确认支付");
  const [retryable, setRetryable] = useState(false);

  const finish = useCallback(async () => {
    const pending = loadPendingPaidAnalysis();
    if (!pending || !orderId || pending.orderId !== orderId) {
      setMessage("无法恢复这次分析。");
      return;
    }

    setRetryable(false);
    setMessage("正在确认支付");
    try {
      let paid = false;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const result = await getGuestPaymentResult(orderId, pending.checkoutToken);
        if (result.entitlement_active) {
          paid = true;
          break;
        }
        await wait(1500);
      }
      if (!paid) {
        setMessage("支付尚未完成");
        setRetryable(true);
        return;
      }

      setMessage("支付成功，正在分析");
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Guest-Checkout-Token": pending.checkoutToken,
        },
        body: JSON.stringify({
          mode: pending.mode,
          question: pending.question,
          structuredText: pending.structuredText,
          jsonPayload: pending.jsonPayload,
        }),
      });
      const result = (await response.json()) as { content?: string; model?: string; error?: string };
      if (!response.ok || !result.content) throw new Error(result.error ?? "分析失败，请重试。");

      saveCompletedPaidAnalysis({ mode: pending.mode, content: result.content, model: result.model ?? null });
      clearPendingPaidAnalysis();
      window.location.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "分析失败，请重试。");
      setRetryable(true);
    }
  }, [orderId]);

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
        <h1>{message}</h1>
        {retryable ? <button type="button" onClick={() => void finish()}>重试</button> : null}
      </div>
    </main>
  );
}
