import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { deleteCase, getCase, updateCase } from "@/lib/agent/cases-repository";

type Context = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function GET(request: Request, context: Context) {
  try { const id = (await context.params).id; if (!validId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 }); const item = await getCase(await requireAccountSubject(request), id); return item ? NextResponse.json({ case: item }) : NextResponse.json({ error: "议题不存在。" }, { status: 404 }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取人生议题失败。" }, { status: 500 }); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const id = (await context.params).id; if (!validId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { title?:unknown; question?:unknown; status?:unknown; deadline?:unknown } | null;
    const input: Parameters<typeof updateCase>[2] = {};
    if (body?.title !== undefined) { if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 120) return NextResponse.json({ error: "标题长度无效。" }, { status: 400 }); input.title = body.title.trim(); }
    if (body?.question !== undefined) { if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 2000) return NextResponse.json({ error: "问题长度无效。" }, { status: 400 }); input.question = body.question.trim(); }
    if (body?.status !== undefined) { if (!["active","decided","archived"].includes(String(body.status))) return NextResponse.json({ error: "状态无效。" }, { status: 400 }); input.status = body.status as "active"|"decided"|"archived"; }
    if (body?.deadline !== undefined) { if (body.deadline !== null && typeof body.deadline !== "string") return NextResponse.json({ error: "期限格式无效。" }, { status: 400 }); const date = body.deadline ? new Date(body.deadline) : null; if (date && !Number.isFinite(date.getTime())) return NextResponse.json({ error: "期限格式无效。" }, { status: 400 }); input.deadline = date?.toISOString() ?? null; }
    const item = await updateCase(await requireAccountSubject(request), id, input); return item ? NextResponse.json({ case: item }) : NextResponse.json({ error: "议题不存在。" }, { status: 404 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "更新人生议题失败。" }, { status: 500 }); }
}

export async function DELETE(request: Request, context: Context) {
  try { const id = (await context.params).id; if (!validId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 }); const deleted = await deleteCase(await requireAccountSubject(request), id); return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "议题不存在。" }, { status: 404 }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "删除人生议题失败。" }, { status: 500 }); }
}
