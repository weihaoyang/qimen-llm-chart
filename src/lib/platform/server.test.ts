import { describe, expect, it, vi } from "vitest";
import { fetchPlatformGate, readBearerToken, reservePlatformUsage } from "./server";

describe("platform server helpers", () => {
  it("extracts bearer token from authorization header", () => {
    expect(readBearerToken("Bearer abc123")).toBe("abc123");
    expect(readBearerToken("Basic abc123")).toBeNull();
    expect(readBearerToken(null)).toBeNull();
  });

  it("requests gate using configured product and scope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: "balance-1", product_code: "qmdj-pro", metric: "analysis_turn", remaining: 3, starts_at: "2026-01-01T00:00:00Z", ends_at: null },
    ]), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await fetchPlatformGate("access-token", {
      env: {
        PLATFORM_BASE_URL: "https://platform.example.com",
        PLATFORM_PRODUCT_CODE: "qmdj-pro",
        PLATFORM_ACCESS_SCOPE: "ai-analysis",
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const request = fetchImpl.mock.calls[0]?.[0] as Request;
    expect(request.url).toContain("https://platform.example.com/api/v1/usage/balance?product_code=qmdj-pro");
    expect(request.headers.get("Authorization")).toBe("Bearer access-token");
    expect(result.allowed).toBe(true);
  });

  it("preserves the SDK bearer, POST body and method when reserving usage", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "reservation-1" }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    const result = await reservePlatformUsage("access-token", {
      env: { PLATFORM_BASE_URL: "https://platform.example.com", PLATFORM_PRODUCT_CODE: "qimen", PLATFORM_ACCESS_SCOPE: "qimen-core" },
      fetchImpl, requestId: "request-1",
    });
    const request = fetchImpl.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe("Bearer access-token");
    expect(await request.json()).toEqual({ product_code: "qimen", metric: "analysis_turn", quantity: 1, idempotency_key: "request-1" });
    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(result).toEqual({ reservation_id: "reservation-1" });
  });
});
