import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { deleteMemory, listMemories, saveMemory } from "@/lib/battle/product-state";
import { asRecord, asText, isUuid } from "@/lib/battle/input";

export async function GET(request: Request) {
  try { return NextResponse.json({ memories: await listMemories(await requireAccountSubject(request)) }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({error:error.message},{status:error.status}) : NextResponse.json({error:"读取 AI 记忆失败。"},{status:500}); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const title = asText(body?.title, 200); const memory = asRecord(body?.memory); const battleId = body?.battleId == null ? null : body.battleId;
    if (!title || !memory || (body?.id !== undefined && (typeof body.id !== "string" || !isUuid(body.id))) || (battleId !== null && !isUuid(battleId))) return NextResponse.json({error:"记忆字段无效。"},{status:400});
    const value = await saveMemory(await requireAccountSubject(request), { id: typeof body?.id === "string" ? body.id : undefined, battleId: battleId as string|null, title, memory, source: asRecord(body?.source) ?? {}, consentStatus: body?.consentStatus === "paused" || body?.consentStatus === "revoked" ? body.consentStatus : "active" });
    if (!value) return NextResponse.json({ error:"战局不存在或无记忆写入权限。", reasonCode:"battle_access_denied" }, { status:403 });
    return NextResponse.json({ memory:value }, { status:201 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({error:error.message},{status:error.status}) : NextResponse.json({error:"保存 AI 记忆失败。"},{status:500}); }
}

export async function DELETE(request: Request) {
  try { const id = new URL(request.url).searchParams.get("id"); if (!id || !isUuid(id)) return NextResponse.json({error:"记忆标识无效。"},{status:400}); return NextResponse.json({ deleted: await deleteMemory(await requireAccountSubject(request), id) }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({error:error.message},{status:error.status}) : NextResponse.json({error:"删除 AI 记忆失败。"},{status:500}); }
}
