import { createHmac, timingSafeEqual } from "node:crypto";
import { noStore } from "@/lib/http";
import { errorResponse } from "@/lib/api-error";
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
  if (signature === "missing-secret") return noStore({ error: "研究规则接收端未配置独立服务密钥。" }, { status: 503 });
  if (!signature) return noStore({ error: "无效的研究规则服务签名。" }, { status: 401 });
  let bundle: ResearchReleaseBundle;
  try {
    bundle = JSON.parse(rawBody) as ResearchReleaseBundle;
  } catch {
    // The engine's own syntax message is English, position-dependent, and part
    // of no contract, so it is replaced rather than echoed.
    return noStore({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    // `JSON.parse("null")` succeeds, and reading a field off it would surface as
    // a `TypeError` this route would then have to record as an internal failure
    // instead of the bad request it is.
    return noStore({ error: "请求体不是合法的研究发布 bundle。" }, { status: 400 });
  }
  try {
    const release = await stageResearchRuleRelease(bundle);
    return noStore({ receipt_contract_version: "qmdj-research-receipt-v1", status: release.status, release });
  } catch (error) {
    // A bundle the validator or the hash check rejected is the caller's problem
    // and carries a deliberate sentence (see `stageResearchRuleRelease`);
    // anything else — a database or network failure — collapses to the fallback
    // and is recorded instead of echoed.
    return errorResponse(error, "无法暂存研究规则。", 400);
  }
}
