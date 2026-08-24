import { NextResponse } from "next/server";
import { DEEP_ARCHIVES_CATALOG, DEEP_ARCHIVES_CATALOG_VERSION } from "@/lib/scenarios/ecosystem";

export async function GET() {
  return NextResponse.json({ catalogVersion: DEEP_ARCHIVES_CATALOG_VERSION, archives: DEEP_ARCHIVES_CATALOG });
}
