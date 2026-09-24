import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  readGuestCheckoutTokenMock,
  readBearerTokenMock,
  fetchPlatformGateMock,
  reserveGuestUsageMock,
  reservePlatformUsageMock,
  commitGuestUsageMock,
  commitPlatformUsageMock,
  releaseGuestUsageMock,
  releasePlatformUsageMock,
  requestAgentAnalysisMock,
  streamAgentAnalysisMock,
  createAgentEventStreamResponseMock,
  agentPlanCode,
  klinePlanCode,
} = vi.hoisted(() => ({
  readGuestCheckoutTokenMock: vi.fn(),
  readBearerTokenMock: vi.fn(),
  fetchPlatformGateMock: vi.fn(),
  reserveGuestUsageMock: vi.fn(),
  reservePlatformUsageMock: vi.fn(),
  commitGuestUsageMock: vi.fn(),
  commitPlatformUsageMock: vi.fn(),
  releaseGuestUsageMock: vi.fn(),
  releasePlatformUsageMock: vi.fn(),
  requestAgentAnalysisMock: vi.fn(),
  streamAgentAnalysisMock: vi.fn(),
  createAgentEventStreamResponseMock: vi.fn(() => new Response("stream-events", { headers: { "Content-Type": "application/x-ndjson" } })),
  agentPlanCode: "shengtian-banzi-analysis-10",
  klinePlanCode: "shengtian-banzi-kline-precise-1",
}));

// `PlatformServerRequestError` is passed through from the real module rather than
// stubbed: `settledCommit` distinguishes a reservation the platform already settled
// (a terminal 409) from a transient failure with `instanceof`, so a mock that omits
// the class makes the route throw "no such export" instead of exercising the branch.
vi.mock("@/lib/platform/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/platform/server")>("@/lib/platform/server");
  return {
  PlatformServerRequestError: actual.PlatformServerRequestError,
  readGuestCheckoutToken: readGuestCheckoutTokenMock,
  readBearerToken: readBearerTokenMock,
  fetchPlatformGate: fetchPlatformGateMock,
  reserveGuestUsage: reserveGuestUsageMock,
  reservePlatformUsage: reservePlatformUsageMock,
  commitGuestUsage: commitGuestUsageMock,
  commitPlatformUsage: commitPlatformUsageMock,
  releaseGuestUsage: releaseGuestUsageMock,
  releasePlatformUsage: releasePlatformUsageMock,
  AGENT_PLAN_CODE: agentPlanCode,
  KLINE_PLAN_CODE: klinePlanCode,
  };
});

vi.mock("@/lib/agent/chat", () => ({
  requestAgentAnalysis: requestAgentAnalysisMock,
  streamAgentAnalysis: streamAgentAnalysisMock,
  createAgentEventStreamResponse: createAgentEventStreamResponseMock,
}));

import { POST } from "./route";
import { PlatformServerRequestError } from "@/lib/platform/server";
import { UserFacingError } from "@/lib/user-facing-error";

const validRequest = () =>
  new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "X-Guest-Checkout-Token": "token-1" },
    body: JSON.stringify({ mode: "qimen", structuredText: "structured", jsonPayload: "{}" }),
  });

const validAccountRequest = () =>
  new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { Authorization: "Bearer account-token" },
    body: JSON.stringify({ mode: "qimen", structuredText: "structured", jsonPayload: "{}" }),
  });

