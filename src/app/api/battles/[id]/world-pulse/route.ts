import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { getOfficialCatalogEntry, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";
import { asRecord, asText, isUuid } from "@/lib/battle/input";
import { listWorldPulseInterventions, recordWorldPulseIntervention } from "@/lib/scenarios/world-pulse-repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const interventions = await listWorldPulseInterventions(await requireAccountSubject(request), id);
    return interventions ? NextResponse.json({ interventions }) : NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取世界脉冲记录失败。" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const eventId = asText(body?.eventId, 160);
    const action = asText(body?.action, 120);
    const idempotencyKey = asText(body?.idempotencyKey, 160);
    const eventVersion = Number(body?.eventVersion ?? 1);
    if (!eventId || !action || !idempotencyKey || !Number.isInteger(eventVersion) || eventVersion < 1) return NextResponse.json({ error: "世界脉冲操作参数无效。" }, { status: 400 });
    const requestData = asRecord(body?.request) ?? {};
    const resultData = asRecord(body?.result) ?? {};
    if (JSON.stringify(requestData).length > 32_000 || JSON.stringify(resultData).length > 32_000) return NextResponse.json({ error: "世界脉冲操作数据过大。", reasonCode: "payload_too_large" }, { status: 413 });
    const official = await getOfficialCatalogEntry(OFFICIAL_CATALOG_TYPES.worldPulse, eventId);
    if (!official || official.version !== eventVersion) return NextResponse.json({ error: "世界脉冲事件不存在或版本已过期。", reasonCode: "catalog_version_mismatch" }, { status: 409 });
    const saved = await recordWorldPulseIntervention(await requireAccountSubject(request), id, { eventId, eventVersion, action, request: requestData, result: resultData, idempotencyKey, usageOperationId: typeof body?.usageOperationId === "string" ? body.usageOperationId : null });
    if (!saved) return NextResponse.json({ error: "战局不存在或无写入权限。" }, { status: 403 });
    if (saved === "conflict") return NextResponse.json({ error: "相同幂等键已绑定到不同的世界脉冲操作。", reasonCode: "idempotency_conflict" }, { status: 409 });
    return NextResponse.json({ intervention: saved }, { status: saved.reused ? 200 : 201 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存世界脉冲记录失败。" }, { status: 500 });
  }
}
