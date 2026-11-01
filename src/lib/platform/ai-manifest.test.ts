import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_USAGE_METRIC, KLINE_USAGE_METRIC } from "./contracts";

describe("AI product manifest", () => {
  it("matches the registered product contract and capability plan codes", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "config/ai-product-manifest.json"), "utf8")) as {
      platform_api_origin: string;
      product_code: string;
      oauth_client_id: string;
      capabilities: Record<string, { metric: string; usage_unit: string; usage_label: string }>;
    };
    expect(manifest.platform_api_origin).toBe("https://platform.singseq.com");
    expect(manifest.product_code).toBe("qimen");
    expect(manifest.oauth_client_id).toBe("8766d44c460e495994ec6f2011cfcbf2");
    expect(manifest.capabilities.agent.metric).toBe(AGENT_USAGE_METRIC);
    expect(manifest.capabilities.kline.metric).toBe(KLINE_USAGE_METRIC);
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
