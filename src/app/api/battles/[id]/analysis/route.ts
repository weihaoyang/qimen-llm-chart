import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { generateBattleAnalysis } from "@/lib/battle/service";
import { getLatestGravityLine, isBattleOwner, listJunctions, listMoves } from "@/lib/battle/repository";
import type { ResourceSnapshot } from "@/lib/battle/types";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const subject = await requireAccountSubject(request);
    const [gravity, junctions, moves] = await Promise.all([
      getLatestGravityLine(subject, id),
      listJunctions(subject, id),
      listMoves(subject, id),
    ]);
    if (junctions === null || moves === null) return NextResponse.json({ error: "战局不存在。" }, { status: 404 });
    return NextResponse.json({ gravity: gravity ?? null, junctions, moves });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取战局分析失败。" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const id = (await context.params).id; if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const subject = await requireAccountSubject(request);
    if (!await isBattleOwner(subject, id)) return NextResponse.json({ error: "只有战局所有者可以重新生成分析。" }, { status: 403 });
    const body = await request.json().catch(() => null) as { resourceSnapshot?: unknown } | null;
    const resourceSnapshot = body?.resourceSnapshot && typeof body.resourceSnapshot === "object" && !Array.isArray(body.resourceSnapshot) ? body.resourceSnapshot as ResourceSnapshot : undefined;
    if (resourceSnapshot && Object.values(resourceSnapshot).some((value) => value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0))) return NextResponse.json({ error: "资源快照必须是非负有限数字。" }, { status: 400 });
    const result = await generateBattleAnalysis(subject, id, resourceSnapshot); return result ? NextResponse.json(result, { status: 201 }) : NextResponse.json({ error: "战局不存在。" }, { status: 404 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "生成战局分析失败。" }, { status: 500 }); }
}
