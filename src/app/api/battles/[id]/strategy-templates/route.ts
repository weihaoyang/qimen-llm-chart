import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { getBattleScenario, scenarioById } from "@/lib/scenarios/repository";
import { strategyTemplatesForScenario, type ScenarioStrategyTemplate } from "@/lib/scenarios/strategy-templates";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const battleId = (await context.params).id;
    if (!isUuid(battleId)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const subject = await requireAccountSubject(request);
    const scenario = await getBattleScenario(subject, battleId);
    if (!scenario) return NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
    const snapshot = scenario.snapshot && typeof scenario.snapshot === "object" && !Array.isArray(scenario.snapshot)
      ? scenario.snapshot as { strategyTemplates?: unknown }
      : null;
    const templates = Array.isArray(snapshot?.strategyTemplates)
      ? snapshot.strategyTemplates as ScenarioStrategyTemplate[]
      : (() => { const catalogScenario = scenarioById(scenario.scenarioId); return catalogScenario ? strategyTemplatesForScenario(catalogScenario) : []; })();
    return NextResponse.json({ battleId, scenarioId: scenario.scenarioId, scenarioVersion: scenario.scenarioVersion, templates });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json({ error: "读取策略模板失败。" }, { status: 500 });
  }
}
