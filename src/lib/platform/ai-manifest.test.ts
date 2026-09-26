import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_PLAN_CODE, KLINE_PLAN_CODE } from "./contracts";

describe("AI product manifest", () => {
  it("matches the registered product contract and capability plan codes", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "config/ai-product-manifest.json"), "utf8")) as {
      platform_api_origin: string;
      oauth_authorize_url: string;
      product_code: string;
      access_scope: string;
      capabilities: Record<string, { plan_code: string }>;
    };
    expect(manifest.platform_api_origin).toBe("https://api.singseq.com");
    expect(manifest.oauth_authorize_url).toBe("https://singseq.com/oauth/authorize");
    expect(manifest.product_code).toBe("shengtian-banzi");
    expect(manifest.access_scope).toBe("shengtian-banzi-core");
    expect(manifest.capabilities.agent.plan_code).toBe(AGENT_PLAN_CODE);
    expect(manifest.capabilities.kline.plan_code).toBe(KLINE_PLAN_CODE);
  });
});
