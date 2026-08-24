import { NextResponse } from "next/server";
import { OFFICIAL_TEMPLATE_CATALOG } from "@/lib/scenarios/marketplace";

export async function GET() {
  return NextResponse.json({ catalogVersion: 1, templates: OFFICIAL_TEMPLATE_CATALOG }, { headers: { "Cache-Control": "public, max-age=60" } });
}
