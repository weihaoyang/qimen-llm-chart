import { NextResponse } from "next/server";
import { AccountSubjectError, requireAccountSubject } from "@/lib/agent/account-subject";
import { asRecord, asText, isUuid } from "@/lib/battle/input";
import { getWorldPulseProject, saveWorldPulseProject } from "@/lib/scenarios/world-pulse-project-repository";

type Context = { params: Promise<{ id: string }> };
const projectKeyPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function validateProject(project: Record<string, unknown>) {
  const schemaVersion = Number(project.version);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > 100) return "场景项目版本无效。";
  if (!Array.isArray(project.scenes) || project.scenes.length > 100) return "场景项目必须包含不超过 100 个场景。";
  let shotCount = 0;
  for (const scene of project.scenes) {
    const value = asRecord(scene);
    if (!value || !asText(value.id, 160) || !asText(value.title, 240) || !Array.isArray(value.shots)) return "场景项目结构无效。";
    shotCount += value.shots.length;
    if (shotCount > 500) return "单个场景项目最多保存 500 个镜头。";
  }
  return null;
}

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const url = new URL(request.url);
    const projectKey = url.searchParams.get("projectKey") || "default";
    if (!projectKeyPattern.test(projectKey)) return NextResponse.json({ error: "场景项目标识无效。" }, { status: 400 });
    const result = await getWorldPulseProject(await requireAccountSubject(request), id, projectKey);
    return result ? NextResponse.json({ project: result.project }) : NextResponse.json({ error: "战局不存在或无权访问。" }, { status: 404 });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json({ error: "读取世界脉冲场景项目失败。" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ error: "战局标识无效。" }, { status: 400 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const project = asRecord(body?.project);
    const projectKey = asText(body?.projectKey, 64) || "default";
    const idempotencyKey = asText(body?.idempotencyKey, 160) || asText(request.headers.get("idempotency-key"), 160);
    const expectedVersion = body?.expectedVersion === undefined ? undefined : Number(body.expectedVersion);
    if (!project || !projectKeyPattern.test(projectKey) || !idempotencyKey || (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0))) {
      return NextResponse.json({ error: "场景项目保存参数无效。" }, { status: 400 });
    }
    const serialized = JSON.stringify(project);
    if (serialized.length > 1_000_000) return NextResponse.json({ error: "场景项目超过 1MB 上限。", reasonCode: "payload_too_large" }, { status: 413 });
    const validationError = validateProject(project);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const saved = await saveWorldPulseProject(await requireAccountSubject(request), id, {
      projectKey,
      schemaVersion: Number(project.version),
      project,
      idempotencyKey,
      expectedVersion,
    });
    if (!saved) return NextResponse.json({ error: "战局不存在或无写入权限。" }, { status: 403 });
    if (saved === "idempotency_conflict") return NextResponse.json({ error: "幂等键已绑定到不同场景项目。", reasonCode: saved }, { status: 409 });
    if (saved === "version_conflict") return NextResponse.json({ error: "场景项目已在其他窗口更新，请刷新后重试。", reasonCode: saved }, { status: 409 });
    return NextResponse.json({ project: saved }, { status: saved.version === 1 && !saved.reused ? 201 : 200 });
  } catch (error) {
    return error instanceof AccountSubjectError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : NextResponse.json({ error: "保存世界脉冲场景项目失败。" }, { status: 500 });
  }
}
