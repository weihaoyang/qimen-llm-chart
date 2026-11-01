/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearActiveAgentSession,
  loadActiveAgentSession,
  loadKlineAiResult,
  saveActiveAgentSession,
  saveKlineAiResult,
} from "./pending-analysis";

const session = {
  mode: "bazi" as const,
  focus: "事业与财星",
  structuredText: "盘面",
  jsonPayload: "{}",
  messages: [{ role: "assistant" as const, content: "已完成分析" }],
  usageAvailable: 9,
  usageConsumed: 1,
  totalTurns: 10,
  updatedAt: Date.now(),
};

describe("account analysis session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("stores and validates an account analysis session", () => {
    expect(saveActiveAgentSession(session)).toBe(true);
    expect(loadActiveAgentSession()).toEqual(session);
  });

  it("ignores malformed account analysis records", () => {
    window.localStorage.setItem("qmdj.account-agent-session.v2", JSON.stringify({ ...session, messages: "invalid" }));
    expect(loadActiveAgentSession()).toBeNull();
  });

  it("clears the account session on logout", () => {
    saveActiveAgentSession(session);
    clearActiveAgentSession();
    expect(loadActiveAgentSession()).toBeNull();
  });

  it("stores the last K-line analysis independently", () => {
    const result = { content: "K线分析", model: "model-a", klineKind: "life" as const };
    expect(saveKlineAiResult(result)).toBe(true);
    expect(loadKlineAiResult()).toEqual(result);
  });
});
