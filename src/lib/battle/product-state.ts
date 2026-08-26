import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";

const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const json = (value: unknown) => JSON.stringify(value ?? {});
const parse = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};

function redactViewerModule(moduleId: string, state: Record<string, unknown>) {
  if (moduleId !== "decision-board") return state;
  const redacted: Record<string, unknown> = { ...state };
  delete redacted.shareToken;
  delete redacted.roomToken;
  if (Array.isArray(redacted.comments)) {
    redacted.comments = redacted.comments.map((comment) => {
      const item = parse(comment);
      return { ...item, authorName: "委员会成员", content: "（评论内容已按观察者权限脱敏）" };
    });
  }
  if (Array.isArray(redacted.ghostStrategies)) {
    redacted.ghostStrategies = redacted.ghostStrategies.map((strategy) => {
      const item = parse(strategy);
      return {
        ...item,
        creatorName: "外部参谋",
        coreThesis: "（策略论证已按观察者权限脱敏）",
        suggestedAction: "（执行动作已按观察者权限脱敏）",
        pros: "（优势已脱敏）",
        cons: "（代价已脱敏）",
      };
    });
  }
  return redacted;
}

export const hashSnapshot = (value: unknown) => createHash("sha256").update(json(value)).digest("hex");

export async function getModuleState(subject: AccountSubject, battleId: string, moduleId: string) {
  const result = await query<{ version:number; state_json:unknown; consent_json:unknown; updated_at:Date; access_role:string }>(
    `SELECT s.version,s.state_json,s.consent_json,s.updated_at,
      CASE WHEN b.platform_subject_type=$3 AND b.platform_subject_id=$4 THEN 'owner'
           ELSE COALESCE((SELECT c.role FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$4 AND c.status='active' LIMIT 1),'viewer') END AS access_role
      FROM battle_module_states s JOIN battle_cases b ON b.id=s.battle_id
      WHERE s.battle_id=$1 AND s.module_id=$2 AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$4) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$4 AND c.status='active'))
      ORDER BY s.version DESC LIMIT 1`,
    [battleId, moduleId, ...owner(subject)],
  );
  const row = result.rows[0];
  if (!row) return null;
  const state = parse(row.state_json);
  return { version: row.version, state: row.access_role === "viewer" ? redactViewerModule(moduleId, state) : state, consent: parse(row.consent_json), updatedAt: row.updated_at.toISOString() };
}

export async function saveModuleState(subject: AccountSubject, battleId: string, moduleId: string, state: Record<string, unknown>, consent: Record<string, unknown> = {}) {
  return withTransaction(async (client) => {
    const access = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3 AND c.status='active' AND c.role IN ('contributor','advisor'))) FOR UPDATE`, [battleId, ...owner(subject)]);
    if (!access.rowCount) return null;
    // Serialize version allocation for this battle/module pair. A plain
    // MAX(version)+1 is racy across two tabs or collaborators and can produce
    // duplicate versions (or force one writer to fail on the unique index).
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`battle-module:${battleId}:${moduleId}`]);
    const next = (await client.query<{ version:number }>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_module_states WHERE battle_id=$1 AND module_id=$2`, [battleId, moduleId])).rows[0].version;
    const result = await client.query<{ version:number; state_json:unknown; consent_json:unknown; updated_at:Date }>(`INSERT INTO battle_module_states(id,battle_id,module_id,version,state_json,consent_json) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb) RETURNING version,state_json,consent_json,updated_at`, [randomUUID(), battleId, moduleId, next, json(state), json(consent)]);
    await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
    const row = result.rows[0];
    return { version: row.version, state: parse(row.state_json), consent: parse(row.consent_json), updatedAt: row.updated_at.toISOString() };
  });
}

export async function beginUsageOperation(subject: AccountSubject, battleId: string, operation: string, idempotencyKey: string) {
  return withTransaction(async (client) => {
    const access = await client.query(`SELECT id FROM battle_cases b WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3 AND c.status='active')) FOR UPDATE`, [battleId, ...owner(subject)]);
    if (!access.rowCount) return null;
    const existing = await client.query<{ id:string; status:string; usage_json:unknown; error_message:string|null }>(`SELECT id,status,usage_json,error_message FROM battle_usage_operations WHERE battle_id=$1 AND operation=$2 AND idempotency_key=$3 FOR UPDATE`, [battleId, operation, idempotencyKey]);
    if (existing.rowCount) return { operationId: existing.rows[0].id, status: existing.rows[0].status, usage: existing.rows[0].usage_json, errorMessage: existing.rows[0].error_message, reused: true };
    const id = randomUUID();
    await client.query(`INSERT INTO battle_usage_operations(id,battle_id,operation,idempotency_key,status) VALUES($1,$2,$3,$4,'pending')`, [id, battleId, operation, idempotencyKey]);
    return { operationId: id, status: 'pending', usage: null, errorMessage: null, reused: false };
  });
}

