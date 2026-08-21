import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { asDate, asText, isFactKind, isUuid } from "@/lib/battle/input";
import { addBattleFacts, listBattleFacts } from "@/lib/battle/repository";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { try { const id = (await context.params).id; if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 }); const facts = await listBattleFacts(await requireAccountSubject(request), id); return facts ? NextResponse.json({ facts }) : NextResponse.json({ error: "战局不存在。" }, { status: 404 }); } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取事实失败。" }, { status: 500 }); } }
export async function POST(request: Request, context: Context) {
  try {
    const battleId = (await context.params).id; if (!isUuid(battleId)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { facts?: unknown } | null;
    if (!Array.isArray(body?.facts) || body.facts.length < 1 || body.facts.length > 20) return NextResponse.json({ error: "事实列表无效。" }, { status: 400 });
    const facts = body.facts.map((value) => { const item = value as Record<string, unknown>; const content = asText(item.content, 12000); const occurredAt = asDate(item.occurredAt); const verifiedAt = asDate(item.verifiedAt); return { kind: item.kind, content, source: item.source ?? "user", confidence: item.confidence ?? 100, occurredAt, verifiedAt }; });
    if (facts.some((item) => !item.content || !isFactKind(item.kind) || !["user","attachment","system","ai"].includes(String(item.source)) || item.kind === "fact" && item.source === "ai" || typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 100 || item.occurredAt === undefined || item.verifiedAt === undefined)) return NextResponse.json({ error: "事实必须包含合法类型、来源、置信度和日期；AI 不能直接入账为事实。" }, { status: 400 });
    const result = await addBattleFacts(await requireAccountSubject(request), battleId, facts as Parameters<typeof addBattleFacts>[2]); return result ? NextResponse.json({ facts: result }, { status: 201 }) : NextResponse.json({ error: "战局不存在。" }, { status: 404 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "写入事实失败。" }, { status: 500 }); }
}
