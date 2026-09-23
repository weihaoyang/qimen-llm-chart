import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { getAiJob } from "@/lib/battle/product-state";
import { isUuid } from "@/lib/battle/input";

export async function GET(request: Request, context: { params: Promise<{ id:string; jobId:string }> }) {
  try {
    const { id, jobId } = await context.params;
    if (!isUuid(id) || !isUuid(jobId)) return noStore({ error:"任务标识无效。" }, { status:400 });
    const job = await getAiJob(await requireAccountSubject(request), id, jobId);
    return job ? noStore({ job }) : noStore({ error:"任务不存在。" }, { status:404 });
  } catch (error) { return errorResponse(error, "读取 AI 任务失败。"); }
}
