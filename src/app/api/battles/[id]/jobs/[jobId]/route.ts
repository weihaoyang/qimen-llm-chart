import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { getAiJob } from "@/lib/battle/product-state";
import { isUuid } from "@/lib/battle/input";

export async function GET(request: Request, context: { params: Promise<{ id:string; jobId:string }> }) {
  try {
    const { id, jobId } = await context.params;
    if (!isUuid(id) || !isUuid(jobId)) return NextResponse.json({ error:"任务标识无效。" }, { status:400 });
    const job = await getAiJob(await requireAccountSubject(request), id, jobId);
    return job ? NextResponse.json({ job }) : NextResponse.json({ error:"任务不存在。" }, { status:404 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"读取 AI 任务失败。" }, { status:500 }); }
}
