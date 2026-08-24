import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { deleteDraftMove, listMoves, saveMoveSet } from "@/lib/battle/repository";
import { asRecord, asText } from "@/lib/battle/input";
import type { MoveKind } from "@/lib/battle/types";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { const id = (await context.params).id; if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 }); const junctionId = new URL(request.url).searchParams.get("junctionId") ?? undefined; if (junctionId && !isUuid(junctionId)) return NextResponse.json({ error: "交叉点标识无效。" }, { status: 400 }); const moves = await listMoves(await requireAccountSubject(request), id, junctionId); return moves ? NextResponse.json({ moves }) : NextResponse.json({ error: "战局不存在。" }, { status: 404 }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取策略失败。" }, { status: 500 }); }
}

export async function POST(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { junctionId?: unknown; moves?: unknown } | null;
    if (!isUuid(body?.junctionId) || !Array.isArray(body?.moves) || body.moves.length === 0 || body.moves.length > 20) return NextResponse.json({ error: "策略集合或交叉点无效。" }, { status: 400 });
    const moves = body.moves.map((item) => {
      const row = asRecord(item) ?? {};
      const actions = Array.isArray(row.actions) ? row.actions.map((action) => {
        const value = asRecord(action) ?? {};
        return { title: asText(value.title, 500) ?? "行动", description: asText(value.description, 2000, false) ?? "", owner: asText(value.owner, 200) ?? "待定", dueAt: typeof value.dueAt === "string" ? value.dueAt : null };
      }) : [];
      const kind: MoveKind = row.kind === "strong_attack" || row.kind === "probe" || row.kind === "hedge" ? row.kind : "probe";
      return { kind, title: asText(row.title, 500) ?? "未命名策略", keyVariable: asText(row.keyVariable, 500) ?? "", rationale: asText(row.rationale, 4000, false) ?? "", actions, cost: asRecord(row.cost) ?? {}, upside: asRecord(row.upside) ?? {}, failureCost: asRecord(row.failureCost) ?? {}, validation: asRecord(row.validation) ?? {}, stop: asRecord(row.stop) ?? {}, assumptions: Array.isArray(row.assumptions) ? row.assumptions.filter((value): value is string => typeof value === "string").slice(0, 30) : [], source: asRecord(row.source) ?? { layer: "reference_ui" } };
    });
    const saved = await saveMoveSet(await requireAccountSubject(request), id, body.junctionId as string, moves);
    return saved === null ? NextResponse.json({ error: "战局或交叉点不存在，或不属于当前账户。" }, { status: 403 }) : NextResponse.json({ moves: saved }, { status: 201 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存策略失败。" }, { status: 500 }); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    const moveId = new URL(request.url).searchParams.get("moveId");
    if (!isUuid(id) || !isUuid(moveId)) return NextResponse.json({ error: "战局或策略标识无效。" }, { status: 400 });
    const deleted = await deleteDraftMove(await requireAccountSubject(request), id, moveId);
    return deleted === null ? NextResponse.json({ error: "战局或策略不存在，或不属于当前账户。" }, { status: 403 }) : deleted ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: "只有未锁定的策略草案可以删除。" }, { status: 409 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "删除策略失败。" }, { status: 500 }); }
}
