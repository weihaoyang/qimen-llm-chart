import { describe, expect, it, vi } from "vitest";
import { fetchPlatformGate, readBearerToken } from "./server";

describe("platform server helpers", () => {
  it("extracts bearer token from authorization header", () => {
    expect(readBearerToken("Bearer abc123")).toBe("abc123");
    expect(readBearerToken("Basic abc123")).toBeNull();
    expect(readBearerToken(null)).toBeNull();
  });

  it("requests gate using configured product and scope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        allowed: true,
        mode: "subscribed",
        product_code: "qmdj-pro",
        access_scope: "ai-analysis",
        subject_type: "user",
        subject_id: "u_1",
        entitlement_source: "direct",
        reason_code: "",
        message: "ok",
      }),
    });

    const result = await fetchPlatformGate("access-token", {
      env: {
        PLATFORM_BASE_URL: "https://platform.example.com",
        PLATFORM_PRODUCT_CODE: "qmdj-pro",
        PLATFORM_ACCESS_SCOPE: "ai-analysis",
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0].toString()).toBe(
      "https://platform.example.com/api/v1/entitlement/products/qmdj-pro/gate?access_scope=ai-analysis",
    );
    expect(result.allowed).toBe(true);
  });
});
