import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  readGuestCheckoutTokenMock,
  reserveGuestUsageMock,
  commitGuestUsageMock,
  releaseGuestUsageMock,
  requestAgentAnalysisMock,
} = vi.hoisted(() => ({
  readGuestCheckoutTokenMock: vi.fn(),
  reserveGuestUsageMock: vi.fn(),
  commitGuestUsageMock: vi.fn(),
  releaseGuestUsageMock: vi.fn(),
  requestAgentAnalysisMock: vi.fn(),
}));

vi.mock("@/lib/platform/server", () => ({
  readGuestCheckoutToken: readGuestCheckoutTokenMock,
  reserveGuestUsage: reserveGuestUsageMock,
  commitGuestUsage: commitGuestUsageMock,
  releaseGuestUsage: releaseGuestUsageMock,
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

describe("POST /api/agent", () => {
  beforeEach(() => {
    readGuestCheckoutTokenMock.mockReset();
    reserveGuestUsageMock.mockReset();
    commitGuestUsageMock.mockReset();
    releaseGuestUsageMock.mockReset();
    requestAgentAnalysisMock.mockReset();
  });

  it("returns 402 when the checkout token is missing", async () => {
    readGuestCheckoutTokenMock.mockReturnValue(null);

    const response = await POST(new Request("http://localhost/api/agent", { method: "POST", body: "{}" }));

    expect(response.status).toBe(402);
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
    expect(reserveGuestUsageMock).toHaveBeenCalledWith("token-1");
    expect(commitGuestUsageMock).toHaveBeenCalledWith("token-1", "reservation-1");
    expect(releaseGuestUsageMock).not.toHaveBeenCalled();
  });

  it("releases the reserved credit when the model fails", async () => {
    readGuestCheckoutTokenMock.mockReturnValue("token-1");
    reserveGuestUsageMock.mockResolvedValue({ reservation_id: "reservation-1" });
    requestAgentAnalysisMock.mockRejectedValue(new Error("分析服务暂时不可用，请稍后再试。"));
    releaseGuestUsageMock.mockResolvedValue({ available: 1, reserved: 0, consumed: 0 });

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "分析服务暂时不可用，请稍后再试。" });
    expect(releaseGuestUsageMock).toHaveBeenCalledWith("token-1", "reservation-1");
    expect(commitGuestUsageMock).not.toHaveBeenCalled();
  });
});
