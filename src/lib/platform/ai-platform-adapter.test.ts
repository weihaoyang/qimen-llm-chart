import { describe, expect, it, vi } from "vitest";
import { reportPlatformTokenUsage } from "./ai-platform-adapter";

describe("reportPlatformTokenUsage", () => {
  it("fails closed without a server service secret", async () => {
    const result = await reportPlatformTokenUsage(
      {
        providerCode: "openai-compatible",
        modelCode: "test-model",
        usage: { inputTokens: 4, outputTokens: 2 },
        idempotencyKey: "qmdj-test-1",
      },
      { env: { PLATFORM_BASE_URL: "https://platform.example.com", PLATFORM_PRODUCT_CODE: "shengtian-banzi", PLATFORM_ACCESS_SCOPE: "shengtian-banzi-core" } },
    );
    expect(result).toEqual({ reported: false, reasonCode: "platform_product_service_secret_missing" });
  });

  it("reports only normalized usage through the server contract", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ return_code: 0, charged: true }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await reportPlatformTokenUsage(
      {
        providerCode: "openai-compatible",
        modelCode: "test-model",
        usage: { inputTokens: 4, outputTokens: 2, cachedInputTokens: 1 },
        idempotencyKey: "qmdj-test-2",
      },
      {
        env: {
          PLATFORM_BASE_URL: "https://platform.example.com",
          PLATFORM_PRODUCT_CODE: "shengtian-banzi",
          PLATFORM_ACCESS_SCOPE: "shengtian-banzi-core",
          PLATFORM_PRODUCT_SERVICE_SECRET: "server-only-secret",
        },
        fetchImpl,
      },
    );
    expect(result.reported).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://platform.example.com/api/v1/entitlement/products/shengtian-banzi/token-usage");
    expect(new Headers(init.headers).get("X-Product-Service-Secret")).toBe("server-only-secret");
    expect(JSON.parse(String(init.body))).toEqual({
      provider_code: "openai-compatible",
      model_code: "test-model",
      input_tokens: 4,
      output_tokens: 2,
      cached_input_tokens: 1,
      idempotency_key: "qmdj-test-2",
    });
  });
});