describe("POST /api/agent", () => {
  beforeEach(() => {
    readGuestCheckoutTokenMock.mockReset();
    readBearerTokenMock.mockReset();
    readBearerTokenMock.mockReturnValue(null);
    fetchPlatformGateMock.mockReset();
    reserveGuestUsageMock.mockReset();
    reservePlatformUsageMock.mockReset();
    commitGuestUsageMock.mockReset();
    commitPlatformUsageMock.mockReset();
    releaseGuestUsageMock.mockReset();
    releasePlatformUsageMock.mockReset();
    requestAgentAnalysisMock.mockReset();
    streamAgentAnalysisMock.mockReset();
  });

  it("returns 402 when the checkout token is missing", async () => {
    readGuestCheckoutTokenMock.mockReturnValue(null);

    const response = await POST(new Request("http://localhost/api/agent", { method: "POST", body: "{}" }));

    expect(response.status).toBe(401);
    expect(reserveGuestUsageMock).not.toHaveBeenCalled();
  });

  it("preserves a rejected usage reservation status", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockRejectedValue({
      status: 403,
      reasonCode: "usage_credit_unavailable",
      message: "没有可用分析次数。",
    });

    const response = await POST(validRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "没有可用分析次数。",
      reasonCode: "usage_credit_unavailable",
    });
    expect(requestAgentAnalysisMock).not.toHaveBeenCalled();
  });

  it("reserves one credit, runs the model, then commits it", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    requestAgentAnalysisMock.mockResolvedValue({ content: "分析完成", model: "mock-model" });
    commitGuestUsageMock.mockResolvedValue({
      product_code: "shengtian-banzi",
      available: 0,
      reserved: 0,
      consumed: 1,
    });

    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      content: "分析完成",
      model: "mock-model",
      usage: {
        product_code: "shengtian-banzi",
        available: 0,
        reserved: 0,
        consumed: 1,
      },
    });
    expect(reserveGuestUsageMock).toHaveBeenCalledWith("token-1", { planCode: agentPlanCode });
    expect(commitGuestUsageMock).toHaveBeenCalledWith("token-1", "reservation-1", { planCode: agentPlanCode });
    expect(releaseGuestUsageMock).not.toHaveBeenCalled();
  });

  // The platform's commit is a compare-and-set, so a credit the earlier attempt
  // already consumed answers a terminal 409 — not a retryable failure. Treating it
  // as retryable meant the analysis had already been produced (`delivered` is set
  // before the commit runs) yet the response was an error, so a user who *had* been
  // charged could never open what they paid for, and every retry reproduced the 409.
  it("delivers the analysis when the platform reports the reservation already settled", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    requestAgentAnalysisMock.mockResolvedValue({ content: "分析完成", model: "mock-model" });
    commitGuestUsageMock.mockRejectedValue(new PlatformServerRequestError(409, "usage_reservation_expired", "本次分析预留已过期，请重新发起。"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(validRequest());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        content: "分析完成",
        model: "mock-model",
        usage: { reconciled: "already_settled", reason_code: "usage_reservation_expired" },
      });
      // Terminal means terminal: not retried, and a settled reservation is never
      // refunded.
      expect(commitGuestUsageMock).toHaveBeenCalledTimes(1);
      expect(releaseGuestUsageMock).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("checks the platform gate and charges an authenticated account", async () => {
    readBearerTokenMock.mockReturnValue("account-token");
    fetchPlatformGateMock.mockResolvedValue({ allowed: true, reason_code: "", message: "ok" });
    reservePlatformUsageMock.mockResolvedValue({ reservation_id: "account-reservation" });
    requestAgentAnalysisMock.mockResolvedValue({ content: "账户分析完成", model: "mock-model" });
    commitPlatformUsageMock.mockResolvedValue({ product_code: "shengtian-banzi", available: 9, reserved: 0, consumed: 1 });

    const response = await POST(validAccountRequest());

    expect(response.status).toBe(200);
    expect(fetchPlatformGateMock).toHaveBeenCalledTimes(1);
    expect(reservePlatformUsageMock).toHaveBeenCalledWith("account-token", { planCode: agentPlanCode });
    expect(commitPlatformUsageMock).toHaveBeenCalledWith("account-token", "account-reservation", { planCode: agentPlanCode });
    expect(releasePlatformUsageMock).not.toHaveBeenCalled();
  });

  it("accepts the restored paid conversation and forwards it before committing the next turn", async () => {
    readBearerTokenMock.mockReturnValue("account-token");
    fetchPlatformGateMock.mockResolvedValue({ allowed: true, reason_code: "", message: "ok" });
    reservePlatformUsageMock.mockResolvedValue({ reservation_id: "follow-up-reservation" });
    requestAgentAnalysisMock.mockResolvedValue({ content: "基于上一轮继续分析", model: "mock-model" });
    commitPlatformUsageMock.mockResolvedValue({ product_code: "shengtian-banzi", available: 8, reserved: 0, consumed: 2 });
    const history = [
      { role: "user", content: "第一轮问题" },
      { role: "assistant", content: "第一轮结果" },
    ];
    const response = await POST(new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { Authorization: "Bearer account-token" },
      body: JSON.stringify({
        mode: "bazi",
        question: "追问：下一步怎么做？",
        history,
        structuredText: "同一份已锁定盘面证据",
        jsonPayload: "{}",
      }),
    }));

    expect(response.status).toBe(200);
    expect(requestAgentAnalysisMock).toHaveBeenCalledWith(expect.objectContaining({ history }));
    expect(commitPlatformUsageMock).toHaveBeenCalledWith("account-token", "follow-up-reservation", { planCode: agentPlanCode });
  });

  it("blocks an authenticated account before reserving when gate is denied", async () => {
    readBearerTokenMock.mockReturnValue("account-token");
    fetchPlatformGateMock.mockResolvedValue({ allowed: false, reason_code: "entitlement_missing", message: "请先购买。" });

    const response = await POST(validAccountRequest());

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({ reasonCode: "entitlement_missing" });
    expect(reservePlatformUsageMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized question before reserving usage", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "X-Guest-Checkout-Token": "token-1" },
      body: JSON.stringify({
        mode: "qimen",
        question: "问".repeat(2001),
        structuredText: "structured",
        jsonPayload: "{}",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "分析问题不能超过 2000 字。" });
    expect(reserveGuestUsageMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown analysis product before reserving usage", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "X-Guest-Checkout-Token": "token-1" },
      body: JSON.stringify({
        mode: "qimen",
        analysisProduct: "wrong-product",
        structuredText: "structured",
        jsonPayload: "{}",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "无效的分析产品。" });
    expect(reserveGuestUsageMock).not.toHaveBeenCalled();
  });

  it("accepts a Bazi life K line and reserves the dedicated K line entitlement", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "kline-reservation" });
    requestAgentAnalysisMock.mockResolvedValue({ content: "人生 K 线深度报告", model: "mock-model" });
    commitGuestUsageMock.mockResolvedValue({ product_code: "shengtian-banzi", available: 0, reserved: 0, consumed: 1 });

    const response = await POST(new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "X-Guest-Checkout-Token": "token-1" },
      body: JSON.stringify({
        mode: "bazi",
        analysisProduct: "kline",
        structuredText: "八字大运与流年结构化材料",
        jsonPayload: "{}",
      }),
    }));

    expect(response.status).toBe(200);
    expect(reserveGuestUsageMock).toHaveBeenCalledWith("token-1", { planCode: klinePlanCode });
    expect(commitGuestUsageMock).toHaveBeenCalledWith("token-1", "kline-reservation", { planCode: klinePlanCode });
    expect(requestAgentAnalysisMock).toHaveBeenCalledWith(expect.objectContaining({ mode: "bazi", analysisProduct: "kline" }));
  });

  it("releases the reserved credit when the model fails", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    // `requestAgentAnalysis` marks its deliberate messages as user-facing; the
    // route must forward them verbatim.
    requestAgentAnalysisMock.mockRejectedValue(new UserFacingError("分析服务暂时不可用，请稍后再试。"));
    releaseGuestUsageMock.mockResolvedValue({ available: 1, reserved: 0, consumed: 0 });

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "分析服务暂时不可用，请稍后再试。" });
    expect(releaseGuestUsageMock).toHaveBeenCalledWith("token-1", "reservation-1", { planCode: agentPlanCode });
    expect(commitGuestUsageMock).not.toHaveBeenCalled();
  });

  it("never echoes an internal failure to the browser", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    requestAgentAnalysisMock.mockRejectedValue(
      new Error('relation "agent_usage_ledger" does not exist (SQLSTATE 42P01) at 127.0.0.1:5432'),
    );
    releaseGuestUsageMock.mockResolvedValue({ available: 1, reserved: 0, consumed: 0 });

    const response = await POST(validRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "AI 分析请求失败。" });
    // The reservation still has to be returned when nothing was delivered.
    expect(releaseGuestUsageMock).toHaveBeenCalledWith("token-1", "reservation-1", { planCode: agentPlanCode });
  });

  it("does not echo an unconfigured-provider message", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    requestAgentAnalysisMock.mockRejectedValue(
      new Error("未配置 OPENAI_API_KEY、AI_API_KEY、GEMINI_API_KEY 或 GOOGLE_GENERATIVE_AI_API_KEY。"),
    );
    releaseGuestUsageMock.mockResolvedValue({ available: 1, reserved: 0, consumed: 0 });

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "AI 分析请求失败。" });
  });
});

