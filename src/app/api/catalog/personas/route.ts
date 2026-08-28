import { NextResponse } from "next/server";
import { catalogVersions, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function GET() {
  const personas = await listOfficialCatalog(OFFICIAL_CATALOG_TYPES.persona);
  return NextResponse.json({ catalogVersion: catalogVersions.personas, personas: personas.map((entry) => entry.payload) });
}
