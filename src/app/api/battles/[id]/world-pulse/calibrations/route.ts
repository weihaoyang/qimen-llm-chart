import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { asRecord, asText, isUuid } from "@/lib/battle/input";
import { listWorldPulseCalibrations, resetWorldPulseCalibration, saveWorldPulseCalibration } from "@/lib/scenarios/world-pulse-calibration-repository";

type Context = { params: Promise<{ id:string }> };
const cameraPattern = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,159}$/;
const fields = ["offsetNorthM","offsetEastM","headingDeg","pitchDeg","fovDeg","rangeScale","heightM"] as const;
const ranges: Record<(typeof fields)[number], [number,number]> = { offsetNorthM:[-900,900], offsetEastM:[-900,900], headingDeg:[-180,180], pitchDeg:[-45,45], fovDeg:[-50,50], rangeScale:[0.35,3], heightM:[-120,240] };

/**
 * Coerce one calibration field, rejecting everything that is not a number.
 *
 * `Number(value)` alone silently accepts `""`, `null`, `[]` and `false` as `0`,
 * and 0 is inside every one of these ranges — so a malformed payload was written
 * as a real, in-range calibration value. Numeric strings are still accepted
 * because the client sends the panel's text inputs, but an empty or non-numeric
 * string now fails the range check instead of passing it as zero.
 */
const toCalibrationNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

function parseValues(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  const out: Record<string, number> = {};
  for (const field of fields) {
    const number = toCalibrationNumber(record[field]);
    const [min,max] = ranges[field];
    if (!Number.isFinite(number) || number < min || number > max) return null;
    out[field] = Math.round(number * 100) / 100;
  }
  return out;
}

export async function GET(request: Request, context: Context) {
  try { const { id } = await context.params; if (!isUuid(id)) return noStore({ error:"战局标识无效。" }, { status:400 }); const calibrations = await listWorldPulseCalibrations(await requireAccountSubject(request), id); return calibrations === null ? noStore({ error:"战局不存在或无权访问。" }, { status:404 }) : noStore({ calibrations }); }
  catch (error) { return errorResponse(error, "读取 CCTV 校准失败。"); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params; if (!isUuid(id)) return noStore({ error:"战局标识无效。" }, { status:400 });
    const body = await request.json().catch(() => null) as Record<string,unknown> | null;
    const cameraId = asText(body?.cameraId, 160); const values = parseValues(body?.values); const idempotencyKey = asText(body?.idempotencyKey, 160) || asText(request.headers.get("idempotency-key"), 160);
    if (!cameraId || !cameraPattern.test(cameraId) || !values || !idempotencyKey) return noStore({ error:"CCTV 校准参数无效。" }, { status:400 });
    const saved = await saveWorldPulseCalibration(await requireAccountSubject(request), id, { cameraId, values, idempotencyKey });
    if (!saved) return noStore({ error:"战局不存在或无写入权限。" }, { status:403 });
    if (saved === "idempotency_conflict") return noStore({ error:"相同幂等键已绑定到不同校准。", reasonCode:saved }, { status:409 });
    return noStore({ calibration:saved }, { status:saved.reused ? 200 : 201 });
  } catch (error) { return errorResponse(error, "保存 CCTV 校准失败。"); }
}

export async function DELETE(request: Request, context: Context) {
  try { const { id } = await context.params; if (!isUuid(id)) return noStore({ error:"战局标识无效。" }, { status:400 }); const cameraId = asText(new URL(request.url).searchParams.get("cameraId"), 160); if (!cameraId || !cameraPattern.test(cameraId)) return noStore({ error:"摄像头标识无效。" }, { status:400 }); const result = await resetWorldPulseCalibration(await requireAccountSubject(request), id, cameraId); return result === null ? noStore({ error:"战局不存在或无写入权限。" }, { status:403 }) : noStore(result); }
  catch (error) { return errorResponse(error, "重置 CCTV 校准失败。"); }
}
