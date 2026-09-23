import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { getLatestEvidenceSnapshot, saveEvidenceSnapshot } from "@/lib/agent/cases-repository";
import { isAgentWorkbenchMode, isAgentWorkspaceId } from "@/lib/agent/workspace-input";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isAgentWorkspaceId(id)) return noStore({ error: "议题标识无效。" }, { status: 400 });
    return noStore({ evidence: await getLatestEvidenceSnapshot(await requireAccountSubject(request), id) });
  } catch (error) {
    return errorResponse(error, "读取证据快照失败。");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isAgentWorkspaceId(id)) return noStore({ error: "议题标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { mode?:unknown; sourceText?:unknown; structuredJson?:unknown } | null;
    if (!isAgentWorkbenchMode(body?.mode) || typeof body?.sourceText !== "string" || !body.sourceText.trim() || new TextEncoder().encode(body.sourceText).length > 250000 || body.structuredJson === undefined || JSON.stringify(body.structuredJson).length > 300000) return noStore({ error: "证据快照无效或过大。" }, { status: 400 });
    const evidence = await saveEvidenceSnapshot(await requireAccountSubject(request), id, { mode: body.mode.trim(), sourceText: body.sourceText, structuredJson: body.structuredJson });
    return evidence ? noStore({ evidence }, { status: 201 }) : noStore({ error: "议题不存在。" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "保存证据快照失败。");
  }
}
