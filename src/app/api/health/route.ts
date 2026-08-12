import { NextResponse } from "next/server";

import { query } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Deliberately small, non-authenticated liveness/readiness probe.
 *
 * It proves that the running product process can reach its own business
 * database. It does not return configuration, identities, rows, or platform
 * entitlement data.
 */
export async function GET() {
  try {
    await query("SELECT 1 AS healthy");
    return NextResponse.json(
      { ok: true, service: "shengtian-banzi" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, service: "shengtian-banzi" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
