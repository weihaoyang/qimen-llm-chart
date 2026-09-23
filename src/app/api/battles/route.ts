import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { asDate, asOptionalText, asText } from "@/lib/battle/input";
import { createBattle, listBattles } from "@/lib/battle/repository";

export async function GET(request: Request) {
  try { return noStore({ battles: await listBattles(await requireAccountSubject(request)) }); }
  catch (error) { return errorResponse(error, "读取战局失败。"); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const title = asText(body?.title, 160);
    const objective = asText(body?.objective, 6000);
    const minimumOutcome = asOptionalText(body?.minimumOutcome, 6000);
    const idealOutcome = asOptionalText(body?.idealOutcome, 6000);
    const opponentSummary = asOptionalText(body?.opponentSummary, 6000);
    const hardDeadline = asDate(body?.hardDeadline);
    if (!title || !objective || hardDeadline === undefined || minimumOutcome === null || idealOutcome === null || opponentSummary === null) return noStore({ error: "战局标题、目标或期限格式无效。" }, { status: 400 });
    return noStore({ battle: await createBattle(await requireAccountSubject(request), { title, objective, minimumOutcome, idealOutcome, opponentSummary, hardDeadline }) }, { status: 201 });
  } catch (error) { return errorResponse(error, "创建战局失败。"); }
}