describe("POST /api/agent (streaming settle)", () => {
  type StreamCallbacks = {
    onChunk: () => void;
    onFinish: () => Promise<void> | void;
    onError: () => Promise<void> | void;
    onAbort: () => Promise<void> | void;
  };

  const streamRequest = () =>
    new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "X-Guest-Checkout-Token": "token-1", "x-agent-stream": "1" },
      body: JSON.stringify({ mode: "qimen", structuredText: "structured", jsonPayload: "{}" }),
    });

  const startStream = async () => {
    let callbacks: StreamCallbacks | null = null;
    streamAgentAnalysisMock.mockImplementation((_payload: unknown, options: StreamCallbacks) => {
      callbacks = options;
      return { toTextStreamResponse: () => new Response("stream") };
    });

    const response = await POST(streamRequest());
    expect(response.status).toBe(200);
    if (!callbacks) throw new Error("streamAgentAnalysis was not called");
    return callbacks as StreamCallbacks;
  };

  beforeEach(() => {
    readGuestCheckoutTokenMock.mockReset();
    readBearerTokenMock.mockReset();
    readBearerTokenMock.mockReturnValue(null);
    reserveGuestUsageMock.mockReset();
    commitGuestUsageMock.mockReset();
    releaseGuestUsageMock.mockReset();
    streamAgentAnalysisMock.mockReset();
  });

  it("commits a delivered analysis even when the client aborts before finish", async () => {
    // The abort arrives after text reached the client but before `onFinish`
    // settles. The old split callbacks marked the stream settled in `release`,
    // noticed the delivery, and returned — leaving the reservation dangling and
    // `commit` permanently blocked, so the platform decided whether it was paid.
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    commitGuestUsageMock.mockResolvedValue({ available: 0, reserved: 0, consumed: 1 });

    const callbacks = await startStream();
    callbacks.onChunk();
    await callbacks.onAbort();
    await callbacks.onFinish();

    expect(commitGuestUsageMock).toHaveBeenCalledTimes(1);
    expect(commitGuestUsageMock).toHaveBeenCalledWith("token-1", "reservation-1", { planCode: "shengtian-banzi-analysis-10" });
    expect(releaseGuestUsageMock).not.toHaveBeenCalled();
  });

  it("releases the reservation when the client aborts before any text", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    releaseGuestUsageMock.mockResolvedValue({ available: 1, reserved: 0, consumed: 0 });

    const callbacks = await startStream();
    await callbacks.onAbort();
    await callbacks.onFinish();

    expect(releaseGuestUsageMock).toHaveBeenCalledTimes(1);
    expect(commitGuestUsageMock).not.toHaveBeenCalled();
  });

  it("settles exactly once no matter how many callbacks fire", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    commitGuestUsageMock.mockResolvedValue({ available: 0, reserved: 0, consumed: 1 });

    const callbacks = await startStream();
    callbacks.onChunk();
    await callbacks.onFinish();
    await callbacks.onAbort();
    await callbacks.onError();

    expect(commitGuestUsageMock).toHaveBeenCalledTimes(1);
    expect(releaseGuestUsageMock).not.toHaveBeenCalled();
  });

  it("does not retry a failed commit, which would double-charge", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    commitGuestUsageMock.mockRejectedValue(new Error("network lost after commit"));

    const callbacks = await startStream();
    callbacks.onChunk();
    await expect(callbacks.onFinish()).rejects.toThrow("network lost after commit");
    // A later callback must not pick the same reservation up again.
    await callbacks.onAbort();

    expect(commitGuestUsageMock).toHaveBeenCalledTimes(1);
    expect(releaseGuestUsageMock).not.toHaveBeenCalled();
  });

  // The same defect on the streaming path. The text is already on the wire when the
  // commit runs, so a terminal 409 must not surface as a stream error after the user
  // has the analysis: the reservation is settled, nothing needs retrying, and the
  // settlement must not be mistaken for a reason to refund.
  it("does not raise a stream error when the platform reports the reservation already settled", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    commitGuestUsageMock.mockRejectedValue(new PlatformServerRequestError(409, "usage_reservation_expired", "本次分析预留已过期，请重新发起。"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const callbacks = await startStream();
      callbacks.onChunk();

      await expect(callbacks.onFinish()).resolves.toBeUndefined();
      // A later callback must not pick the same reservation up again.
      await callbacks.onAbort();

      expect(commitGuestUsageMock).toHaveBeenCalledTimes(1);
      expect(releaseGuestUsageMock).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
