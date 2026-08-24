import { NextResponse } from "next/server";
import { WORLD_PULSE_CATALOG, WORLD_PULSE_CATALOG_VERSION, WORLD_PULSE_TICKER } from "@/lib/scenarios/ecosystem";

export async function GET() {
  return NextResponse.json({ catalogVersion: WORLD_PULSE_CATALOG_VERSION, events: WORLD_PULSE_CATALOG, ticker: WORLD_PULSE_TICKER });
}
