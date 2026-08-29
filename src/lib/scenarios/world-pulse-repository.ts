import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { hashSnapshot } from "@/lib/battle/product-state";

const activeCollaborator = "c.status='active' AND (c.expires_at IS NULL OR c.expires_at>now())";
const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const json = (value: unknown) => JSON.stringify(value ?? {});

export type WorldPulseInterventionInput = {
  eventId: string;
  eventVersion: number;
  action: string;
  request?: Record<string, unknown>;
  result?: Record<string, unknown>;
  idempotencyKey: string;
  usageOperationId?: string | null;
};

type InterventionRow = {
  id: string; battle_id: string; event_id: string; event_version: number;
  actor_subject_type: string; actor_subject_id: string; action: string;
  status: string; request_json: unknown; result_json: unknown;
  usage_operation_id: string | null; idempotency_key: string;
  created_at: Date; updated_at: Date;
};

const mapRow = (row: InterventionRow) => ({
  id: row.id,
  battleId: row.battle_id,
  eventId: row.event_id,
  eventVersion: row.event_version,
  actor: { subjectType: row.actor_subject_type, subjectId: row.actor_subject_id },
  action: row.action,
  status: row.status,
  request: row.request_json,
  result: row.result_json,
  usageOperationId: row.usage_operation_id,
  idempotencyKey: row.idempotency_key,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export async function listWorldPulseInterventions(subject: AccountSubject, battleId: string) {
  const result = await query<InterventionRow>(
    `SELECT i.id,i.battle_id,i.event_id,i.event_version,i.actor_subject_type,i.actor_subject_id,
            i.action,i.status,i.request_json,i.result_json,i.usage_operation_id,
            i.idempotency_key,i.created_at,i.updated_at
       FROM battle_world_pulse_interventions i
       JOIN battle_cases b ON b.id=i.battle_id
      WHERE i.battle_id=$1
        AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
          OR EXISTS (SELECT 1 FROM battle_collaborators c
                       WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3
                         AND ${activeCollaborator}))
      ORDER BY i.created_at DESC`,
    [battleId, ...owner(subject)],
  );
  return result.rows.map(mapRow);
}

export async function recordWorldPulseIntervention(subject: AccountSubject, battleId: string, input: WorldPulseInterventionInput) {
  return withTransaction(async (client) => {
    const access = await client.query(
      `SELECT b.id
         FROM battle_cases b
        WHERE b.id=$1
          AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
            OR EXISTS (SELECT 1 FROM battle_collaborators c
                        WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3
                          AND ${activeCollaborator} AND c.role='contributor'))
        FOR UPDATE`,
      [battleId, ...owner(subject)],
    );
    if (!access.rowCount) return null;
    const payloadHash = hashSnapshot({ eventId: input.eventId, eventVersion: input.eventVersion, action: input.action, request: input.request ?? {}, result: input.result ?? {} });
    const existing = await client.query<{ id: string; payload_hash: string }>(
      `SELECT id,payload_hash FROM battle_world_pulse_interventions
        WHERE battle_id=$1 AND event_id=$2 AND idempotency_key=$3 LIMIT 1`,
      [battleId, input.eventId, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].payload_hash !== payloadHash) return "conflict" as const;
      const saved = await client.query<InterventionRow>(
        `SELECT id,battle_id,event_id,event_version,actor_subject_type,actor_subject_id,action,status,
                request_json,result_json,usage_operation_id,idempotency_key,created_at,updated_at
           FROM battle_world_pulse_interventions WHERE id=$1`, [existing.rows[0].id],
      );
      return saved.rows[0] ? { ...mapRow(saved.rows[0]), reused: true } : "conflict" as const;
    }
    const saved = await client.query<InterventionRow>(
      `INSERT INTO battle_world_pulse_interventions
        (id,battle_id,event_id,event_version,actor_subject_type,actor_subject_id,action,request_json,result_json,usage_operation_id,idempotency_key,payload_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12)
       RETURNING id,battle_id,event_id,event_version,actor_subject_type,actor_subject_id,action,status,
                 request_json,result_json,usage_operation_id,idempotency_key,created_at,updated_at`,
      [randomUUID(), battleId, input.eventId, input.eventVersion, subject.subjectType, subject.subjectId,
        input.action, json(input.request), json(input.result), input.usageOperationId ?? null, input.idempotencyKey, payloadHash],
    );
    await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
    return saved.rows[0] ? { ...mapRow(saved.rows[0]), reused: false } : null;
  });
}
