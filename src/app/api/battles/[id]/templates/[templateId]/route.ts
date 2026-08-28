import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { isUuid } from "@/lib/battle/input";
import { getBattle } from "@/lib/battle/repository";
import { getModuleState, saveModuleState } from "@/lib/battle/product-state";
import { readBearerToken, readCookieValue, readPlatformCookieHeader, fetchPlatformGate } from "@/lib/platform/server";
import { getOfficialCatalogEntry, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string; templateId: string }> }) {
  try {
    const { id, templateId } = await context.params;
    if (!isUuid(id) || !/^[a-z0-9][a-z0-9-]{1,96}$/.test(templateId)) return NextResponse.json({ error: "战局或模板标识无效。" }, { status: 400 });
    if (!await getOfficialCatalogEntry(OFFICIAL_CATALOG_TYPES.skillTemplate, templateId)) return NextResponse.json({ error: "模板不在官方目录中。" }, { status: 404 });
    const subject = await requireAccountSubject(request);
    if (!await getBattle(subject, id)) return NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
    const accessToken = readBearerToken(request.headers.get("authorization"));
    const cookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
    const csrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
    const gate = await fetchPlatformGate(accessToken, accessToken ? undefined : { cookieHeader, csrfToken });
    if (!gate.allowed) return NextResponse.json({ error: gate.message || "当前账户没有可用模板权益。", reasonCode: gate.reason_code }, { status: 402 });
    const current = await getModuleState(subject, id, "marketplace");
    const currentIds = Array.isArray(current?.state?.ownedTemplateIds) ? current.state.ownedTemplateIds.filter((value): value is string => typeof value === "string") : [];
    const ownedTemplateIds = Array.from(new Set([...currentIds, templateId]));
    const saved = await saveModuleState(subject, id, "marketplace", { ownedTemplateIds }, { source: "platform_entitlement", entitlementSource: gate.entitlement_source });
    return saved ? NextResponse.json({ templateId, ownedTemplateIds, state: saved }) : NextResponse.json({ error: "只有战局所有者可激活模板。" }, { status: 403 });
  } catch (error) {
    return error instanceof AccountSubjectError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: error instanceof Error ? error.message : "模板激活失败。" }, { status: 500 });
  }
}
