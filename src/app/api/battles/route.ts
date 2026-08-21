import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { asDate, asOptionalText, asText } from "@/lib/battle/input";
import { createBattle, listBattles } from "@/lib/battle/repository";

export async function GET(request: Request) {
  try { return NextResponse.json({ battles: await listBattles(await requireAccountSubject(request)) }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取战局失败。" }, { status: 500 }); }
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
    if (!title || !objective || hardDeadline === undefined || minimumOutcome === null || idealOutcome === null || opponentSummary === null) return NextResponse.json({ error: "战局标题、目标或期限格式无效。" }, { status: 400 });
    return NextResponse.json({ battle: await createBattle(await requireAccountSubject(request), { title, objective, minimumOutcome, idealOutcome, opponentSummary, hardDeadline }) }, { status: 201 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "创建战局失败。" }, { status: 500 }); }
}
