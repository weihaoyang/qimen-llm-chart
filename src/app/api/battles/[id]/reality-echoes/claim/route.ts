import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid, asText } from "@/lib/battle/input";
import { claimRealityEchoReward } from "@/lib/battle/product-state";

type Context = { params: Promise<{ id:string }> };

/** Queue a completed reality echo for platform reward review. */
export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return noStore({ error:"战局标识无效。" }, { status:400 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const echoId = asText(body?.echoId, 160);
    if (!echoId) return noStore({ error:"回响标识无效。" }, { status:400 });
    const result = await claimRealityEchoReward(await requireAccountSubject(request), id, echoId);
    if (result === null) return noStore({ error:"战局不存在或无写入权限。" }, { status:403 });
    if (result === "not_ready") return noStore({ error:"当前回响尚未达到可申请终局奖励的条件。", reasonCode:"reality_echo_not_ready" }, { status:409 });
    return noStore({ state:result, reused:result.reused });
  } catch (error) {
    return errorResponse(error, "提交现实回响奖励申请失败。");
  }
}
