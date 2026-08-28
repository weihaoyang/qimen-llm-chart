import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { dismissConnectorAlert, listConnectorAlerts } from "@/lib/platform/connectors";

const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: Request) {
  try { return NextResponse.json({ alerts: await listConnectorAlerts(await requireAccountSubject(request)) }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"读取观察者信号失败。" }, { status:500 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!isUuid(id)) return NextResponse.json({ error:"信号标识无效。" }, { status:400 });
    return NextResponse.json({ dismissed: await dismissConnectorAlert(await requireAccountSubject(request), id) });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"忽略观察者信号失败。" }, { status:500 }); }
}
