import { describe, expect, it } from "vitest";
import {
  buildPlatformSocialLoginStartUrl,
  buildPlatformUnifiedLoginUrl,
  requirePlatformServerConfig,
  resolvePlatformClientConfig,
  resolvePlatformServerConfig,
} from "./config";

describe("platform config", () => {
  it("resolves public client configuration from env", () => {
    expect(
      resolvePlatformClientConfig({
        NEXT_PUBLIC_PLATFORM_BASE_URL: "https://platform.example.com/",
        NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: "qmdj-pro",
        NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE: "ai-analysis",
      }),
    ).toEqual({
      baseUrl: "https://platform.example.com",
      productCode: "qmdj-pro",
      accessScope: "ai-analysis",
      loginUrl: undefined,
    });
  });

  it("prefers server env values when present", () => {
    expect(
      resolvePlatformServerConfig({
        PLATFORM_BASE_URL: "https://internal.example.com/",
        PLATFORM_PRODUCT_CODE: "server-product",
        PLATFORM_ACCESS_SCOPE: "server-scope",
        NEXT_PUBLIC_PLATFORM_BASE_URL: "https://public.example.com/",
        NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: "public-product",
        NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE: "public-scope",
      }),
    ).toEqual({
      baseUrl: "https://internal.example.com",
      productCode: "server-product",
      accessScope: "server-scope",
      loginUrl: undefined,
    });
  });

  it("resolves optional public unified login url", () => {
    expect(
      resolvePlatformClientConfig({
        NEXT_PUBLIC_PLATFORM_BASE_URL: "https://api.example.com/",
        NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: "qmdj-pro",
        NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE: "ai-analysis",
        NEXT_PUBLIC_PLATFORM_LOGIN_URL: "https://account.example.com/login/",
      }),
    ).toEqual({
      baseUrl: "https://api.example.com",
      productCode: "qmdj-pro",
      accessScope: "ai-analysis",
      loginUrl: "https://account.example.com/login",
    });
  });

  it("builds a social login start url with redirect parameter", () => {
    expect(
      buildPlatformSocialLoginStartUrl({
        baseUrl: "https://platform.example.com",
        provider: "wechat",
        redirectUrl: "https://qmdj.example.com/auth/platform-callback",
      }),
    ).toBe(
      "https://platform.example.com/api/v1/identity/social/wechat/start?redirect=https%3A%2F%2Fqmdj.example.com%2Fauth%2Fplatform-callback",
    );
  });

  it("builds a unified company login url with product context", () => {
    expect(
      buildPlatformUnifiedLoginUrl({
        baseUrl: "https://platform.example.com",
        loginUrl: "https://account.example.com/login",
        productCode: "shengtian-banzi",
        accessScope: "shengtian-banzi-core",
        returnUrl: "https://qmdj.example.com/auth/platform-callback",
      }),
    ).toBe(
      "https://account.example.com/login?return_url=https%3A%2F%2Fqmdj.example.com%2Fauth%2Fplatform-callback&redirect_url=https%3A%2F%2Fqmdj.example.com%2Fauth%2Fplatform-callback&product_code=shengtian-banzi&access_scope=shengtian-banzi-core",
    );
  });

  it("throws when required server config is missing", () => {
    expect(() => requirePlatformServerConfig({})).toThrow(/缺少平台服务端配置/);
  });
});
