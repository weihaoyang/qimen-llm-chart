import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { selectTreeBranch } from "@/lib/agent/cases-repository";
import { isAgentWorkspaceId } from "@/lib/agent/workspace-input";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const caseId = (await context.params).id;
    if (!isAgentWorkspaceId(caseId)) return noStore({ error: "议题标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { branchId?: unknown } | null;
    if (!isAgentWorkspaceId(body?.branchId)) return noStore({ error: "分支标识无效。" }, { status: 400 });
    const result = await selectTreeBranch(await requireAccountSubject(request), caseId, body!.branchId as string);
    if (!result) return noStore({ error: "议题不存在。" }, { status: 404 });
    if ("invalidBranch" in result) return noStore({ error: "分支不属于当前决策树。" }, { status: 400 });
    return noStore(result);
  } catch (error) {
    return errorResponse(error, "保存当前路径失败。");
  }
}
