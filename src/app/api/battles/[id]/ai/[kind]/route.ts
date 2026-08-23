import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { loadBattleInput } from "@/lib/battle/service";
import { createAiJob, failAiJob, finishAiJob, getAiJob, startAiJob } from "@/lib/battle/product-state";
import { requestAgentAnalysis } from "@/lib/agent/chat";
import { isUuid, asText } from "@/lib/battle/input";
import { readBearerToken, readCookieValue, readPlatformCookieHeader, fetchPlatformGate, reservePlatformUsage, commitPlatformUsage, releasePlatformUsage, AGENT_PLAN_CODE } from "@/lib/platform/server";

const kinds = new Set(["interview", "cards", "red-team", "breakthrough", "review"]);
const normalizeKind = (value: string) => value === "red-team" ? "red_team" : value;
const parseStructured = (value: string) => {
  try { const parsed = JSON.parse(value.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()); return parsed && typeof parsed === "object" ? parsed : { analysis: value }; }
  catch { return { analysis: value }; }
};

export async function handleAiPost(request: Request, context: { params: Promise<{ id:string; kind?:string }> }, forcedKind?: string) {
  let reservationId = "";
  try {
    const { id, kind: routeKind } = await context.params;
    const rawKind = forcedKind ?? routeKind ?? "";
    if (!isUuid(id) || !kinds.has(rawKind)) return NextResponse.json({ error:"AI 能力标识无效。" }, { status:400 });
    const kind = normalizeKind(rawKind);
    const subject = await requireAccountSubject(request);
    const loaded = await loadBattleInput(subject, id);
    if (!loaded) return NextResponse.json({ error:"战局不存在。" }, { status:404 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const idempotencyKey = asText(body?.idempotencyKey, 160) || `${kind}:${Date.now()}`;
    const input = { battle: loaded.battle, input: loaded.input, request: body ?? {} };
    const created = await createAiJob(subject, id, kind, idempotencyKey, input, "battle-v1");
    if (!created) return NextResponse.json({ error:"战局无权访问。" }, { status:403 });
    if (created.reused) return NextResponse.json({ job: await getAiJob(subject,id,created.jobId) });
    await startAiJob(subject,id,created.jobId);
    const accessToken = readBearerToken(request.headers.get("authorization"));
    const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
    const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
    const gate = await fetchPlatformGate(accessToken, accessToken ? undefined : { cookieHeader, csrfToken });
    if (!gate.allowed) { await failAiJob(subject,id,created.jobId,"entitlement_gate_blocked",gate.message || "当前账户没有推演权益。"); return NextResponse.json({ error:gate.message || "当前账户没有推演权益。", reasonCode:gate.reason_code }, { status:402 }); }
    const reservation = accessToken ? await reservePlatformUsage(accessToken,{planCode:AGENT_PLAN_CODE}) : await reservePlatformUsage(null,{planCode:AGENT_PLAN_CODE,cookieHeader,csrfToken});
    reservationId = reservation.reservation_id;
    const question = asText(body?.question, 6000) || `请完成 ${kind} 模式的结构化现实推演。只返回合法 JSON，字段应包含 summary、facts、risks、actions、verificationSignals、stopConditions。`;
    const result = await requestAgentAnalysis({ mode:"research", researchTool:"battle", focus:kind, question, structuredText:JSON.stringify(input), jsonPayload:JSON.stringify(input), analysisProduct:"agent" });
    const structured = parseStructured(result.content);
    await finishAiJob(subject,id,created.jobId,structured,result.model);
    const usage = accessToken ? await commitPlatformUsage(accessToken,reservationId,{planCode:AGENT_PLAN_CODE}) : await commitPlatformUsage(null,reservationId,{planCode:AGENT_PLAN_CODE,cookieHeader,csrfToken});
    reservationId = "";
    return NextResponse.json({ job: await getAiJob(subject,id,created.jobId), usage });
  } catch (error) {
    if (reservationId) { try { const token=readBearerToken(request.headers.get("authorization")); const cookieHeader=readPlatformCookieHeader(request.headers.get("cookie")); const csrfToken=readCookieValue(request.headers.get("cookie"),"ssp_csrf"); if (token) await releasePlatformUsage(token,reservationId,{planCode:AGENT_PLAN_CODE}); else await releasePlatformUsage(null,reservationId,{planCode:AGENT_PLAN_CODE,cookieHeader,csrfToken}); } catch {} }
    return error instanceof AccountSubjectError ? NextResponse.json({error:error.message},{status:error.status}) : NextResponse.json({error:error instanceof Error ? error.message : "AI 推演失败。"},{status:500});
  }
}

export async function POST(request: Request, context: { params: Promise<{ id:string; kind:string }> }) {
  return handleAiPost(request, context);
}
