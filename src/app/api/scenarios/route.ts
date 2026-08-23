import { NextResponse } from "next/server";
import { SCENARIOS, SCENARIO_CATALOG_VERSION } from "@/lib/scenarios/catalog";

export async function GET() {
  return NextResponse.json({ catalogVersion: SCENARIO_CATALOG_VERSION, scenarios: SCENARIOS.map((scenario) => ({ id: scenario.id, version: scenario.version, kind: scenario.kind, title: scenario.title, subtitle: scenario.subtitle, industry: scenario.industry, description: scenario.description, modules: scenario.modules, hardDeadlineDays: scenario.hardDeadlineDays })) }, { headers: { "Cache-Control": "public, max-age=300" } });
}
