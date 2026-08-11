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
  agentPlanCode,
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
  agentPlanCode: "shengtian-banzi-analysis-10",
}));

vi.mock("@/lib/platform/server", () => ({
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
}));

vi.mock("@/lib/agent/chat", () => ({
  requestAgentAnalysis: requestAgentAnalysisMock,
}));

import { POST } from "./route";

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
        question: "问".repeat(301),
        structuredText: "structured",
        jsonPayload: "{}",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "分析问题不能超过 300 字。" });
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

  it("releases the reserved credit when the model fails", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    requestAgentAnalysisMock.mockRejectedValue(new Error("分析服务暂时不可用，请稍后再试。"));
    releaseGuestUsageMock.mockResolvedValue({ available: 1, reserved: 0, consumed: 0 });

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "分析服务暂时不可用，请稍后再试。" });
    expect(releaseGuestUsageMock).toHaveBeenCalledWith("token-1", "reservation-1", { planCode: agentPlanCode });
    expect(commitGuestUsageMock).not.toHaveBeenCalled();
  });
});
