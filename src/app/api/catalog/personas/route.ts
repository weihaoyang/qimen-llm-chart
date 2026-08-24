import { NextResponse } from "next/server";
import { AI_PERSONA_CONFIGS } from "@/shengtian-reference/data/presets";

export async function GET() {
  return NextResponse.json({ catalogVersion: 1, personas: Object.values(AI_PERSONA_CONFIGS) });
}
