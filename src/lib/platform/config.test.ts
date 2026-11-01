import { describe, expect, it } from "vitest";
import {
  requirePlatformServerConfig,
  resolvePlatformClientConfig,
  resolvePlatformServerConfig,
} from "./config";

describe("platform config", () => {
  it("keeps platform API coordinates from the product contract but requires a registered client ID", () => {
    expect(resolvePlatformClientConfig({})).toEqual({
      baseUrl: "https://platform.singseq.com",
      productCode: "qimen",
      clientId: "8766d44c460e495994ec6f2011cfcbf2",
    });
    expect(resolvePlatformClientConfig({ NEXT_PUBLIC_PLATFORM_OAUTH_CLIENT_ID: "registered-qimen" })).toMatchObject({ clientId: "registered-qimen" });
  });

  it("resolves public client configuration from env", () => {
    expect(
      resolvePlatformClientConfig({
        NEXT_PUBLIC_PLATFORM_BASE_URL: "https://platform.example.com/",
        NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: "qmdj-pro",
      }),
    ).toEqual({
      baseUrl: "https://platform.example.com",
      productCode: "qmdj-pro",
      clientId: "8766d44c460e495994ec6f2011cfcbf2",
    });
  });

  it("prefers server env values when present", () => {
    expect(
      resolvePlatformServerConfig({
        PLATFORM_BASE_URL: "https://internal.example.com/",
        PLATFORM_PRODUCT_CODE: "server-product",
        NEXT_PUBLIC_PLATFORM_BASE_URL: "https://public.example.com/",
        NEXT_PUBLIC_PLATFORM_PRODUCT_CODE: "public-product",
      }),
    ).toEqual({
      baseUrl: "https://internal.example.com",
      productCode: "server-product",
      clientId: "8766d44c460e495994ec6f2011cfcbf2",
    });
  });

  it("throws when required server config is missing", () => {
    expect(() => requirePlatformServerConfig({})).toThrow(/缺少平台服务端配置/);
  });
});
