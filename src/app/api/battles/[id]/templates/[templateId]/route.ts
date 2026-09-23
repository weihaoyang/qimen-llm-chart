import { noStore } from "@/lib/http";
import { errorResponse } from "@/lib/api-error";
import { isUuid } from "@/lib/battle/input";
import { POST as consumeUsage } from "../../usage/route";
import { getOfficialCatalogEntry, OFFICIAL_CATALOG_TYPES } from "@/lib/catalog/official-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string; templateId: string }> }) {
  try {
    const { id, templateId } = await context.params;
    if (!isUuid(id) || !/^[a-z0-9][a-z0-9-]{1,96}$/.test(templateId)) return noStore({ error: "战局或模板标识无效。" }, { status: 400 });
    if (!await getOfficialCatalogEntry(OFFICIAL_CATALOG_TYPES.skillTemplate, templateId)) return noStore({ error: "模板不在官方目录中。" }, { status: 404 });
    const delegated = await consumeUsage(
      new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ operation: "template_activation", templateId, idempotencyKey: `template:${id}:${templateId}` }) }),
      { params: Promise.resolve({ id }) },
    );
    const payload = await delegated.json().catch(() => ({}));
    if (!delegated.ok) return noStore(payload, { status: delegated.status });
    const modulePayload = payload && typeof payload === "object" && payload.module && typeof payload.module === "object" ? payload.module as { state?: unknown } : {};
    const state = modulePayload.state && typeof modulePayload.state === "object" && !Array.isArray(modulePayload.state) ? modulePayload.state as { ownedTemplateIds?: unknown } : {};
    const ownedTemplateIds = Array.isArray(state.ownedTemplateIds) ? state.ownedTemplateIds.filter((value): value is string => typeof value === "string") : [templateId];
    return noStore({ templateId, ownedTemplateIds, state: payload.module });
  } catch (error) {
    return errorResponse(error, "模板激活失败。", 500);
  }
}
