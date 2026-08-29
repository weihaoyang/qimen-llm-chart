import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { asDate, asRecord, asText, isUuid } from "@/lib/battle/input";
import { listWorldPulseObservations, recordWorldPulseObservation } from "@/lib/scenarios/world-pulse-observation-repository";

type Context = { params: Promise<{ id: string }> };
const keyPattern = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,159}$/;
const typePattern = /^[a-z][a-z0-9_-]{0,63}$/;
const sourcePattern = /^[a-z][a-z0-9_-]{0,63}$/;

function validHttpsUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const text = asText(value, 2_048);
  if (!text) return undefined;
  try { return new URL(text).protocol === "https:" ? text : undefined; } catch { return undefined; }
}

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const observations = await listWorldPulseObservations(await requireAccountSubject(request), id);
    return observations ? NextResponse.json({ observations }) : NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取世界脉冲观察记录失败。" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const source = asText(body?.source, 64);
    const observationKey = asText(body?.observationKey, 160);
    const observationType = asText(body?.observationType, 64);
    const title = asText(body?.title, 240);
    const observedAt = asDate(body?.observedAt);
    const location = asRecord(body?.location);
    const snapshot = asRecord(body?.snapshot);
    const idempotencyKey = asText(body?.idempotencyKey, 160) || asText(request.headers.get("idempotency-key"), 160);
    const sourceUrl = validHttpsUrl(body?.sourceUrl);
    if (!source || !sourcePattern.test(source) || !observationKey || !keyPattern.test(observationKey)
      || !observationType || !typePattern.test(observationType) || !title || !observedAt || !location || !snapshot
      || !idempotencyKey || sourceUrl === undefined) {
      return NextResponse.json({ error: "世界脉冲观察记录参数无效。" }, { status: 400 });
    }
    if (JSON.stringify(location).length > 8_000 || JSON.stringify(snapshot).length > 64_000) {
      return NextResponse.json({ error: "世界脉冲观察快照过大。", reasonCode: "payload_too_large" }, { status: 413 });
    }
    const saved = await recordWorldPulseObservation(await requireAccountSubject(request), id, {
      source, observationKey, observationType, title, observedAt, location, snapshot, sourceUrl, idempotencyKey,
    });
    if (!saved) return NextResponse.json({ error: "战局不存在或无写入权限。" }, { status: 403 });
    if (saved === "conflict") return NextResponse.json({ error: "相同幂等键已绑定到不同观察记录。", reasonCode: "idempotency_conflict" }, { status: 409 });
    return NextResponse.json({ observation: saved }, { status: saved.reused ? 200 : 201 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存世界脉冲观察记录失败。" }, { status: 500 });
  }
}
