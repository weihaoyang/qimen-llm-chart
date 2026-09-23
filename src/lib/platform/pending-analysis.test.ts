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

describe("credential storage invariant", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  // The store is derived from the token itself, not from `checkoutMode`, so a
  // mislabelled caller cannot leak a credential into long-lived localStorage.
  it("refuses to put a token in localStorage even when the mode says account", () => {
    savePendingPaidAnalysis({ ...pending("account"), checkoutToken: "mislabeled-secret" });

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.getItem("qmdj.pending-paid-analysis.v1")).toContain("mislabeled-secret");
    expect(loadPendingPaidAnalysis()?.checkoutToken).toBe("mislabeled-secret");
  });

  it("still keeps a credential-free account record in localStorage", () => {
    savePendingPaidAnalysis(pending("account"));

    expect(window.localStorage.length).toBe(1);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("applies the same rule to completed and active session records", () => {
    saveCompletedPaidAnalysis({ ...completed("account"), checkoutToken: "mislabeled-secret" });
    saveActiveAgentSession({
      ...completed("account"),
      checkoutToken: "mislabeled-secret",
      updatedAt: Date.now(),
    });

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(2);
    expect(popCompletedPaidAnalysis()?.checkoutToken).toBe("mislabeled-secret");
    expect(loadActiveAgentSession()?.checkoutToken).toBe("mislabeled-secret");
  });
});

describe("completed-analysis consumption", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("is destructive, so a second read finds nothing", () => {
    // Pinned because the mount effect in `app-shell.tsx` depends on it: the read
    // consumes the record, so a second invocation of that effect — React
    // double-invokes mount effects in development, and a remount has the same
    // shape — finds nothing and rebuilds the mode state from the session instead.
    // That is why the effect carries a latch rather than being re-runnable.
    saveCompletedPaidAnalysis(completed("account"));

    expect(popCompletedPaidAnalysis()?.orderId).toBe("account-order");
    expect(popCompletedPaidAnalysis()).toBeNull();
  });
});
