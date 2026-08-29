// Compatibility surface for clients that use the explicit interview route.
// Keep it on the same audited AI-job pipeline as /ai/interview so every caller
// receives the structured contract and identical gate/retry semantics.
import { handleAiPost } from "../ai/[kind]/route";
import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { listInterviewTurns } from "@/lib/battle/interview-repository";

export async function POST(request: Request, context: { params: Promise<{ id:string }> }) {
  return handleAiPost(request, context, "interview");
}

export async function GET(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const battleId = (await context.params).id;
    if (!isUuid(battleId)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const turns = await listInterviewTurns(await requireAccountSubject(request), battleId);
    return NextResponse.json({ turns });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json({ error: "采访记录读取失败。" }, { status: 500 });
  }
}
