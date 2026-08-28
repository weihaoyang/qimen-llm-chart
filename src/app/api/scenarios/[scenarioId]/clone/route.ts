import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { cloneScenario, scenarioById } from "@/lib/scenarios/repository";

export async function POST(request: Request, context: { params: Promise<{ scenarioId: string }> }) {
  try {
    const scenario = await scenarioById((await context.params).scenarioId);
    if (!scenario) return NextResponse.json({ error: "案例不存在。" }, { status: 404 });
    const result = await cloneScenario(await requireAccountSubject(request), scenario);
    return NextResponse.json({ battle: result }, { status: 201 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "复制案例失败。" }, { status: 500 });
  }
}
