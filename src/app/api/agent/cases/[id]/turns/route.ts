import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { appendTurn, listTurns } from "@/lib/agent/cases-repository";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { try { return NextResponse.json({ turns: await listTurns(await requireAccountSubject(request), (await context.params).id) }); } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取访谈失败。" }, { status: 500 }); } }
export async function POST(request: Request, context: Context) {
  try { const body = await request.json().catch(() => null) as { role?:unknown; content?:unknown; phase?:unknown } | null; if (!["user","assistant"].includes(String(body?.role)) || typeof body?.content !== "string" || !body.content.trim() || body.content.length > 12000 || (body?.phase !== undefined && (typeof body.phase !== "string" || body.phase.length > 24))) return NextResponse.json({ error: "访谈内容格式无效。" }, { status: 400 }); const turn = await appendTurn(await requireAccountSubject(request), (await context.params).id, { role: body.role as "user"|"assistant", content: body.content.trim(), phase: typeof body.phase === "string" ? body.phase : "issue" }); return turn ? NextResponse.json({ turn }, { status: 201 }) : NextResponse.json({ error: "议题不存在。" }, { status: 404 }); } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存访谈失败。" }, { status: 500 }); }
}
