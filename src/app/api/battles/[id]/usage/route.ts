import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { getBattle } from "@/lib/battle/repository";
import { beginUsageOperation, finishUsageOperation, failUsageOperation } from "@/lib/battle/product-state";
import { asText, isUuid } from "@/lib/battle/input";
import { readBearerToken, readCookieValue, readPlatformCookieHeader, fetchPlatformGate, reservePlatformUsage, commitPlatformUsage, releasePlatformUsage, AGENT_PLAN_CODE } from "@/lib/platform/server";

const operations = new Set(["world_pulse_intervention", "deep_archive_unlock", "reality_echo_resolution", "conclave_action"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let reservationId = "";
  let operationRecord: { operationId: string; status: string; usage: unknown; errorMessage: string | null; reused: boolean } | null = null;
  let platformCommitted = false;
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const subject = await requireAccountSubject(request);
    if (!await getBattle(subject, id)) return NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const operation = asText(body?.operation, 80);
    const idempotencyKey = asText(body?.idempotencyKey, 160);
    if (!operation || !operations.has(operation) || !idempotencyKey) return NextResponse.json({ error: "权益操作参数无效。" }, { status: 400 });
    operationRecord = await beginUsageOperation(subject, id, operation, idempotencyKey);
    if (!operationRecord) return NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
    if (operationRecord.reused) {
      if (operationRecord.status === 'succeeded') return NextResponse.json({ operation, idempotencyKey, usage: operationRecord.usage, reused: true });
      return NextResponse.json({ error: operationRecord.status === 'pending' ? "相同权益操作正在处理中，请稍候。" : operationRecord.errorMessage || "该权益操作已失败，请使用新的请求重试。" }, { status: operationRecord.status === 'pending' ? 409 : 402 });
    }
    const accessToken = readBearerToken(request.headers.get("authorization"));
    const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
    const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
    const platformOptions = accessToken ? { planCode: AGENT_PLAN_CODE } : { planCode: AGENT_PLAN_CODE, cookieHeader, csrfToken };
    const gate = await fetchPlatformGate(accessToken, accessToken ? undefined : { cookieHeader, csrfToken });
    if (!gate.allowed) {
      await failUsageOperation(subject, id, operationRecord.operationId, gate.message || "当前账户没有可用权益。");
      return NextResponse.json({ error: gate.message || "当前账户没有可用权益。", reasonCode: gate.reason_code }, { status: 402 });
    }
    const reservation = accessToken ? await reservePlatformUsage(accessToken, platformOptions) : await reservePlatformUsage(null, platformOptions);
    reservationId = reservation.reservation_id;
    if (!reservationId) throw new Error("平台没有返回权益预留号。");
    const usage = accessToken ? await commitPlatformUsage(accessToken, reservationId, platformOptions) : await commitPlatformUsage(null, reservationId, platformOptions);
    platformCommitted = true;
    reservationId = "";
    await finishUsageOperation(subject, id, operationRecord.operationId, usage);
    return NextResponse.json({ operation, idempotencyKey, usage });
  } catch (error) {
    if (reservationId) {
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
        const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
        const options = accessToken ? { planCode: AGENT_PLAN_CODE } : { planCode: AGENT_PLAN_CODE, cookieHeader, csrfToken };
        if (accessToken) await releasePlatformUsage(accessToken, reservationId, options); else await releasePlatformUsage(null, reservationId, options);
      } catch { /* preserve original error */ }
    }
    if (operationRecord && !platformCommitted && operationRecord.status === 'pending') {
      try { await failUsageOperation(await requireAccountSubject(request), (await context.params).id, operationRecord.operationId, error instanceof Error ? error.message : "权益操作失败。"); } catch { /* preserve original error */ }
    }
    const message = error instanceof Error ? error.message : "权益操作失败。";
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: message }, { status: 500 });
  }
}
