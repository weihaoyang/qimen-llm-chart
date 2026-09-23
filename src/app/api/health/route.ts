import { NextResponse } from "next/server";

import { query } from "@/lib/db/pool";
import { reportSwallowedError } from "@/lib/internal-log";

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
      { ok: true, service: "qmdj" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // The response must stay free of the cause — this endpoint is
    // unauthenticated and a raw database error would leak content. That is a
    // reason to withhold it from the caller, not a reason to lose it: a probe
    // that reports "not ready" without ever saying why leaves an operator with
    // 503s and no way to tell an unreachable database from a wedged process.
    reportSwallowedError("health", "数据库健康检查失败，已返回 503。", error);
    return NextResponse.json(
      { ok: false, service: "qmdj" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
