import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { saveModuleState } from "@/lib/battle/product-state";
import { buildBattleTiming } from "@/lib/battle/timing";

type Context = { params: Promise<{ id: string }> };

const isValidTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { timeZone?: unknown } | null;
    const timeZone = typeof body?.timeZone === "string" ? body.timeZone.trim() : "Asia/Shanghai";
    if (!timeZone || timeZone.length > 80 || !isValidTimeZone(timeZone)) {
      return NextResponse.json({ error: "时区无效。", reasonCode: "invalid_timezone" }, { status: 400 });
    }

    const subject = await requireAccountSubject(request);
    const timing = buildBattleTiming(new Date(), timeZone);
    const saved = await saveModuleState(
      subject,
      id,
      "battlefield-aux",
      { metaphysicsTiming: timing },
      { source: "server_qimen_chart", calculatedAt: timing.provenance.calculatedAt },
      { idempotencyKey: `timing:${id}:${timing.provenance.calculatedAt}` },
    );
    if (!saved) return NextResponse.json({ error: "战局不存在或无写入权限。" }, { status: 403 });
    if (saved === "conflict") return NextResponse.json({ error: "天时记录写入冲突，请重试。" }, { status: 409 });
    return NextResponse.json({ timing, state: saved });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json({ error: error instanceof Error ? error.message : "生成天时记录失败。" }, { status: 500 });
  }
}
