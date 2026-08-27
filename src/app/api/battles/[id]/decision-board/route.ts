import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid, asRecord, asText } from "@/lib/battle/input";
import { mutateDecisionBoard, type DecisionBoardMutation } from "@/lib/battle/product-state";

type Context = { params: Promise<{ id:string }> };
const targetTypes = new Set(["GENERAL", "CARD", "STRATEGY"]);

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error:"战局标识无效。" }, { status:400 });
    const body = asRecord(await request.json().catch(() => null)) ?? {};
    const action = body?.action;
    const idempotencyKey = asText(body.idempotencyKey, 160, false) ?? undefined;
    let mutation: DecisionBoardMutation;
    if (action === "comment") {
      const targetType = asText(body.targetType, 16);
      const targetTitle = asText(body.targetTitle, 240);
      const content = asText(body.content, 6000);
      if (!targetType || !targetTypes.has(targetType) || !targetTitle || !content) return NextResponse.json({ error:"评论字段无效。" }, { status:400 });
      mutation = { type:"comment", targetType:targetType as "GENERAL" | "CARD" | "STRATEGY", targetTitle, content, idempotencyKey };
    } else if (action === "upvote") {
      const commentId = asText(body.commentId, 128);
      if (!commentId) return NextResponse.json({ error:"评论标识无效。" }, { status:400 });
      mutation = { type:"upvote", commentId, idempotencyKey };
    } else if (action === "ghost_strategy") {
      const strategyName = asText(body.strategyName, 240);
      const coreThesis = asText(body.coreThesis, 6000);
      const suggestedAction = asText(body.suggestedAction, 6000);
      const pros = asText(body.pros, 6000);
      const cons = asText(body.cons, 6000);
      const estimatedSurvivalProb = body.estimatedSurvivalProb;
      if (!strategyName || !coreThesis || !suggestedAction || !pros || !cons || typeof estimatedSurvivalProb !== "number" || !Number.isFinite(estimatedSurvivalProb) || estimatedSurvivalProb < 0 || estimatedSurvivalProb > 100) return NextResponse.json({ error:"并行策略字段无效。" }, { status:400 });
      mutation = { type:"ghost_strategy", strategyName, coreThesis, suggestedAction, estimatedSurvivalProb, pros, cons, idempotencyKey };
    } else if (action === "redaction") {
      if (typeof body.enabled !== "boolean") return NextResponse.json({ error:"脱敏开关字段无效。" }, { status:400 });
      mutation = { type:"redaction", enabled:body.enabled, idempotencyKey };
    } else return NextResponse.json({ error:"决策委员会操作无效。" }, { status:400 });
    const result = await mutateDecisionBoard(await requireAccountSubject(request), id, mutation);
    if (result === null) return NextResponse.json({ error:"战局不存在或无协作访问权限。" }, { status:404 });
    if (result === "forbidden") return NextResponse.json({ error:"当前协作角色无权执行该委员会操作。" }, { status:403 });
    return NextResponse.json({ state:result });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"更新决策委员会失败。" }, { status:500 });
  }
}
