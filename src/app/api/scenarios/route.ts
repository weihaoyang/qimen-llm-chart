import { NextResponse } from "next/server";
import { catalogVersions, listOfficialScenarios } from "@/lib/catalog/official-repository";

export async function GET() {
  const scenarios = await listOfficialScenarios();
  return NextResponse.json({ catalogVersion: catalogVersions.scenarios, scenarios: scenarios.map((scenario) => ({ id: scenario.id, version: scenario.version, kind: scenario.kind, title: scenario.title, subtitle: scenario.subtitle, industry: scenario.industry, description: scenario.description, modules: scenario.modules, hardDeadlineDays: scenario.hardDeadlineDays })) }, { headers: { "Cache-Control": "public, max-age=300" } });
}
