import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { appendTurn, listTurns } from "@/lib/agent/cases-repository";
import { isAgentInterviewPhase, isAgentWorkspaceId } from "@/lib/agent/workspace-input";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { try { const id = (await context.params).id; if (!isAgentWorkspaceId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 }); return NextResponse.json({ turns: await listTurns(await requireAccountSubject(request), id) }); } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取访谈失败。" }, { status: 500 }); } }
export async function POST(request: Request, context: Context) {
  try { const id = (await context.params).id; if (!isAgentWorkspaceId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 }); const body = await request.json().catch(() => null) as { role?:unknown; content?:unknown; phase?:unknown } | null; if (!["user","assistant"].includes(String(body?.role)) || typeof body?.content !== "string" || !body.content.trim() || body.content.length > 12000 || (body?.phase !== undefined && !isAgentInterviewPhase(body.phase))) return NextResponse.json({ error: "访谈内容格式无效。" }, { status: 400 }); const turn = await appendTurn(await requireAccountSubject(request), id, { role: body.role as "user"|"assistant", content: body.content.trim(), phase: body?.phase ?? "issue" }); return turn ? NextResponse.json({ turn }, { status: 201 }) : NextResponse.json({ error: "议题不存在。" }, { status: 404 }); } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存访谈失败。" }, { status: 500 }); }
}
