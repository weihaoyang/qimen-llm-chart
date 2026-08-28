import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { asDate, asRecord, asText, isConstraintKind, isFactKind, isUuid } from "@/lib/battle/input";
import { confirmInterviewExtraction } from "@/lib/battle/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const battleId = (await context.params).id;
    if (!isUuid(battleId)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as {
      confirmationKey?: unknown;
      facts?: unknown;
      constraints?: unknown;
    } | null;
    const confirmationKey = asText(body?.confirmationKey, 200);
    if (!confirmationKey || !Array.isArray(body?.facts) || !Array.isArray(body?.constraints) || body.facts.length + body.constraints.length < 1 || body.facts.length > 20 || body.constraints.length > 30) {
      return NextResponse.json({ error: "采访确认载荷无效。" }, { status: 400 });
    }
    const facts = body.facts.map((value) => {
      const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        kind: item.kind,
        content: asText(item.content, 12000),
        source: item.source ?? "user",
        confidence: item.confidence ?? 100,
        occurredAt: asDate(item.occurredAt),
        verifiedAt: asDate(item.verifiedAt),
      };
    });
    const constraints = body.constraints.map((value) => {
      const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        kind: item.kind,
        label: asText(item.label, 160),
        description: asText(item.description, 6000, false),
        hard: item.hard !== false,
        severity: typeof item.severity === "number" && item.severity >= 1 && item.severity <= 5 ? item.severity : 3,
        threshold: asRecord(item.threshold) ?? {},
        source: asRecord(item.source) ?? {},
      };
    });
    if (facts.some((item) => !item.content || !isFactKind(item.kind) || !["user", "attachment", "system"].includes(String(item.source)) || typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 100 || item.occurredAt === undefined || item.verifiedAt === undefined)) {
      return NextResponse.json({ error: "事实必须包含合法类型、来源、置信度和日期。" }, { status: 400 });
    }
    if (constraints.some((item) => !isConstraintKind(item.kind) || !item.label || item.description === null)) {
      return NextResponse.json({ error: "约束字段无效。" }, { status: 400 });
    }
    const result = await confirmInterviewExtraction(
      await requireAccountSubject(request),
      battleId,
      confirmationKey,
      facts as Parameters<typeof confirmInterviewExtraction>[3],
      constraints as Parameters<typeof confirmInterviewExtraction>[4],
    );
    return result === null
      ? NextResponse.json({ error: "战局不存在。" }, { status: 404 })
      : NextResponse.json(result, { status: result.reused ? 200 : 201 });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json({ error: "确认采访提取失败。" }, { status: 500 });
  }
}
