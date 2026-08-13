import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { stageMock } = vi.hoisted(() => ({ stageMock: vi.fn() }));
vi.mock("@/lib/bazi/research-rule-repository", () => ({ stageResearchRuleRelease: stageMock }));

import { POST } from "./route";

const SECRET = "separate-research-secret-0123456789";
const bundle = { release_contract_version: "bazi-research-release-v1", experiment_id: "a".repeat(32), rule_hash: "b".repeat(64), base_prediction_version: "bazi-v3", rule_definition: { dsl_version: "bazi-axis-rule-v1", rules: [] }, validation_metrics: {}, published_at_iso: "2026-08-13T00:00:00Z" };
const request = (body = bundle, sign = true) => {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return new Request("http://localhost/api/internal/research/rules", { method: "POST", body: raw, headers: sign ? {
    "X-SS-Bazi-Research-Timestamp": timestamp,
    "X-SS-Bazi-Research-Signature": createHmac("sha256", SECRET).update(`${timestamp}.${raw}`).digest("hex"),
  } : {} });
};

describe("qmdj research release receiver", () => {
  beforeEach(() => { process.env.BAZI_RESEARCH_INTERNAL_SECRET = SECRET; stageMock.mockReset(); });

  it("rejects unsigned bundles before persistence", async () => {
    expect((await POST(request(bundle, false))).status).toBe(401);
    expect(stageMock).not.toHaveBeenCalled();
  });

  it("returns an auditable staging receipt", async () => {
    stageMock.mockResolvedValue({ ruleHash: bundle.rule_hash, status: "staged" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ receipt_contract_version: "qmdj-research-receipt-v1", status: "staged" }));
  });
});
