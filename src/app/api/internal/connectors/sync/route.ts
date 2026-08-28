import { NextResponse } from "next/server";
import { recordConnectorSync, CONNECTOR_PROVIDERS } from "@/lib/platform/connectors";
import type { AccountSubject } from "@/lib/agent/account-subject";

const isSecretValid = (request: Request) => {
  const expected = process.env.QMDJ_CONNECTOR_SYNC_SECRET?.trim();
  return Boolean(expected && request.headers.get("x-qmdj-connector-secret") === expected);
};
const asText = (value: unknown, max: number) => typeof value === "string" && value.trim() && value.length <= max ? value.trim() : null;
const isDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(new Date(value).getTime());
const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(request: Request) {
  try {
    if (!isSecretValid(request)) return NextResponse.json({ error:"连接器同步未授权。" }, { status:401 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const subjectType = asText(body?.subjectType, 32);
    const subjectId = asText(body?.subjectId, 128);
    const provider = body?.provider;
    const idempotencyKey = asText(body?.idempotencyKey, 160);
    const sourceTitle = asText(body?.sourceTitle, 200);
    const detectedAnomaly = asText(body?.detectedAnomaly, 12000);
    const severity = body?.severity;
    const observedAt = body?.observedAt;
    const draft = body?.suggestedBattlefieldDraft;
    if (!subjectType || !subjectId || !idempotencyKey || typeof provider !== "string" || !CONNECTOR_PROVIDERS.includes(provider as never) || !sourceTitle || !detectedAnomaly || !["CRITICAL","WARNING","INFO"].includes(String(severity)) || !isDate(observedAt) || !draft || typeof draft !== "object" || Array.isArray(draft) || body?.connectorId !== undefined && body.connectorId !== null && !isUuid(body.connectorId)) return NextResponse.json({ error:"连接器同步记录字段无效。" }, { status:400 });
    const draftRecord = draft as Record<string, unknown>;
    const title = asText(draftRecord.title, 200);
    const dilemma = asText(draftRecord.dilemma, 6000);
    const deadlineDays = draftRecord.deadlineDays;
    const initialConfidence = draftRecord.initialConfidence;
    if (!title || !dilemma || typeof deadlineDays !== "number" || !Number.isFinite(deadlineDays) || deadlineDays < 1 || deadlineDays > 3650 || typeof initialConfidence !== "number" || !Number.isFinite(initialConfidence) || initialConfidence < 0 || initialConfidence > 100) return NextResponse.json({ error:"连接器草稿字段无效。" }, { status:400 });
    const recorded = await recordConnectorSync({ subject:{ subjectType, subjectId } as AccountSubject, provider:provider as never, idempotencyKey, connectorId:typeof body?.connectorId === "string" ? body.connectorId : null, sourceTitle, detectedAnomaly, severity:severity as never, observedAt:new Date(observedAt).toISOString(), suggestedBattlefieldDraft:{ title, dilemma, deadlineDays, initialConfidence }, metadata:body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {} });
    return recorded ? NextResponse.json({ recorded:true }, { status:201 }) : NextResponse.json({ error:"连接器未处于已授权状态，或同步记录已存在。", reasonCode:"connector_not_authorized_or_duplicate" }, { status:409 });
  } catch { return NextResponse.json({ error:"写入连接器同步记录失败。" }, { status:500 }); }
}
