import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { CONNECTOR_PROVIDERS, listConnectors, setConnectorStatus } from "@/lib/platform/connectors";

export async function GET(request: Request) {
  try { return NextResponse.json({ connectors: await listConnectors(await requireAccountSubject(request)) }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "读取连接状态失败。" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const provider = body?.provider;
    const action = body?.action;
    if (typeof provider !== "string" || !CONNECTOR_PROVIDERS.includes(provider as never) || (action !== "authorize" && action !== "revoke")) return NextResponse.json({ error: "连接器操作无效。" }, { status: 400 });
    const scopes = Array.isArray(body?.scopes) ? body.scopes.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
    const connector = await setConnectorStatus(await requireAccountSubject(request), provider as never, action === "authorize" ? "pending_authorization" : "revoked", scopes);
    return NextResponse.json({ connector }, { status: 200 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "更新连接状态失败。" }, { status: 500 }); }
}