export async function finishUsageOperation(subject: AccountSubject, battleId: string, operationId: string, usage: unknown) {
  const result = await query(`UPDATE battle_usage_operations u SET status='succeeded',usage_json=$4::jsonb,completed_at=now() FROM battle_cases b WHERE u.id=$1 AND u.battle_id=$2 AND b.id=u.battle_id AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$5 AND c.status='active'))`, [operationId, battleId, subject.subjectType, JSON.stringify(usage ?? {}), subject.subjectId]);
  return Boolean(result.rowCount);
}

export async function failUsageOperation(subject: AccountSubject, battleId: string, operationId: string, message: string) {
  const result = await query(`UPDATE battle_usage_operations u SET status='failed',error_message=$4,completed_at=now() FROM battle_cases b WHERE u.id=$1 AND u.battle_id=$2 AND b.id=u.battle_id AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$5 AND c.status='active'))`, [operationId, battleId, subject.subjectType, message, subject.subjectId]);
  return Boolean(result.rowCount);
}

export async function createAiJob(subject: AccountSubject, battleId: string, kind: string, idempotencyKey: string, input: unknown, promptVersion: string) {
  return withTransaction(async (client) => {
    const access = await client.query(`SELECT id FROM battle_cases WHERE id=$1 AND ((platform_subject_type=$2 AND platform_subject_id=$3) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=battle_cases.id AND c.subject_type=$2 AND c.subject_id=$3 AND c.status='active')) FOR UPDATE`, [battleId, ...owner(subject)]);
    if (!access.rowCount) return null;
    const snapshotHash = hashSnapshot(input);
    const existing = await client.query<{ id:string; status:string }>(`SELECT id,status FROM battle_ai_jobs WHERE battle_id=$1 AND kind=$2 AND idempotency_key=$3`, [battleId, kind, idempotencyKey]);
    if (existing.rowCount) return { jobId: existing.rows[0].id, status: existing.rows[0].status, reused: true };
    const id = randomUUID();
    await client.query(`INSERT INTO battle_ai_jobs(id,battle_id,kind,idempotency_key,status,input_snapshot_hash,input_json,prompt_version) VALUES($1,$2,$3,$4,'queued',$5,$6::jsonb,$7)`, [id, battleId, kind, idempotencyKey, snapshotHash, json(input), promptVersion]);
    return { jobId: id, status: "queued", reused: false };
  });
}

export async function getAiJob(subject: AccountSubject, battleId: string, jobId: string) {
  const result = await query<{ id:string; kind:string; status:string; input_snapshot_hash:string; prompt_version:string; model_version:string|null; result_json:unknown; error_code:string|null; error_message:string|null; created_at:Date; completed_at:Date|null }>(`SELECT j.id,j.kind,j.status,j.input_snapshot_hash,j.prompt_version,j.model_version,j.result_json,j.error_code,j.error_message,j.created_at,j.completed_at FROM battle_ai_jobs j JOIN battle_cases b ON b.id=j.battle_id WHERE j.id=$1 AND j.battle_id=$2 AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$4) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$4 AND c.status='active'))`, [jobId, battleId, ...owner(subject)]);
  const row = result.rows[0];
  return row ? { jobId: row.id, battleId, kind: row.kind, status: row.status, inputSnapshotHash: row.input_snapshot_hash, promptVersion: row.prompt_version, modelVersion: row.model_version, result: row.result_json, errorCode: row.error_code, errorMessage: row.error_message, createdAt: row.created_at.toISOString(), completedAt: row.completed_at?.toISOString() ?? null } : null;
}

export async function startAiJob(subject: AccountSubject, battleId: string, jobId: string) {
  const result = await query<{ id:string }>(`UPDATE battle_ai_jobs j SET status='running',started_at=COALESCE(started_at,now()) FROM battle_cases b WHERE j.id=$1 AND j.battle_id=$2 AND b.id=j.battle_id AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$4) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$4 AND c.status='active')) RETURNING j.id`, [jobId,battleId,...owner(subject)]);
  return Boolean(result.rowCount);
}

