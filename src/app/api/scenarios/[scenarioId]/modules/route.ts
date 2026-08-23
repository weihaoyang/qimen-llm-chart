import { NextResponse } from "next/server";
import { scenarioById } from "@/lib/scenarios/repository";

export async function GET(_request: Request, context: { params: Promise<{ scenarioId: string }> }) {
  const scenario = scenarioById((await context.params).scenarioId);
  return scenario ? NextResponse.json({ scenarioId: scenario.id, version: scenario.version, modules: scenario.modules }) : NextResponse.json({ error: "案例不存在。" }, { status: 404 });
}
