import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { loadBattleInput } from "@/lib/battle/service";
import { claimAiJobCommit, createAiJob, failAiJob, finishAiJob, getAiJob, startAiJob, hashSnapshot, listActiveMemorySummaries } from "@/lib/battle/product-state";
import { requestAgentAnalysis } from "@/lib/agent/chat";
import { isUuid, asText } from "@/lib/battle/input";
import { readBearerToken, readCookieValue, readPlatformCookieHeader, fetchPlatformGate, reservePlatformUsage, commitPlatformUsage, releasePlatformUsage, AGENT_PLAN_CODE } from "@/lib/platform/server";
import { replaceInventory } from "@/lib/battle/repository";
import { createAdvice, createReview } from "@/lib/battle/extended-repository";
import { parseBattleAiJson, validateBattleAiResult, type BattleAiKind } from "@/lib/battle/ai-contract";

const kinds = new Set(["interview", "cards", "red-team", "breakthrough", "review"]);
const normalizeKind = (value: string) => value === "red-team" ? "red_team" : value;
const asArray = (value: unknown) => Array.isArray(value) ? value : [];

export async function handleAiPost(request: Request, context: { params: Promise<{ id:string; kind?:string }> }, forcedKind?: string) {
  let reservationId = "";
  let jobId = "";
  let runToken = "";
  let jobSubject: Awaited<ReturnType<typeof requireAccountSubject>> | null = null;
  try {
    const { id, kind: routeKind } = await context.params;
    const rawKind = forcedKind ?? routeKind ?? "";
    if (!isUuid(id) || !kinds.has(rawKind)) return NextResponse.json({ error:"AI 能力标识无效。" }, { status:400 });
    const kind = normalizeKind(rawKind);
    const subject = await requireAccountSubject(request);
    jobSubject = subject;
    const loaded = await loadBattleInput(subject, id);
    if (!loaded) return NextResponse.json({ error:"战局不存在。" }, { status:404 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const authorizedMemories = await listActiveMemorySummaries(subject);
    const input = { battle: loaded.battle, input: loaded.input, authorizedMemories, request: body ?? {} };
    const idempotencyKey = asText(body?.idempotencyKey, 160) || `auto:${kind}:${hashSnapshot(input)}`;
    const created = await createAiJob(subject, id, kind, idempotencyKey, input, "battle-v1");
    if (!created) return NextResponse.json({ error:"战局无权访问。" }, { status:403 });
    jobId = created.jobId;
    runToken = created.runToken;
    if (created.reused) return NextResponse.json({ job: await getAiJob(subject,id,created.jobId) });
    await startAiJob(subject,id,created.jobId,runToken);
    const accessToken = readBearerToken(request.headers.get("authorization"));
    const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
    const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
    const gate = await fetchPlatformGate(accessToken, accessToken ? undefined : { cookieHeader, csrfToken });
    if (!gate.allowed) { await failAiJob(subject,id,created.jobId,runToken,"entitlement_gate_blocked",gate.message || "当前账户没有推演权益。"); return NextResponse.json({ error:gate.message || "当前账户没有推演权益。", reasonCode:gate.reason_code }, { status:402 }); }
    const reservation = accessToken ? await reservePlatformUsage(accessToken,{planCode:AGENT_PLAN_CODE}) : await reservePlatformUsage(null,{planCode:AGENT_PLAN_CODE,cookieHeader,csrfToken});
    reservationId = reservation.reservation_id;
    const question = asText(body?.question, 6000) || `请完成 ${kind} 模式的结构化现实推演。只返回合法 JSON，字段应包含 summary、facts、risks、actions、verificationSignals、stopConditions。`;
    const result = await requestAgentAnalysis({ mode:"research", researchTool:"battle", focus:kind, question, structuredText:JSON.stringify(input), jsonPayload:JSON.stringify(input), analysisProduct:"agent" });
    const parsedStructured = parseBattleAiJson(result.content);
    const schemaError = validateBattleAiResult(kind as BattleAiKind, parsedStructured);
    if (schemaError) {
      await failAiJob(subject, id, created.jobId, runToken, "invalid_structured_output", schemaError);
      throw new Error(schemaError);
    }
    const structured = parsedStructured as Record<string, unknown>;
    // Atomically claim the commit phase before writing any business state.
    // A timed-out/retried run has a different token and cannot pass this gate.
    if (!await claimAiJobCommit(subject, id, created.jobId, runToken)) throw new Error("AI 任务已超时或被终止，未应用模型结果。");
    if (kind === "cards") {
      const cards = asArray(structured.cards ?? structured.assets).map((item, index) => {
        const card = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { category: card.category === "FINANCIAL" ? "cash" : card.category === "TIME" ? "time" : card.category === "INFO" ? "information" : "asset", label: String(card.title ?? card.label ?? `AI 底牌 ${index + 1}`).slice(0, 160), description: String(card.description ?? card.content ?? "AI 生成底牌，待用户核验。").slice(0, 6000), quantity: typeof card.numericValue === "number" ? card.numericValue : null, unit: typeof card.unit === "string" ? card.unit : null, availability: "available" as const, expiresAt: null, cost: {}, evidence: { source: "ai", jobId: created.jobId } };
      });
      if (cards.length) await replaceInventory(subject, id, cards as Parameters<typeof replaceInventory>[2]);
    }
    if (kind === "red_team" || kind === "breakthrough") {
      const opinion = String(structured.critique ?? structured.summary ?? structured.analysis ?? "AI 已完成结构化推演，请人工审查。");
      await createAdvice(subject, id, { targetType: "battle", targetId: null, opinion, rationale: JSON.stringify(structured).slice(0, 12000), uncertainty: "AI 输出必须由用户确认后才进入事实或行动。", source: { jobId: created.jobId, kind } });
    }
    if (kind === "review") {
      await createReview(subject, id, { commitmentId: null, outcome: String(structured.summary), facts: String(structured.facts), whatChanged: String(structured.whatChanged), diagnosis: (structured.diagnosis && typeof structured.diagnosis === "object" && !Array.isArray(structured.diagnosis)) ? structured.diagnosis as Record<string, unknown> : {}, nextAdjustment: String(structured.nextAdjustment) }, `ai-job:${created.jobId}`);
    }
    const finished = await finishAiJob(subject,id,created.jobId,runToken,structured,result.model);
    if (!finished) throw new Error("AI 任务已超时或不再处于可提交状态，未扣减本次权益。");
    const usage = accessToken ? await commitPlatformUsage(accessToken,reservationId,{planCode:AGENT_PLAN_CODE}) : await commitPlatformUsage(null,reservationId,{planCode:AGENT_PLAN_CODE,cookieHeader,csrfToken});
    reservationId = "";
    return NextResponse.json({ job: await getAiJob(subject,id,created.jobId), usage });
  } catch (error) {
    if (jobSubject && jobId && runToken) { try { await failAiJob(jobSubject, (await context.params).id, jobId, runToken, "ai_request_failed", error instanceof Error ? error.message : "AI 推演失败。"); } catch {} }
    if (reservationId) { try { const token=readBearerToken(request.headers.get("authorization")); const cookieHeader=readPlatformCookieHeader(request.headers.get("cookie")); const csrfToken=readCookieValue(request.headers.get("cookie"),"ssp_csrf"); if (token) await releasePlatformUsage(token,reservationId,{planCode:AGENT_PLAN_CODE}); else await releasePlatformUsage(null,reservationId,{planCode:AGENT_PLAN_CODE,cookieHeader,csrfToken}); } catch {} }
    return error instanceof AccountSubjectError ? NextResponse.json({error:error.message},{status:error.status}) : NextResponse.json({error:error instanceof Error ? error.message : "AI 推演失败。"},{status:500});
  }
}

export async function POST(request: Request, context: { params: Promise<{ id:string; kind:string }> }) {
  return handleAiPost(request, context);
}