export async function finishAiJob(subject: AccountSubject, battleId: string, jobId: string, resultValue: unknown, modelVersion: string | null) {
  const result = await query<{ id:string }>(`UPDATE battle_ai_jobs j SET status='succeeded',result_json=$3::jsonb,model_version=$4,completed_at=now() FROM battle_cases b WHERE j.id=$1 AND j.battle_id=$2 AND b.id=j.battle_id AND ((b.platform_subject_type=$5 AND b.platform_subject_id=$6) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$5 AND c.subject_id=$6 AND c.status='active')) RETURNING j.id`, [jobId,battleId,json(resultValue),modelVersion,...owner(subject)]);
  return Boolean(result.rowCount);
}

export async function failAiJob(subject: AccountSubject, battleId: string, jobId: string, errorCode: string, message: string) {
  const result = await query<{ id:string }>(`UPDATE battle_ai_jobs j SET status='failed',error_code=$3,error_message=$4,completed_at=now() FROM battle_cases b WHERE j.id=$1 AND j.battle_id=$2 AND j.status IN ('queued','running') AND b.id=j.battle_id AND ((b.platform_subject_type=$5 AND b.platform_subject_id=$6) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$5 AND c.subject_id=$6 AND c.status='active')) RETURNING j.id`, [jobId,battleId,errorCode,message,...owner(subject)]);
  return Boolean(result.rowCount);
}


export async function listMemories(subject: AccountSubject) {
  const result = await query<{ id:string; battle_id:string|null; title:string; memory_json:unknown; source_json:unknown; consent_status:string; created_at:Date; updated_at:Date }>(`SELECT id,battle_id,title,memory_json,source_json,consent_status,created_at,updated_at FROM battle_memory_records WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND consent_status <> 'deleted' ORDER BY updated_at DESC`, owner(subject));
  return result.rows.map((row) => ({ id:row.id, battleId:row.battle_id, title:row.title, memory:parse(row.memory_json), source:parse(row.source_json), consentStatus:row.consent_status, createdAt:row.created_at.toISOString(), updatedAt:row.updated_at.toISOString() }));
}

export async function saveMemory(subject: AccountSubject, input: { id?:string; battleId?:string|null; title:string; memory:Record<string, unknown>; source?:Record<string, unknown>; consentStatus?:"active"|"paused"|"revoked" }) {
  return withTransaction(async (client) => {
    // A memory may only reference a battle the subject can access. Without
    // this check a client could attach an otherwise valid memory to another
    // account's battle UUID, creating cross-account metadata leakage and
    // making later consent/deletion semantics ambiguous.
    if (input.battleId) {
      const access = await client.query(
        `SELECT b.id FROM battle_cases b
         WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
           OR EXISTS (SELECT 1 FROM battle_collaborators c
                      WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3 AND c.status='active'))
         LIMIT 1`,
        [input.battleId, ...owner(subject)],
      );
      if (!access.rowCount) return null;
    }
    const id = input.id ?? randomUUID();
    const result = await client.query<{ id:string; battle_id:string|null; title:string; memory_json:unknown; source_json:unknown; consent_status:string; created_at:Date; updated_at:Date }>(`INSERT INTO battle_memory_records(id,battle_id,platform_subject_type,platform_subject_id,title,memory_json,source_json,consent_status) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,memory_json=EXCLUDED.memory_json,source_json=EXCLUDED.source_json,consent_status=EXCLUDED.consent_status,updated_at=now() WHERE battle_memory_records.platform_subject_type=$3 AND battle_memory_records.platform_subject_id=$4 RETURNING id,battle_id,title,memory_json,source_json,consent_status,created_at,updated_at`, [id,input.battleId ?? null,...owner(subject),input.title,json(input.memory),json(input.source ?? {}),input.consentStatus ?? "active"]);
    const row = result.rows[0];
    return row ? { id:row.id, battleId:row.battle_id, title:row.title, memory:parse(row.memory_json), source:parse(row.source_json), consentStatus:row.consent_status, createdAt:row.created_at.toISOString(), updatedAt:row.updated_at.toISOString() } : null;
  });
}

export async function deleteMemory(subject: AccountSubject, id:string) {
  const result = await query(`UPDATE battle_memory_records SET consent_status='deleted',updated_at=now() WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3`, [id,...owner(subject)]);
  return Boolean(result.rowCount);
}
