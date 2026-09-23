import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { cloneScenario, scenarioById } from "@/lib/scenarios/repository";

export async function POST(request: Request, context: { params: Promise<{ scenarioId: string }> }) {
  try {
    const scenario = await scenarioById((await context.params).scenarioId);
    if (!scenario) return noStore({ error: "案例不存在。" }, { status: 404 });
    const result = await cloneScenario(await requireAccountSubject(request), scenario);
    return noStore({ battle: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "复制案例失败。");
  }
}
