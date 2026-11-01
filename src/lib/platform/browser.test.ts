import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPlatformUsage, parsePlatformOAuthCallback, preparePlatformOAuthLogin } from "./browser";

describe("platform browser helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prepares a PKCE login redirect for the production product callback", async () => {
    const login = await preparePlatformOAuthLogin({
      baseUrl: "https://platform.singseq.com",
      productCode: "qimen",
      clientId: "qimen-web",
    }, "https://qmdj.singseq.com/");
    const url = new URL(login.url);

    expect(url.origin + url.pathname).toBe("https://platform.singseq.com/api/v1/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("qimen-web");
    expect(url.searchParams.get("scope")).toContain("account.read");
    expect(url.searchParams.get("redirect_uri")).toBe("https://qmdj.singseq.com/auth/callback");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(login.request.challenge);
    expect(url.searchParams.get("state")).toBe(login.request.state);
    expect(login.request.verifier.length).toBeGreaterThan(40);
  });

  it("parses only the canonical path callback route", () => {
    expect(parsePlatformOAuthCallback("/auth/callback?code=opaque-platform-code&state=state-1")).toEqual({
      code: "opaque-platform-code", state: "state-1",
    });
    expect(parsePlatformOAuthCallback("/auth/callback?code=ssp_oauth_1&state=state-1")).toEqual({
      code: "ssp_oauth_1",
      state: "state-1",
    });
    expect(parsePlatformOAuthCallback("#/auth/callback?code=ssp_oauth_1&state=state-1")).toBeNull();
    expect(parsePlatformOAuthCallback("?code=ssp_oauth_1&state=state-1")).toBeNull();
  });
  it("reads the usage balance and exposes the platform metric as its unit", async () => {
    const previous = {
      base: process.env.NEXT_PUBLIC_PLATFORM_BASE_URL,
      product: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE,
    };
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = "https://platform.example.com";
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = "qimen";

    let requestUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      requestUrl = input instanceof Request ? input.url : input.toString();
      return new Response(JSON.stringify([
        { id: "balance-1", product_code: "qimen", metric: "analysis_turn", remaining: 9, starts_at: "2026-01-01T00:00:00Z", ends_at: null },
      ]), { status: 200 });
    }));

    try {
      const usage = await fetchPlatformUsage("access-token", "analysis_turn");
      expect(requestUrl).toContain("/api/v1/usage/balance?product_code=qimen");
      expect(usage.usage_unit).toBe("analysis_turn");
      expect(usage.usage_label).toBe("analysis_turn");
      expect(usage.by_metric).toHaveLength(1);
      expect(usage.available).toBe(9);
    } finally {
      process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = previous.base;
      process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = previous.product;
    }
  });
});
