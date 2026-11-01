import { describe, expect, it } from "vitest";
import {
  requirePlatformServerConfig,
  resolvePlatformClientConfig,
  resolvePlatformServerConfig,
} from "./config";

describe("platform config", () => {
  it("uses the checked-in product contract when public build env is absent", () => {
    expect(resolvePlatformClientConfig({})).toEqual({
      baseUrl: "https://platform.singseq.com",
      productCode: "qimen",
      accessScope: "qimen-core",
    });
  });

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
    });
  });

  it("throws when required server config is missing", () => {
    expect(() => requirePlatformServerConfig({})).toThrow(/缺少平台服务端配置/);
  });
});
