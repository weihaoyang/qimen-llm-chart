/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearActiveAgentSession,
  clearPendingPaidAnalysis,
  loadActiveAgentSession,
  loadPendingPaidAnalysis,
  popCompletedPaidAnalysis,
  saveActiveAgentSession,
  saveCompletedPaidAnalysis,
  savePendingPaidAnalysis,
} from "./pending-analysis";

const pending = (checkoutMode: "account" | "guest") => ({
  orderId: `${checkoutMode}-order`,
  checkoutToken: checkoutMode === "guest" ? "guest-secret" : "",
  checkoutMode,
  mode: "bazi" as const,
  question: "测试付费分析恢复",
  focus: "事业与财星",
  structuredText: "盘面",
  jsonPayload: "{}",
  createdAt: Date.now(),
});

const completed = (checkoutMode: "account" | "guest") => ({
  ...pending(checkoutMode),
  messages: [{ role: "assistant" as const, content: "已完成分析" }],
  usageAvailable: 9,
  usageConsumed: 1,
  totalTurns: 10,
  model: "deepseek-chat",
  content: "已完成分析",
});

describe("paid analysis recovery storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("keeps guest checkout tokens session-only", () => {
    savePendingPaidAnalysis(pending("guest"));
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(0);
    expect(loadPendingPaidAnalysis()?.checkoutToken).toBe("guest-secret");
  });

  it("keeps account paid recovery after a tab/provider round trip", () => {
    savePendingPaidAnalysis(pending("account"));
    saveCompletedPaidAnalysis(completed("account"));
    saveActiveAgentSession({ ...completed("account"), updatedAt: Date.now() });

    expect(window.sessionStorage.length).toBe(0);
    expect(window.localStorage.length).toBe(3);
    expect(loadPendingPaidAnalysis()?.orderId).toBe("account-order");
    expect(popCompletedPaidAnalysis()?.messages[0]?.content).toBe("已完成分析");
    expect(loadActiveAgentSession()?.orderId).toBe("account-order");
  });

  it("clears both recovery scopes on logout or completed recovery", () => {
    savePendingPaidAnalysis(pending("guest"));
    savePendingPaidAnalysis(pending("account"));
    saveActiveAgentSession({ ...completed("guest"), updatedAt: Date.now() });
    saveActiveAgentSession({ ...completed("account"), updatedAt: Date.now() });
    clearPendingPaidAnalysis();
    clearActiveAgentSession();
    expect(loadPendingPaidAnalysis()).toBeNull();
    expect(loadActiveAgentSession()).toBeNull();
  });
});
