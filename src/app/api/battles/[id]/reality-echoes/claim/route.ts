import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid, asText } from "@/lib/battle/input";
import { claimRealityEchoReward } from "@/lib/battle/product-state";

type Context = { params: Promise<{ id:string }> };

/** Queue a completed reality echo for platform reward review. */
export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error:"战局标识无效。" }, { status:400 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const echoId = asText(body?.echoId, 160);
    if (!echoId) return NextResponse.json({ error:"回响标识无效。" }, { status:400 });
    const result = await claimRealityEchoReward(await requireAccountSubject(request), id, echoId);
    if (result === null) return NextResponse.json({ error:"战局不存在或无写入权限。" }, { status:403 });
    if (result === "not_ready") return NextResponse.json({ error:"当前回响尚未达到可申请终局奖励的条件。", reasonCode:"reality_echo_not_ready" }, { status:409 });
    return NextResponse.json({ state:result, reused:result.reused });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error:error.message }, { status:error.status })
      : NextResponse.json({ error:"提交现实回响奖励申请失败。" }, { status:500 });
  }
}
