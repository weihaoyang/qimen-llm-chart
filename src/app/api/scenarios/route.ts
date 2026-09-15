import { NextResponse } from "next/server";
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
  return NextResponse.json({ catalogVersion: catalogVersions.scenarios, scenarios: scenarios.map((scenario) => ({ id: scenario.id, version: scenario.version, kind: scenario.kind, title: scenario.title, subtitle: scenario.subtitle, industry: scenario.industry, description: scenario.description, modules: scenario.modules, hardDeadlineDays: scenario.hardDeadlineDays })) }, { headers: { "Cache-Control": "public, max-age=300" } });
}
