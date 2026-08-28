import { NextResponse } from "next/server";
import { catalogVersions, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function GET() {
  const templates = await listOfficialCatalog(OFFICIAL_CATALOG_TYPES.skillTemplate);
  return NextResponse.json({ catalogVersion: catalogVersions.skillTemplates, templates: templates.map((entry) => entry.payload) }, { headers: { "Cache-Control": "public, max-age=60" } });
}
