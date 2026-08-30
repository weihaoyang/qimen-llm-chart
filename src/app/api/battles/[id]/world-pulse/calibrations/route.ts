import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { asRecord, asText, isUuid } from "@/lib/battle/input";
import { listWorldPulseCalibrations, resetWorldPulseCalibration, saveWorldPulseCalibration } from "@/lib/scenarios/world-pulse-calibration-repository";

type Context = { params: Promise<{ id:string }> };
const cameraPattern = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,159}$/;
const fields = ["offsetNorthM","offsetEastM","headingDeg","pitchDeg","fovDeg","rangeScale","heightM"] as const;
const ranges: Record<(typeof fields)[number], [number,number]> = { offsetNorthM:[-900,900], offsetEastM:[-900,900], headingDeg:[-180,180], pitchDeg:[-45,45], fovDeg:[-50,50], rangeScale:[0.35,3], heightM:[-120,240] };

function parseValues(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  const out: Record<string, number> = {};
  for (const field of fields) {
    const number = Number(record[field]);
    const [min,max] = ranges[field];
    if (!Number.isFinite(number) || number < min || number > max) return null;
    out[field] = Math.round(number * 100) / 100;
  }
  return out;
}

export async function GET(request: Request, context: Context) {
  try { const { id } = await context.params; if (!isUuid(id)) return NextResponse.json({ error:"战局标识无效。" }, { status:400 }); const calibrations = await listWorldPulseCalibrations(await requireAccountSubject(request), id); return calibrations === null ? NextResponse.json({ error:"战局不存在或无权访问。" }, { status:404 }) : NextResponse.json({ calibrations }); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"读取 CCTV 校准失败。" }, { status:500 }); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params; if (!isUuid(id)) return NextResponse.json({ error:"战局标识无效。" }, { status:400 });
    const body = await request.json().catch(() => null) as Record<string,unknown> | null;
    const cameraId = asText(body?.cameraId, 160); const values = parseValues(body?.values); const idempotencyKey = asText(body?.idempotencyKey, 160) || asText(request.headers.get("idempotency-key"), 160);
    if (!cameraId || !cameraPattern.test(cameraId) || !values || !idempotencyKey) return NextResponse.json({ error:"CCTV 校准参数无效。" }, { status:400 });
    const saved = await saveWorldPulseCalibration(await requireAccountSubject(request), id, { cameraId, values, idempotencyKey });
    if (!saved) return NextResponse.json({ error:"战局不存在或无写入权限。" }, { status:403 });
    if (saved === "idempotency_conflict") return NextResponse.json({ error:"相同幂等键已绑定到不同校准。", reasonCode:saved }, { status:409 });
    return NextResponse.json({ calibration:saved }, { status:saved.reused ? 200 : 201 });
  } catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"保存 CCTV 校准失败。" }, { status:500 }); }
}

export async function DELETE(request: Request, context: Context) {
  try { const { id } = await context.params; if (!isUuid(id)) return NextResponse.json({ error:"战局标识无效。" }, { status:400 }); const cameraId = asText(new URL(request.url).searchParams.get("cameraId"), 160); if (!cameraId || !cameraPattern.test(cameraId)) return NextResponse.json({ error:"摄像头标识无效。" }, { status:400 }); const result = await resetWorldPulseCalibration(await requireAccountSubject(request), id, cameraId); return result === null ? NextResponse.json({ error:"战局不存在或无写入权限。" }, { status:403 }) : NextResponse.json(result); }
  catch (error) { return error instanceof AccountSubjectError ? NextResponse.json({ error:error.message }, { status:error.status }) : NextResponse.json({ error:"重置 CCTV 校准失败。" }, { status:500 }); }
}
