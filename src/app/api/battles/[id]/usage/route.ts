import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { getBattle } from "@/lib/battle/repository";
import { getModuleState } from "@/lib/battle/product-state";
import { beginUsageOperation, finishUsageOperation, failUsageOperation, hashSnapshot, markUsageOperationCharged, saveModuleState, setUsageOperationReservation } from "@/lib/battle/product-state";
import { getArchonProgress } from "@/lib/battle/extended-repository";
import { asRecord, asText, isUuid } from "@/lib/battle/input";
import { validateBattleModuleState } from "@/lib/battle/module-contract";
import { readBearerToken, readCookieValue, readPlatformCookieHeader, fetchPlatformGate, reservePlatformUsage, commitPlatformUsage, releasePlatformUsage, AGENT_PLAN_CODE } from "@/lib/platform/server";
import { getOfficialCatalogEntry, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

const operations = new Set(["world_pulse_intervention", "deep_archive_unlock", "reality_echo_resolution", "conclave_action", "archon_proposal", "archon_annotation", "breakthrough_activation", "template_activation"]);
const operationModules: Record<string,string> = { world_pulse_intervention:"world-pulse", deep_archive_unlock:"deep-archives", reality_echo_resolution:"reality-echoes", conclave_action:"observer-conclaves", archon_proposal:"archon-tier", archon_annotation:"archon-tier", breakthrough_activation:"battlefield-aux", template_activation:"marketplace" };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let reservationId = "";
  let operationRecord: { operationId:string; status:string; usage:unknown; reservationId:string|null; errorMessage:string|null; reused:boolean } | null = null;
  let platformCommitted = false;
  let commitAttempted = false;
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const subject = await requireAccountSubject(request);
    if (!await getBattle(subject, id)) return NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const operation = asText(body?.operation, 80);
    const idempotencyKey = asText(body?.idempotencyKey, 160);
    if (!operation || !operations.has(operation) || !idempotencyKey) return NextResponse.json({ error: "权益操作参数无效。" }, { status: 400 });
    const templateId = operation === "template_activation" ? asText(body?.templateId, 120) : null;
    if (operation === "template_activation" && (!templateId || !await getOfficialCatalogEntry(OFFICIAL_CATALOG_TYPES.skillTemplate, templateId))) {
      return NextResponse.json({ error: "模板不在官方目录中。" }, { status: 404 });
    }
    let moduleUpdate = asRecord(body?.moduleUpdate);
    if (operation === "template_activation" && templateId && !moduleUpdate) {
      const current = await getModuleState(subject, id, "marketplace");
      const currentIds = Array.isArray(current?.state?.ownedTemplateIds) ? current.state.ownedTemplateIds.filter((value): value is string => typeof value === "string") : [];
      moduleUpdate = { moduleId: "marketplace", state: { ownedTemplateIds: Array.from(new Set([...currentIds, templateId])) }, consent: { source: "platform_entitlement" } };
    }
    const moduleId = moduleUpdate ? asText(moduleUpdate.moduleId,64) : null;
    const moduleState = moduleUpdate ? asRecord(moduleUpdate.state) : null;
    const moduleConsent = moduleUpdate ? asRecord(moduleUpdate.consent) ?? {} : {};
    if (moduleUpdate && (moduleId !== operationModules[operation] || !moduleState)) return NextResponse.json({ error:"权益操作与模块状态不匹配。" }, { status:400 });
    if (moduleState) {
      const validationError = validateBattleModuleState(moduleId!,moduleState);
      if (validationError) return NextResponse.json({ error:validationError,reasonCode:"module_state_invalid" }, { status:400 });
    }
    if (operation === "archon_proposal" || operation === "archon_annotation") {
      const progress = await getArchonProgress(subject);
      const allowed = operation === "archon_proposal" ? progress.privileges.realityProposal : progress.privileges.archiveAnnotation;
      if (!allowed) return NextResponse.json({ error: operation === "archon_proposal" ? "尚未达到现实提案所需的执政官位阶。" : "尚未达到档案批注所需的执政官位阶。", reasonCode:"archon_rank_required", archonProgress:progress }, { status:403 });
    }
    const payloadHash = hashSnapshot({ operation,moduleId,moduleState,moduleConsent });
    operationRecord = await beginUsageOperation(subject, id, operation, idempotencyKey, payloadHash);
    if (!operationRecord) return NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
    if (operationRecord.reused) {
      if (operationRecord.status === 'succeeded') return NextResponse.json({ operation, idempotencyKey, usage: operationRecord.usage, reused: true });
      if (operationRecord.status !== 'charged' && !(operationRecord.status === 'pending' && operationRecord.reservationId)) return NextResponse.json({ error: operationRecord.status === 'pending' ? "相同权益操作正在处理中，请稍候。" : operationRecord.errorMessage || "幂等请求冲突。" }, { status:409 });
    }
    let usage = operationRecord.usage;
    if (operationRecord.status !== 'charged') {
      const accessToken = readBearerToken(request.headers.get("authorization"));
      const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
      const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
      const platformOptions = accessToken ? { planCode: AGENT_PLAN_CODE } : { planCode: AGENT_PLAN_CODE, cookieHeader, csrfToken };
      if (!operationRecord.reservationId) {
        const gate = await fetchPlatformGate(accessToken, accessToken ? undefined : { cookieHeader, csrfToken });
        if (!gate.allowed) {
          await failUsageOperation(subject, id, operationRecord.operationId, gate.message || "当前账户没有可用权益。");
          return NextResponse.json({ error: gate.message || "当前账户没有可用权益。", reasonCode: gate.reason_code }, { status: 402 });
        }
      }
      reservationId = operationRecord.reservationId ?? "";
      if (!reservationId) {
        const reservation = accessToken ? await reservePlatformUsage(accessToken, platformOptions) : await reservePlatformUsage(null, platformOptions);
        reservationId = reservation.reservation_id;
        if (!reservationId) throw new Error("平台没有返回权益预留号。");
        if (!await setUsageOperationReservation(subject,id,operationRecord.operationId,reservationId)) throw new Error("权益预留恢复记录写入失败。");
        operationRecord.reservationId = reservationId;
      }
      commitAttempted = true;
      usage = accessToken ? await commitPlatformUsage(accessToken, reservationId, platformOptions) : await commitPlatformUsage(null, reservationId, platformOptions);
      platformCommitted = true;
      reservationId = "";
      if (!await markUsageOperationCharged(subject,id,operationRecord.operationId,usage)) throw new Error("权益已确认，但业务恢复记录写入失败，请使用相同操作重试。");
      operationRecord.status = 'charged';
      operationRecord.usage = usage;
    }
    let moduleResult = null;
    if (moduleId && moduleState) {
      moduleResult = await saveModuleState(subject,id,moduleId,moduleState,moduleConsent);
      if (!moduleResult) throw new Error("权益已确认，但模块状态保存失败，请使用相同操作重试。");
    }
    if (!await finishUsageOperation(subject, id, operationRecord.operationId, usage)) throw new Error("业务已执行，但恢复记录完成失败，请使用相同操作重试。");
    return NextResponse.json({ operation, idempotencyKey, usage, module:moduleResult, reused:operationRecord.reused });
  } catch (error) {
    if (reservationId && !commitAttempted) {
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
        const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
        const options = accessToken ? { planCode: AGENT_PLAN_CODE } : { planCode: AGENT_PLAN_CODE, cookieHeader, csrfToken };
        if (accessToken) await releasePlatformUsage(accessToken, reservationId, options); else await releasePlatformUsage(null, reservationId, options);
      } catch { /* preserve original error */ }
    }
    if (operationRecord && !platformCommitted && !commitAttempted && operationRecord.status === 'pending') {
      try { await failUsageOperation(await requireAccountSubject(request), (await context.params).id, operationRecord.operationId, error instanceof Error ? error.message : "权益操作失败。"); } catch { /* preserve original error */ }
    }
    const message = error instanceof Error ? error.message : "权益操作失败。";
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: message }, { status: 500 });
  }
}
