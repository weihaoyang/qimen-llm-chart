import { createHmac, timingSafeEqual } from "node:crypto";
import { noStore } from "@/lib/http";
import { errorResponse } from "@/lib/api-error";
import { activateResearchRuleRelease } from "@/lib/bazi/research-rule-repository";

const verify = (request: Request, rawBody: string) => {
  const secret = process.env.BAZI_RESEARCH_INTERNAL_SECRET?.trim();
  const timestamp = request.headers.get("x-ss-bazi-research-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-ss-bazi-research-signature")?.trim() ?? "";
  const numeric = Number(timestamp);
  if (!secret || !timestamp || !Number.isFinite(numeric) || Math.abs(Date.now() / 1000 - numeric) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export async function POST(request: Request, context: { params: Promise<{ ruleHash: string }> }) {
  const rawBody = await request.text();
  if (!verify(request, rawBody)) return noStore({ error: "无效的研究规则服务签名。" }, { status: 401 });
  const { ruleHash } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(ruleHash)) return noStore({ error: "规则哈希无效。" }, { status: 400 });
  try {
    const release = await activateResearchRuleRelease(ruleHash);
    return noStore({ receipt_contract_version: "qmdj-research-receipt-v1", status: release.status, release });
  } catch (error) {
    // "没有该暂存研究规则。" / "已退役规则不可重新激活。" are deliberate and
    // still reach the caller; a database failure now does not.
    return errorResponse(error, "无法激活研究规则。", 409);
  }
}
