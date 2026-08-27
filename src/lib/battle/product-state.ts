import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";

const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const writableCollaborator = `EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3 AND c.status='active' AND c.role IN ('contributor','advisor'))`;
const json = (value: unknown) => JSON.stringify(value ?? {});
const parse = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};

function redactViewerModule(moduleId: string, state: Record<string, unknown>) {
  const redacted: Record<string, unknown> = { ...state };
  if (moduleId === "ai-symbiote") {
    // Long-term memories are account-private even when the battle is shared.
    // Expose aggregate bond progress, never the memory text/source.
    if (Array.isArray(redacted.longTermMemories)) redacted.longTermMemories = redacted.longTermMemories.map((memory) => {
      const item = parse(memory);
      return { id:item.id, title:"已授权记忆", consentStatus:item.consentStatus ?? "active", updatedAt:item.updatedAt };
    });
    delete redacted.adaptiveToneNotes;
    delete redacted.dialogueTendency;
    return redacted;
  }
  if (moduleId !== "decision-board") return state;
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

export async function beginUsageOperation(subject: AccountSubject, battleId: string, operation: string, idempotencyKey: string, payloadHash: string) {
  return withTransaction(async (client) => {
    const access = await client.query(`SELECT id FROM battle_cases b WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3) OR ${writableCollaborator}) FOR UPDATE`, [battleId, ...owner(subject)]);
    if (!access.rowCount) return null;
    const existing = await client.query<{ id:string; status:string; usage_json:unknown; error_message:string|null; payload_hash:string; reservation_id:string|null }>(`SELECT id,status,usage_json,error_message,payload_hash,reservation_id FROM battle_usage_operations WHERE battle_id=$1 AND operation=$2 AND idempotency_key=$3 FOR UPDATE`, [battleId, operation,idempotencyKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.payload_hash && row.payload_hash !== payloadHash) return { operationId:row.id,status:"conflict",usage:row.usage_json,reservationId:row.reservation_id,errorMessage:"幂等键已绑定到不同的业务状态。",reused:true };
      if (row.status === "failed") {
        await client.query(`UPDATE battle_usage_operations SET status='pending',payload_hash=$2,reservation_id=NULL,usage_json=NULL,error_message=NULL,completed_at=NULL WHERE id=$1`,[row.id,payloadHash]);
        return { operationId:row.id,status:"pending",usage:null,reservationId:null,errorMessage:null,reused:false };
      }
      return { operationId:row.id,status:row.status,usage:row.usage_json,reservationId:row.reservation_id,errorMessage:row.error_message,reused:true };
    }
    const id = randomUUID();
    await client.query(`INSERT INTO battle_usage_operations(id,battle_id,operation,idempotency_key,status,payload_hash) VALUES($1,$2,$3,$4,'pending',$5)`, [id, battleId, operation, idempotencyKey,payloadHash]);
    return { operationId:id,status:'pending',usage:null,reservationId:null,errorMessage:null,reused:false };
  });
}

export async function setUsageOperationReservation(subject: AccountSubject,battleId:string,operationId:string,reservationId:string) {
  const result = await query(`UPDATE battle_usage_operations u SET reservation_id=$4 FROM battle_cases b WHERE u.id=$1 AND u.battle_id=$2 AND u.status='pending' AND b.id=u.battle_id AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$5 AND c.status='active' AND c.role IN ('contributor','advisor')))`,[operationId,battleId,subject.subjectType,reservationId,subject.subjectId]);
  return Boolean(result.rowCount);
}

export async function markUsageOperationCharged(subject: AccountSubject, battleId: string, operationId: string, usage: unknown) {
  const result = await query(`UPDATE battle_usage_operations u SET status='charged',usage_json=$4::jsonb FROM battle_cases b WHERE u.id=$1 AND u.battle_id=$2 AND u.status='pending' AND b.id=u.battle_id AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$5 AND c.status='active' AND c.role IN ('contributor','advisor')))`,[operationId,battleId,subject.subjectType,JSON.stringify(usage ?? {}),subject.subjectId]);
  return Boolean(result.rowCount);
}

export async function finishUsageOperation(subject: AccountSubject, battleId: string, operationId: string, usage: unknown) {
  const result = await query(`UPDATE battle_usage_operations u SET status='succeeded',usage_json=$4::jsonb,completed_at=now() FROM battle_cases b WHERE u.id=$1 AND u.battle_id=$2 AND u.status IN ('pending','charged') AND b.id=u.battle_id AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$5 AND c.status='active' AND c.role IN ('contributor','advisor')))` , [operationId, battleId, subject.subjectType, JSON.stringify(usage ?? {}), subject.subjectId]);
  return Boolean(result.rowCount);
}

export async function failUsageOperation(subject: AccountSubject, battleId: string, operationId: string, message: string) {
  const result = await query(`UPDATE battle_usage_operations u SET status='failed',reservation_id=NULL,error_message=$4,completed_at=now() FROM battle_cases b WHERE u.id=$1 AND u.battle_id=$2 AND b.id=u.battle_id AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$5 AND c.status='active' AND c.role IN ('contributor','advisor')))` , [operationId, battleId, subject.subjectType, message, subject.subjectId]);
  return Boolean(result.rowCount);
}

export async function createAiJob(subject: AccountSubject, battleId: string, kind: string, idempotencyKey: string, input: unknown, promptVersion: string) {
  return withTransaction(async (client) => {
    const access = await client.query(`SELECT id FROM battle_cases b WHERE id=$1 AND ((platform_subject_type=$2 AND platform_subject_id=$3) OR ${writableCollaborator}) FOR UPDATE`, [battleId, ...owner(subject)]);
    if (!access.rowCount) return null;
    const snapshotHash = hashSnapshot(input);
    const existing = await client.query<{ id:string; status:string; created_at:Date; started_at:Date|null; run_token:string }>(`SELECT id,status,created_at,started_at,run_token FROM battle_ai_jobs WHERE battle_id=$1 AND kind=$2 AND idempotency_key=$3 FOR UPDATE`, [battleId, kind, idempotencyKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      const leaseAt = row.started_at ?? row.created_at;
      const stale = (row.status === "queued" || row.status === "running" || row.status === "committing") && Date.now() - leaseAt.getTime() > 10 * 60_000;
      if (row.status === "failed" || row.status === "timed_out" || stale) {
        const runToken = randomUUID();
        await client.query(`UPDATE battle_ai_jobs SET status='queued',run_token=$2,input_snapshot_hash=$3,input_json=$4::jsonb,prompt_version=$5,model_version=NULL,result_json=NULL,error_code=NULL,error_message=NULL,created_at=now(),started_at=NULL,completed_at=NULL WHERE id=$1`, [row.id,runToken,snapshotHash,json(input),promptVersion]);
        return { jobId:row.id, status:"queued", runToken, reused:false };
      }
      return { jobId: row.id, status: row.status, runToken: row.run_token, reused: true };
    }
    const id = randomUUID();
    const runToken = randomUUID();
    await client.query(`INSERT INTO battle_ai_jobs(id,battle_id,kind,idempotency_key,status,run_token,input_snapshot_hash,input_json,prompt_version) VALUES($1,$2,$3,$4,'queued',$5,$6,$7::jsonb,$8)`, [id, battleId, kind, idempotencyKey, runToken, snapshotHash, json(input), promptVersion]);
    return { jobId: id, status: "queued", runToken, reused: false };
  });
}

export async function getAiJob(subject: AccountSubject, battleId: string, jobId: string) {
  await query(
    `UPDATE battle_ai_jobs j SET status='timed_out',error_code='job_timed_out',error_message='AI 任务超过最大执行时间，请重新发起。',completed_at=now()
       FROM battle_cases b
      WHERE j.id=$1 AND j.battle_id=$2 AND b.id=j.battle_id
        AND j.status IN ('queued','running','committing') AND COALESCE(j.started_at,j.created_at) < now() - interval '10 minutes'
        AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$4) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$4 AND c.status='active'))`,
    [jobId, battleId, ...owner(subject)],
  );
  const result = await query<{ id:string; kind:string; status:string; input_snapshot_hash:string; prompt_version:string; model_version:string|null; result_json:unknown; error_code:string|null; error_message:string|null; created_at:Date; completed_at:Date|null }>(`SELECT j.id,j.kind,j.status,j.input_snapshot_hash,j.prompt_version,j.model_version,j.result_json,j.error_code,j.error_message,j.created_at,j.completed_at FROM battle_ai_jobs j JOIN battle_cases b ON b.id=j.battle_id WHERE j.id=$1 AND j.battle_id=$2 AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$4) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$4 AND c.status='active'))`, [jobId, battleId, ...owner(subject)]);
  const row = result.rows[0];
  return row ? { jobId: row.id, battleId, kind: row.kind, status: row.status, inputSnapshotHash: row.input_snapshot_hash, promptVersion: row.prompt_version, modelVersion: row.model_version, result: row.result_json, errorCode: row.error_code, errorMessage: row.error_message, createdAt: row.created_at.toISOString(), completedAt: row.completed_at?.toISOString() ?? null } : null;
}

export async function startAiJob(subject: AccountSubject, battleId: string, jobId: string, runToken: string) {
  const result = await query<{ id:string }>(`UPDATE battle_ai_jobs j SET status='running',started_at=now() FROM battle_cases b WHERE j.id=$1 AND j.battle_id=$2 AND j.run_token=$3 AND j.status IN ('queued','running') AND b.id=j.battle_id AND ((b.platform_subject_type=$4 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$4 AND c.subject_id=$5 AND c.status='active' AND c.role IN ('contributor','advisor'))) RETURNING j.id`, [jobId,battleId,runToken,...owner(subject)]);
  return Boolean(result.rowCount);
}

export async function claimAiJobCommit(subject: AccountSubject, battleId: string, jobId: string, runToken: string) {
  const result = await query<{ id:string }>(`UPDATE battle_ai_jobs j SET status='committing' FROM battle_cases b WHERE j.id=$1 AND j.battle_id=$2 AND j.run_token=$3 AND j.status='running' AND b.id=j.battle_id AND ((b.platform_subject_type=$4 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$4 AND c.subject_id=$5 AND c.status='active' AND c.role IN ('contributor','advisor'))) RETURNING j.id`, [jobId,battleId,runToken,...owner(subject)]);
  return Boolean(result.rowCount);
}

export async function finishAiJob(subject: AccountSubject, battleId: string, jobId: string, runToken: string, resultValue: unknown, modelVersion: string | null) {
  const result = await query<{ id:string }>(`UPDATE battle_ai_jobs j SET status='succeeded',result_json=$4::jsonb,model_version=$5,completed_at=now() FROM battle_cases b WHERE j.id=$1 AND j.battle_id=$2 AND j.run_token=$3 AND j.status='committing' AND b.id=j.battle_id AND ((b.platform_subject_type=$6 AND b.platform_subject_id=$7) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$6 AND c.subject_id=$7 AND c.status='active' AND c.role IN ('contributor','advisor'))) RETURNING j.id`, [jobId,battleId,runToken,json(resultValue),modelVersion,...owner(subject)]);
  return Boolean(result.rowCount);
}

export async function failAiJob(subject: AccountSubject, battleId: string, jobId: string, runToken: string, errorCode: string, message: string) {
  const result = await query<{ id:string }>(`UPDATE battle_ai_jobs j SET status='failed',error_code=$4,error_message=$5,completed_at=now() FROM battle_cases b WHERE j.id=$1 AND j.battle_id=$2 AND j.run_token=$3 AND j.status IN ('queued','running','committing') AND b.id=j.battle_id AND ((b.platform_subject_type=$6 AND b.platform_subject_id=$7) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$6 AND c.subject_id=$7 AND c.status='active' AND c.role IN ('contributor','advisor'))) RETURNING j.id`, [jobId,battleId,runToken,errorCode,message,...owner(subject)]);
  return Boolean(result.rowCount);
}


export async function listMemories(subject: AccountSubject) {
  const result = await query<{ id:string; battle_id:string|null; title:string; memory_json:unknown; source_json:unknown; consent_status:string; created_at:Date; updated_at:Date }>(`SELECT id,battle_id,title,memory_json,source_json,consent_status,created_at,updated_at FROM battle_memory_records WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND consent_status <> 'deleted' ORDER BY updated_at DESC`, owner(subject));
  return result.rows.map((row) => ({ id:row.id, battleId:row.battle_id, title:row.title, memory:parse(row.memory_json), source:parse(row.source_json), consentStatus:row.consent_status, createdAt:row.created_at.toISOString(), updatedAt:row.updated_at.toISOString() }));
}

export async function listActiveMemorySummaries(subject: AccountSubject) {
  const result = await query<{ id:string; title:string; memory_json:unknown; updated_at:Date }>(
    `SELECT id,title,memory_json,updated_at FROM battle_memory_records
      WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND consent_status='active'
      ORDER BY updated_at DESC LIMIT 20`,
    owner(subject),
  );
  return result.rows.map((row) => {
    const memory = parse(row.memory_json);
    // Only inject a small, explicit decision summary. Do not forward arbitrary
    // module state or source metadata into every model request.
    const summary = Object.fromEntries(["userKeyChoice","outcome","outcomeLabel","memoryQuote","lessonLearned","timestamp"]
      .filter((key) => typeof memory[key] === "string")
      .map((key) => [key, String(memory[key]).slice(0, 1000)]));
    return { id:row.id, title:row.title, summary, updatedAt:row.updated_at.toISOString() };
  });
}

export async function saveMemory(subject: AccountSubject, input: { id?:string; battleId?:string|null; title:string; memory:Record<string, unknown>; source?:Record<string, unknown>; consentStatus?:"active"|"paused"|"revoked" }) {
  return withTransaction(async (client) => {
    const revoked = input.consentStatus === "revoked";
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
    const result = await client.query<{ id:string; battle_id:string|null; title:string; memory_json:unknown; source_json:unknown; consent_status:string; created_at:Date; updated_at:Date }>(`INSERT INTO battle_memory_records(id,battle_id,platform_subject_type,platform_subject_id,title,memory_json,source_json,consent_status) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) ON CONFLICT (id) DO UPDATE SET battle_id=EXCLUDED.battle_id,title=EXCLUDED.title,memory_json=EXCLUDED.memory_json,source_json=EXCLUDED.source_json,consent_status=EXCLUDED.consent_status,updated_at=now() WHERE battle_memory_records.platform_subject_type=$3 AND battle_memory_records.platform_subject_id=$4 RETURNING id,battle_id,title,memory_json,source_json,consent_status,created_at,updated_at`, [id,revoked ? null : input.battleId ?? null,...owner(subject),input.title,json(revoked ? {} : input.memory),json(revoked ? { reason:"consent_revoked" } : input.source ?? {}),input.consentStatus ?? "active"]);
    const row = result.rows[0];
    return row ? { id:row.id, battleId:row.battle_id, title:row.title, memory:parse(row.memory_json), source:parse(row.source_json), consentStatus:row.consent_status, createdAt:row.created_at.toISOString(), updatedAt:row.updated_at.toISOString() } : null;
  });
}

export async function deleteMemory(subject: AccountSubject, id:string) {
  const result = await query(`UPDATE battle_memory_records SET battle_id=NULL,title='已删除记忆',memory_json='{}'::jsonb,source_json='{"reason":"user_deleted"}'::jsonb,consent_status='deleted',updated_at=now() WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3`, [id,...owner(subject)]);
  return Boolean(result.rowCount);
}
