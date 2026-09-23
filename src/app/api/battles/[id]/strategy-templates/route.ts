import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { getBattleScenario, scenarioById } from "@/lib/scenarios/repository";
import { strategyTemplatesForScenario, type ScenarioStrategyTemplate } from "@/lib/scenarios/strategy-templates";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const battleId = (await context.params).id;
    if (!isUuid(battleId)) return noStore({ error: "战局标识无效。" }, { status: 400 });
    const subject = await requireAccountSubject(request);
    const scenario = await getBattleScenario(subject, battleId);
    if (!scenario) return noStore({ error: "战局不存在或无权访问。" }, { status: 404 });
    const snapshot = scenario.snapshot && typeof scenario.snapshot === "object" && !Array.isArray(scenario.snapshot)
      ? scenario.snapshot as { strategyTemplates?: unknown }
      : null;
    const catalogScenario = Array.isArray(snapshot?.strategyTemplates) ? null : await scenarioById(scenario.scenarioId);
    const templates = Array.isArray(snapshot?.strategyTemplates)
      ? snapshot.strategyTemplates as ScenarioStrategyTemplate[]
      : catalogScenario ? strategyTemplatesForScenario(catalogScenario) : [];
    return noStore({ battleId, scenarioId: scenario.scenarioId, scenarioVersion: scenario.scenarioVersion, templates });
  } catch (error) {
    return errorResponse(error, "读取策略模板失败。");
  }
}
