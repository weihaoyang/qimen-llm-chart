import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { getLatestResourceSnapshot, saveResourceSnapshot } from "@/lib/battle/repository";
import { isUuid } from "@/lib/battle/input";
import type { ResourceSnapshot } from "@/lib/battle/types";

type Context = { params: Promise<{ id: string }> };
const numericKeys: Array<keyof ResourceSnapshot> = [
  "cashAvailable", "monthlyFixedCost", "monthlyNetCashflow", "weeklyHoursAvailable",
  "weeklyHoursCommitted", "consecutiveHighPressureDays", "maxHighPressureDays",
];

const parseSnapshot = (value: unknown): ResourceSnapshot | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result: ResourceSnapshot = {};
  for (const key of numericKeys) {
    const item = source[key];
    if (item === undefined || item === null || item === "") continue;
    if (typeof item !== "number" || !Number.isFinite(item) || item < 0) return null;
    result[key] = item;
  }
  return result;
};

export async function GET(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isUuid(id)) return noStore({ error: "战局标识无效。" }, { status: 400 });
    const snapshot = await getLatestResourceSnapshot(await requireAccountSubject(request), id);
    return snapshot === null ? noStore({ error: "战局不存在。" }, { status: 404 }) : noStore({ snapshot });
  } catch (error) {
    return errorResponse(error, "读取资源快照失败。");
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    if (!isUuid(id)) return noStore({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as { snapshot?: unknown } | null;
    const snapshot = parseSnapshot(body?.snapshot);
    if (!snapshot || Object.keys(snapshot).length === 0) return noStore({ error: "至少填写一项有效资源。" }, { status: 400 });
    const result = await saveResourceSnapshot(await requireAccountSubject(request), id, snapshot);
    return result === null ? noStore({ error: "战局不存在。" }, { status: 404 }) : noStore(result);
  } catch (error) {
    return errorResponse(error, "保存资源快照失败。");
  }
}
