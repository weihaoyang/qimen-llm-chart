import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid, asRecord } from "@/lib/battle/input";
import { updateDraftMoveSource } from "@/lib/battle/repository";

type Context = { params: Promise<{ id:string; moveId:string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id, moveId } = await context.params;
    if (!isUuid(id) || !isUuid(moveId)) return NextResponse.json({ error: "战局或策略标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { source?: unknown } | null;
    const source = asRecord(body?.source);
    if (!source) return NextResponse.json({ error: "策略来源状态必须是 JSON 对象。" }, { status: 400 });
    const updated = await updateDraftMoveSource(await requireAccountSubject(request), id, moveId, source);
    return updated ? NextResponse.json({ move: updated }) : NextResponse.json({ error: "只有当前账户的草案策略可以更新。" }, { status: 409 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "策略状态保存失败。" }, { status: 500 });
  }
}
