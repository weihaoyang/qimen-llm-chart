import { createHmac, timingSafeEqual } from "node:crypto";
import { noStore } from "@/lib/http";
import { errorResponse } from "@/lib/api-error";
import { rollbackResearchRuleRelease } from "@/lib/bazi/research-rule-repository";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.BAZI_RESEARCH_INTERNAL_SECRET?.trim();
  const timestamp = request.headers.get("x-ss-bazi-research-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-ss-bazi-research-signature")?.trim() ?? "";
  const numeric = Number(timestamp);
  const expected = secret ? createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex") : "";
  if (!secret || !timestamp || !Number.isFinite(numeric) || Math.abs(Date.now() / 1000 - numeric) > 300 || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return noStore({ error: "无效的研究规则服务签名。" }, { status: 401 });
  }
  try {
    const release = await rollbackResearchRuleRelease();
    return noStore({ receipt_contract_version: "qmdj-research-receipt-v1", status: release?.status ?? "base", release });
  } catch (error) {
    // This path has no deliberate rejection message — the callee either rolls
    // back or returns null — so the old inline form could only ever echo a raw
    // database failure. Collapse it and record the cause instead.
    return errorResponse(error, "无法回滚研究规则。", 409);
  }
}
