import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { getModuleState, saveModuleState } from "@/lib/battle/product-state";
import { isUuid, asRecord } from "@/lib/battle/input";

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
    const saved = await saveModuleState(await requireAccountSubject(request), id, moduleId, state, asRecord(body?.consent) ?? {});
    return saved ? NextResponse.json({ state:saved }) : NextResponse.json({ error:"战局不存在或无写入权限。" }, { status:403 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"保存模块状态失败。" }, { status:500 }); }
}
