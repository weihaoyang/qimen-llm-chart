import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { asDate, asRecord, asText, isInventoryCategory, isUuid } from "@/lib/battle/input";
import { listInventory, replaceInventory, type InventoryWrite } from "@/lib/battle/repository";
type Context = { params: Promise<{ id: string }> };
const availability=["available","limited","blocked","expired"];
export async function GET(request: Request, context: Context) { try { const id=(await context.params).id; if(!isUuid(id)) return noStore({error:"战局标识无效。"},{status:400}); const items=await listInventory(await requireAccountSubject(request),id); return items===null?noStore({error:"战局不存在。"},{status:404}):noStore({inventory:items}); } catch(error){ return errorResponse(error, "读取底牌失败。"); } }
export async function PUT(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isUuid(id)) return noStore({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { inventory?: unknown } | null;
    if (!Array.isArray(body?.inventory) || body.inventory.length > 50) return noStore({ error: "底牌列表无效。" }, { status: 400 });
    const items: InventoryWrite[] = body.inventory.map((value) => {
      const item = value as Record<string, unknown>;
      const expiresAt = asDate(item.expiresAt);
      return {
        id: item.id === undefined ? undefined : (isUuid(item.id) ? item.id : "__invalid__"),
        category: item.category,
        label: asText(item.label, 160),
        description: asText(item.description, 6000, false),
        quantity: item.quantity === null || item.quantity === undefined ? null : typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : undefined,
        unit: asText(item.unit, 32, false),
        availability: item.availability ?? "available",
        expiresAt,
        cost: asRecord(item.cost) ?? {},
        evidence: asRecord(item.evidence) ?? {},
      } as InventoryWrite;
    });
    if (items.some((item) => item.id === "__invalid__" || !isInventoryCategory(item.category) || !item.label || item.description === null || item.quantity === undefined || !availability.includes(String(item.availability)) || item.expiresAt === undefined)) {
      return noStore({ error: "底牌字段无效。" }, { status: 400 });
    }
    const result = await replaceInventory(await requireAccountSubject(request), id, items);
    return result === null ? noStore({ error: "战局不存在。" }, { status: 404 }) : noStore({ inventory: result });
  } catch (error) {
    return errorResponse(error, "保存底牌失败。");
  }
}
