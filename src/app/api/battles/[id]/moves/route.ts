import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { listMoves } from "@/lib/battle/repository";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { const id = (await context.params).id; if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 }); const junctionId = new URL(request.url).searchParams.get("junctionId") ?? undefined; if (junctionId && !isUuid(junctionId)) return NextResponse.json({ error: "交叉点标识无效。" }, { status: 400 }); const moves = await listMoves(await requireAccountSubject(request), id, junctionId); return moves ? NextResponse.json({ moves }) : NextResponse.json({ error: "战局不存在。" }, { status: 404 }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取策略失败。" }, { status: 500 }); }
}
