import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_PLAN_CODE, KLINE_PLAN_CODE } from "./contracts";

describe("AI product manifest", () => {
  it("matches the registered product contract and capability plan codes", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "config/ai-product-manifest.json"), "utf8")) as {
      platform_api_origin: string;
      product_code: string;
      access_scope: string;
      capabilities: Record<string, { plan_code: string; usage_unit: string; usage_label: string }>;
    };
    expect(manifest.platform_api_origin).toBe("https://platform.singseq.com");
    expect(manifest.product_code).toBe("qimen");
    expect(manifest.access_scope).toBe("qimen-core");
    expect(manifest.capabilities.agent.plan_code).toBe(AGENT_PLAN_CODE);
    expect(manifest.capabilities.kline.plan_code).toBe(KLINE_PLAN_CODE);
    expect(manifest.capabilities.agent.usage_unit).toBe("analysis_turn");
    expect(manifest.capabilities.kline.usage_unit).toBe("kline_report");
    expect(manifest.capabilities.kline.usage_label).toBe("K 线 AI 分析报告");
    const product = JSON.parse(readFileSync(resolve(process.cwd(), "singseq.product.json"), "utf8")) as {
      capabilities: string[];
    };
    expect(product.capabilities).not.toContain("token_usage");
    expect(product.capabilities).toContain("usage_reserve");
  });
});
