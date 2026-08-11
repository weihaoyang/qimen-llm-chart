import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { selectTreeBranch } from "@/lib/agent/cases-repository";
import { isAgentWorkspaceId } from "@/lib/agent/workspace-input";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const caseId = (await context.params).id;
    if (!isAgentWorkspaceId(caseId)) return NextResponse.json({ error: "议题标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { branchId?: unknown } | null;
    if (!isAgentWorkspaceId(body?.branchId)) return NextResponse.json({ error: "分支标识无效。" }, { status: 400 });
    const result = await selectTreeBranch(await requireAccountSubject(request), caseId, body!.branchId as string);
    if (!result) return NextResponse.json({ error: "议题不存在。" }, { status: 404 });
    if ("invalidBranch" in result) return NextResponse.json({ error: "分支不属于当前决策树。" }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "保存当前路径失败。" }, { status: 500 });
  }
}
