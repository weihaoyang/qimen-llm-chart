import { noStore, publicCatalog } from "@/lib/http";
import { publicScenarioById } from "@/lib/scenarios/repository";

export async function GET(_request: Request, context: { params: Promise<{ scenarioId: string }> }) {
  const scenario = await publicScenarioById((await context.params).scenarioId);
  // A missing scenario must not be cached: the next catalog deploy may add it.
  return scenario ? publicCatalog({ scenario }, 300) : noStore({ error: "案例不存在。" }, { status: 404 });
}
