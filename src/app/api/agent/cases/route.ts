import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { createCase, listCases } from "@/lib/agent/cases-repository";

const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null;

export async function GET(request: Request) {
  try { return noStore({ cases: await listCases(await requireAccountSubject(request)) }); }
  catch (error) { return errorResponse(error, "读取人生议题失败。"); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { title?:unknown; question?:unknown; deadline?:unknown } | null;
    const title = text(body?.title, 120);
    const question = text(body?.question, 2000);
    if (!title || !question || (body?.deadline !== undefined && body.deadline !== null && typeof body.deadline !== "string")) return noStore({ error: "议题标题和问题不能为空，且长度需符合限制。" }, { status: 400 });
    const deadline = body?.deadline ? new Date(body.deadline as string) : null;
    if (deadline && !Number.isFinite(deadline.getTime())) return noStore({ error: "决策期限格式无效。" }, { status: 400 });
    const subject = await requireAccountSubject(request);
    return noStore({ case: await createCase(subject, { title, question, deadline: deadline?.toISOString() ?? null }) }, { status: 201 });
  } catch (error) { return errorResponse(error, "创建人生议题失败。"); }
}
