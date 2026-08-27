import { describe, expect, it, vi } from "vitest";
import { fetchPlatformGate, readBearerToken, readCookieValue, readPlatformCookieHeader } from "./server";

describe("platform server helpers", () => {
  it("extracts bearer token from authorization header", () => {
    expect(readBearerToken("Bearer abc123")).toBe("abc123");
    expect(readBearerToken("Basic abc123")).toBeNull();
    expect(readBearerToken(null)).toBeNull();
  });

  it("bridges product session cookies to the platform cookie contract", () => {
    const cookie = "theme=dark; qmdj_platform_access=access-1; qmdj_platform_refresh=refresh-1; qmdj_platform_csrf=csrf-1";
    expect(readPlatformCookieHeader(cookie)).toBe("ssp_access=access-1; ssp_refresh=refresh-1; ssp_csrf=csrf-1");
    expect(readCookieValue(cookie, "ssp_csrf")).toBe("csrf-1");
  });

  it("prefers first-party platform cookies when both forms are present", () => {
    const cookie = "ssp_access=platform-access; qmdj_platform_access=product-access; ssp_csrf=platform-csrf; qmdj_platform_csrf=product-csrf";
    expect(readPlatformCookieHeader(cookie)).toBe("ssp_access=platform-access; ssp_csrf=platform-csrf");
    expect(readCookieValue(cookie, "ssp_csrf")).toBe("platform-csrf");
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
