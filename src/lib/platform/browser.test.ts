import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccountCheckout, createGuestCheckout, createGuestPaymentAttempt, fetchPlatformUsage, parsePlatformCallbackFragment, parsePlatformOAuthCallback, preparePlatformOAuthLogin, redeemInvitationCode, toPlatformSession } from "./browser";

describe("platform browser helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prepares a PKCE login redirect for the production product callback", async () => {
    const login = await preparePlatformOAuthLogin({
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }, "https://qmdj.singseq.com/");
    const url = new URL(login.url);

    expect(url.origin + url.pathname).toBe("https://singseq.com/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("shengtian-banzi");
    expect(url.searchParams.get("access_scope")).toBe("shengtian-banzi-core");
    expect(url.searchParams.get("redirect_uri")).toBe("https://qmdj.singseq.com/#/auth/callback");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(login.request.challenge);
    expect(url.searchParams.get("state")).toBe(login.request.state);
    expect(login.request.verifier.length).toBeGreaterThan(40);
  });

  it("parses only the canonical hash callback route", () => {
    expect(parsePlatformOAuthCallback("#/auth/callback?code=ssp_oauth_1&state=state-1")).toEqual({
      code: "ssp_oauth_1",
      state: "state-1",
    });
    expect(parsePlatformOAuthCallback("#/auth/legacy-callback?code=ssp_oauth_1&state=state-1")).toBeNull();
    expect(parsePlatformOAuthCallback("?code=ssp_oauth_1&state=state-1")).toBeNull();
  });
  it("parses the social login callback hash fragment", () => {
    const result = parsePlatformCallbackFragment(
      "#access_token=access-1&refresh_token=refresh-1&expires_at=2026-07-07T00%3A00%3A00.000Z&refresh_expires_at=2026-08-07T00%3A00%3A00.000Z&user_id=user-1&phone_number=13900139000",
    );

    expect(result).toEqual({
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_at_iso: "2026-07-07T00:00:00.000Z",
      refresh_expires_at_iso: "2026-08-07T00:00:00.000Z",
      user_id: "user-1",
      phone_number: "13900139000",
    });
  });

  it("returns null when the callback fragment is incomplete", () => {
    expect(parsePlatformCallbackFragment("#access_token=only-token")).toBeNull();
  });

  it("also parses a query-string login callback", () => {
    expect(
      parsePlatformCallbackFragment(
        "?access_token=access-1&refresh_token=refresh-1&expires_at=2026-07-07T00%3A00%3A00.000Z&refresh_expires_at=2026-08-07T00%3A00%3A00.000Z&user_id=user-1&phone_number=13900139000",
      )?.user_id,
    ).toBe("user-1");
  });

  it("converts callback payload into a platform session", () => {
    expect(
      toPlatformSession({
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_at_iso: "2026-07-07T00:00:00.000Z",
        refresh_expires_at_iso: "2026-08-07T00:00:00.000Z",
        user_id: "user-1",
        phone_number: "13900139000",
      }),
    ).toEqual({
      access_token: "access-1",
      refresh_token: "refresh-1",
      csrf_token: "",
      expires_at_iso: "2026-07-07T00:00:00.000Z",
      refresh_expires_at_iso: "2026-08-07T00:00:00.000Z",
      user_id: "user-1",
      phone_number: "13900139000",
      current_subject_type: "user",
      current_subject_id: "user-1",
    });
  });

  it("sends idempotent account and guest order requests", async () => {
    const previous = {
      base: process.env.NEXT_PUBLIC_PLATFORM_BASE_URL,
      product: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE,
      scope: process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE,
    };
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = "https://platform.example.com";
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = "shengtian-banzi";
    process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = "shengtian-banzi-core";
    const requests: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: input.toString(), body: String(init?.body ?? "") });
      if (requests.length === 1) {
        return new Response(JSON.stringify({ order: { order_id: "order-1" } }), { status: 200 });
      }
      if (requests.length === 2) {
        return new Response(JSON.stringify({ provider_checkout_url: "https://pay.example.com/order-1" }), { status: 200 });
      }
      return new Response(JSON.stringify({ checkout_token: "guest-token", order: { order_id: "guest-order" } }), { status: 200 });
    }));

    await createAccountCheckout("account-token", "shengtian-banzi-analysis-10", "alipay", "https://qmdj.example.com/billing/result", undefined, "wap");
    const guest = await createGuestCheckout("shengtian-banzi-analysis-10", "alipay");
    await createGuestPaymentAttempt(guest, "alipay", "https://qmdj.example.com/billing/result", "wap");

    const accountBody = JSON.parse(requests[0]?.body ?? "{}");
    const guestBody = JSON.parse(requests[2]?.body ?? "{}");
    expect(accountBody.idempotency_key.length).toBeGreaterThanOrEqual(32);
    expect(guestBody.idempotency_key.length).toBeGreaterThanOrEqual(32);
    expect(JSON.parse(requests[0]?.body ?? "{}").payment_scene).toBeUndefined();
    expect(JSON.parse(requests[1]?.body ?? "{}").payment_scene).toBe("wap");
    expect(JSON.parse(requests[3]?.body ?? "{}").payment_scene).toBe("wap");
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = previous.base;
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = previous.product;
    process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = previous.scope;
  });

  it("redeems an invitation code through the platform with bearer auth", async () => {
    const previous = {
      base: process.env.NEXT_PUBLIC_PLATFORM_BASE_URL,
      product: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE,
      scope: process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE,
    };
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = "https://platform.example.com";
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = "shengtian-banzi";
    process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = "shengtian-banzi-core";

    let request: { url: string; method: string; authorization: string | null; body: string } | null = null;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      request = {
        url: input.toString(),
        method: init?.method ?? "GET",
        authorization: new Headers(init?.headers).get("Authorization"),
        body: String(init?.body ?? ""),
      };
      return new Response(JSON.stringify({
        return_code: 0,
        product_code: "shengtian-banzi",
        plan_code: "shengtian-banzi-analysis-10",
        plan_title: "邀请码分析次数",
        credits_granted: 10,
        available: 10,
        redeemed_at_iso: "2026-08-09T00:00:00.000Z",
      }), { status: 200 });
    }));

    try {
      const result = await redeemInvitationCode("access-token", "SSAR-AAAA-BBBB-CCCC-DDDD");
      expect(result.credits_granted).toBe(10);
      expect(request).toEqual({
        url: "https://platform.example.com/api/v1/entitlement/invitations/redeem",
        method: "POST",
        authorization: "Bearer access-token",
        body: JSON.stringify({ code: "SSAR-AAAA-BBBB-CCCC-DDDD" }),
      });
    } finally {
      process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = previous.base;
      process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = previous.product;
      process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = previous.scope;
    }
  });

  it("scopes the usage read to a plan code and surfaces the unit", async () => {
    const previous = {
      base: process.env.NEXT_PUBLIC_PLATFORM_BASE_URL,
      product: process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE,
      scope: process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE,
    };
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = "https://platform.example.com";
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = "shengtian-banzi";
    process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = "shengtian-banzi-core";

    let requestUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      requestUrl = input.toString();
      return new Response(JSON.stringify({
        return_code: 0,
        product_code: "shengtian-banzi",
        plan_code: "shengtian-banzi-analysis-10",
        available: 9,
        reserved: 0,
        consumed: 1,
        usage_unit: "analysis_turn",
        usage_label: "研究对话轮次",
        by_plan: [
          { plan_code: "shengtian-banzi-analysis-10", available: 9, reserved: 0, consumed: 1, usage_unit: "analysis_turn", usage_label: "研究对话轮次" },
        ],
      }), { status: 200 });
    }));

    try {
      // Two per-use units exist for this product; an unscoped read would return a
      // "mixed" sum. The read must carry plan_code so the balance stays per-unit.
      const usage = await fetchPlatformUsage("access-token", "csrf-token", "shengtian-banzi-analysis-10");
      expect(requestUrl).toContain("/api/v1/entitlement/products/shengtian-banzi/usage");
      expect(requestUrl).toContain("plan_code=shengtian-banzi-analysis-10");
      expect(usage.usage_unit).toBe("analysis_turn");
      expect(usage.usage_label).toBe("研究对话轮次");
      expect(usage.by_plan).toHaveLength(1);
      expect(usage.available).toBe(9);
    } finally {
      process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = previous.base;
      process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = previous.product;
      process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = previous.scope;
    }
  });
});
