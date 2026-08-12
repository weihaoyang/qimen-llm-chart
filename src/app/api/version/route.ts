import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Non-sensitive release metadata for deployment verification. */
export async function GET() {
  return NextResponse.json(
    {
      service: "shengtian-banzi",
      releaseId: process.env.QMDJ_RELEASE_ID ?? "unknown",
      commit: process.env.QMDJ_RELEASE_COMMIT ?? "unknown",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
