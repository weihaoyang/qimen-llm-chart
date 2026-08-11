import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccountCheckout, createGuestCheckout, parsePlatformCallbackFragment, redeemInvitationCode, toPlatformSession } from "./browser";

describe("platform browser helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

    await createAccountCheckout("account-token", "shengtian-banzi-analysis-10", "alipay", "https://qmdj.example.com/billing/result");
    await createGuestCheckout("shengtian-banzi-analysis-10", "alipay");

    const accountBody = JSON.parse(requests[0]?.body ?? "{}");
    const guestBody = JSON.parse(requests[2]?.body ?? "{}");
    expect(accountBody.idempotency_key.length).toBeGreaterThanOrEqual(32);
    expect(guestBody.idempotency_key.length).toBeGreaterThanOrEqual(32);
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
});
