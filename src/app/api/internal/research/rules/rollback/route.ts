import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { rollbackResearchRuleRelease } from "@/lib/bazi/research-rule-repository";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.BAZI_RESEARCH_INTERNAL_SECRET?.trim();
  const timestamp = request.headers.get("x-ss-bazi-research-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-ss-bazi-research-signature")?.trim() ?? "";
  const numeric = Number(timestamp);
  const expected = secret ? createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex") : "";
  if (!secret || !timestamp || !Number.isFinite(numeric) || Math.abs(Date.now() / 1000 - numeric) > 300 || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "无效的研究规则服务签名。" }, { status: 401 });
  }
  try {
    const release = await rollbackResearchRuleRelease();
    return NextResponse.json({ receipt_contract_version: "qmdj-research-receipt-v1", status: release?.status ?? "base", release });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法回滚研究规则。" }, { status: 409 });
  }
}
