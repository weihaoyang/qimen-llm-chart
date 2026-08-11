import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { createReview, listReviews } from "@/lib/agent/cases-repository";
import { isAgentWorkspaceId } from "@/lib/agent/workspace-input";

type Context = { params: Promise<{ id: string }> };
const text = (value: unknown, max: number, required = false) => typeof value === "string" && value.length <= max && (!required || value.trim().length > 0) ? value.trim() : "";

export async function GET(request: Request, context: Context) {
  try { const id = (await context.params).id; if (!isAgentWorkspaceId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 }); return NextResponse.json({ reviews: await listReviews(await requireAccountSubject(request), id) }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取复盘失败。" }, { status: 500 }); }
}

export async function POST(request: Request, context: Context) {
  try {
    const id = (await context.params).id; if (!isAgentWorkspaceId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { branchId?:unknown; outcome?:unknown; facts?:unknown; whatChanged?:unknown; nextAdjustment?:unknown } | null;
    const outcome = text(body?.outcome, 6000, true); if (!outcome) return NextResponse.json({ error: "请先记录这次行动的结果。" }, { status: 400 });
    const optional = [body?.facts, body?.whatChanged, body?.nextAdjustment]; if (optional.some((value) => typeof value !== "undefined" && (typeof value !== "string" || value.length > 6000))) return NextResponse.json({ error: "复盘字段长度无效。" }, { status: 400 });
    if (body?.branchId !== undefined && body.branchId !== null && !isAgentWorkspaceId(body.branchId)) return NextResponse.json({ error: "分支标识无效。" }, { status: 400 });
    const result = await createReview(await requireAccountSubject(request), id, { branchId: body?.branchId as string | null | undefined, outcome, facts: text(body?.facts, 6000), whatChanged: text(body?.whatChanged, 6000), nextAdjustment: text(body?.nextAdjustment, 6000) });
    if (!result) return NextResponse.json({ error: "议题不存在。" }, { status: 404 });
    if ("invalidBranch" in result) return NextResponse.json({ error: "复盘分支不属于当前议题。" }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存复盘失败。" }, { status: 500 }); }
}
