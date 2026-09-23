import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { asDate, asOptionalText, asText, isBattleStatus, isUuid } from "@/lib/battle/input";
import { deleteBattle, getBattle, updateBattle } from "@/lib/battle/repository";
import { getBattleScenario } from "@/lib/scenarios/repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try { const id = (await context.params).id; if (!isUuid(id)) return noStore({ error: "战局标识无效。" }, { status: 400 }); const subject = await requireAccountSubject(request); const battle = await getBattle(subject, id); return battle ? noStore({ battle, scenario: await getBattleScenario(subject, id) }) : noStore({ error: "战局不存在。" }, { status: 404 }); }
  catch (error) { return errorResponse(error, "读取战局失败。"); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const id = (await context.params).id; if (!isUuid(id)) return noStore({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const input: Parameters<typeof updateBattle>[2] = {};
    if (body?.title !== undefined) { const value = asText(body.title, 160); if (!value) return noStore({ error: "标题无效。" }, { status: 400 }); input.title = value; }
    if (body?.objective !== undefined) { const value = asText(body.objective, 6000); if (!value) return noStore({ error: "目标无效。" }, { status: 400 }); input.objective = value; }
    for (const [key, max] of [["minimumOutcome", 6000], ["idealOutcome", 6000], ["opponentSummary", 6000]] as const) if (body?.[key] !== undefined) { const value = asOptionalText(body[key], max); if (value === null) return noStore({ error: `${key} 无效。` }, { status: 400 }); input[key] = value; }
    if (body?.hardDeadline !== undefined) { const value = asDate(body.hardDeadline); if (value === undefined) return noStore({ error: "期限无效。" }, { status: 400 }); input.hardDeadline = value; }
    if (body?.status !== undefined) { if (!isBattleStatus(body.status)) return noStore({ error: "战局状态无效。" }, { status: 400 }); input.status = body.status; }
    const battle = await updateBattle(await requireAccountSubject(request), id, input); return battle ? noStore({ battle }) : noStore({ error: "战局不存在。" }, { status: 404 });
  } catch (error) { return errorResponse(error, "更新战局失败。"); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isUuid(id)) return noStore({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
    if (body?.confirmation !== "DELETE") return noStore({ error: "删除战局需要明确确认。" }, { status: 400 });
    const deleted = await deleteBattle(await requireAccountSubject(request), id);
    return deleted === null ? noStore({ error: "只有战局所有者可以删除，或战局不存在。" }, { status: 403 }) : noStore({ deleted });
  } catch (error) {
    return errorResponse(error, "删除战局失败。");
  }
}
