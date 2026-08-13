import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { stageResearchRuleRelease } from "@/lib/bazi/research-rule-repository";
import type { ResearchReleaseBundle } from "@/lib/bazi/research-rules";

const MAX_CLOCK_SKEW_SECONDS = 300;

const verifySignature = (request: Request, rawBody: string) => {
  const secret = process.env.BAZI_RESEARCH_INTERNAL_SECRET?.trim();
  if (!secret) return "missing-secret" as const;
  const timestamp = request.headers.get("x-ss-bazi-research-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-ss-bazi-research-signature")?.trim() ?? "";
  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = verifySignature(request, rawBody);
  if (signature === "missing-secret") return NextResponse.json({ error: "研究规则接收端未配置独立服务密钥。" }, { status: 503 });
  if (!signature) return NextResponse.json({ error: "无效的研究规则服务签名。" }, { status: 401 });
  try {
    const bundle = JSON.parse(rawBody) as ResearchReleaseBundle;
    const release = await stageResearchRuleRelease(bundle);
    return NextResponse.json({ receipt_contract_version: "qmdj-research-receipt-v1", status: release.status, release });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法暂存研究规则。" }, { status: 400 });
  }
}
