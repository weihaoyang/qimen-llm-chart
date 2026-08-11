import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { getLatestEvidenceSnapshot, saveEvidenceSnapshot } from "@/lib/agent/cases-repository";

type Context = { params: Promise<{ id: string }> };
const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);
const evidenceModes = new Set(["qimen", "bazi", "ziwei", "combined", "research"]);

export async function GET(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!validId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 });
    return NextResponse.json({ evidence: await getLatestEvidenceSnapshot(await requireAccountSubject(request), id) });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取证据快照失败。" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!validId(id)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { mode?:unknown; sourceText?:unknown; structuredJson?:unknown } | null;
    if (typeof body?.mode !== "string" || !evidenceModes.has(body.mode) || typeof body.sourceText !== "string" || !body.sourceText.trim() || new TextEncoder().encode(body.sourceText).length > 250000 || body.structuredJson === undefined || JSON.stringify(body.structuredJson).length > 300000) return NextResponse.json({ error: "证据快照无效或过大。" }, { status: 400 });
    const evidence = await saveEvidenceSnapshot(await requireAccountSubject(request), id, { mode: body.mode.trim(), sourceText: body.sourceText, structuredJson: body.structuredJson });
    return evidence ? NextResponse.json({ evidence }, { status: 201 }) : NextResponse.json({ error: "议题不存在。" }, { status: 404 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存证据快照失败。" }, { status: 500 });
  }
}
