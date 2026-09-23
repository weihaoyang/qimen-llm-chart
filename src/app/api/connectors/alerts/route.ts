import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { dismissConnectorAlert, listConnectorAlerts } from "@/lib/platform/connectors";

const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: Request) {
  try { return noStore({ alerts: await listConnectorAlerts(await requireAccountSubject(request)) }); }
  catch (error) { return errorResponse(error, "读取观察者信号失败。"); }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!isUuid(id)) return noStore({ error:"信号标识无效。" }, { status:400 });
    return noStore({ dismissed: await dismissConnectorAlert(await requireAccountSubject(request), id) });
  } catch (error) { return errorResponse(error, "忽略观察者信号失败。"); }
}
