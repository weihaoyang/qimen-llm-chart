import { NextResponse } from "next/server";
import { catalogVersions, getOfficialCatalogEntry, listOfficialCatalog, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function GET() {
  const [events, ticker] = await Promise.all([
    listOfficialCatalog(OFFICIAL_CATALOG_TYPES.worldPulse),
    getOfficialCatalogEntry<unknown[]>(OFFICIAL_CATALOG_TYPES.worldPulseTicker, "default"),
  ]);
  return NextResponse.json({ catalogVersion: catalogVersions.worldPulse, events: events.map((entry) => entry.payload), ticker: ticker?.payload ?? [] });
}
