import { NextResponse } from "next/server";
import { catalogVersions, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function GET() {
  const archives = await listOfficialCatalog(OFFICIAL_CATALOG_TYPES.deepArchive);
  return NextResponse.json({ catalogVersion: catalogVersions.deepArchives, archives: archives.map((entry) => entry.payload) });
}
