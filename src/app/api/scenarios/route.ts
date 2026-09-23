import { publicCatalog } from "@/lib/http";
import { catalogVersions, listOfficialScenarios } from "@/lib/catalog/official-repository";
import { SCENARIOS } from "@/lib/scenarios/catalog";

export async function GET() {
  let scenarios = SCENARIOS;
  try {
    scenarios = await listOfficialScenarios();
  } catch {
    // Keep the public reference catalog readable during a database outage.
    // Mutating operations still fail closed through their account/database checks.
  }
  return publicCatalog({ catalogVersion: catalogVersions.scenarios, scenarios: scenarios.map((scenario) => ({ id: scenario.id, version: scenario.version, kind: scenario.kind, title: scenario.title, subtitle: scenario.subtitle, industry: scenario.industry, description: scenario.description, modules: scenario.modules, hardDeadlineDays: scenario.hardDeadlineDays })) }, 300);
}
