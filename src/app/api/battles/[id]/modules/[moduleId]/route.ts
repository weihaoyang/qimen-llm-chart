import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { getModuleState, saveModuleState } from "@/lib/battle/product-state";
import { isUuid, asRecord } from "@/lib/battle/input";
import { validateBattleModuleState } from "@/lib/battle/module-contract";

type Context = { params: Promise<{ id:string; moduleId:string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id, moduleId } = await context.params;
    if (!isUuid(id) || !/^[a-z0-9-]{2,64}$/.test(moduleId)) return NextResponse.json({ error: "模块标识无效。" }, { status: 400 });
    const state = await getModuleState(await requireAccountSubject(request), id, moduleId);
    return NextResponse.json({ state });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"读取模块状态失败。" }, { status:500 }); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id, moduleId } = await context.params;
    if (!isUuid(id) || !/^[a-z0-9-]{2,64}$/.test(moduleId)) return NextResponse.json({ error: "模块标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const state = asRecord(body?.state);
    if (!state) return NextResponse.json({ error: "模块状态必须是 JSON 对象。" }, { status:400 });
    // Module snapshots contain user-authored comments, memories and event
    // histories. Bound the serialized payload before it reaches JSONB so a
    // malformed client cannot exhaust request memory or inflate the database.
    const serializedState = JSON.stringify(state);
    if (serializedState.length > 512_000) return NextResponse.json({ error: "模块状态过大，请精简历史记录后重试。", reasonCode: "payload_too_large" }, { status:413 });
    const consent = asRecord(body?.consent) ?? {};
    if (JSON.stringify(consent).length > 32_000) return NextResponse.json({ error: "授权信息过大。", reasonCode: "payload_too_large" }, { status:413 });
    const validationError = validateBattleModuleState(moduleId, state);
    if (validationError) return NextResponse.json({ error: validationError, reasonCode: "module_state_invalid" }, { status: 400 });
    const saved = await saveModuleState(await requireAccountSubject(request), id, moduleId, state, consent);
    return saved ? NextResponse.json({ state:saved }) : NextResponse.json({ error:"战局不存在或无写入权限。" }, { status:403 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"保存模块状态失败。" }, { status:500 }); }
}
