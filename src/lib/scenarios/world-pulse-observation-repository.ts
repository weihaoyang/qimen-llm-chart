import { randomUUID } from "node:crypto";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { hashSnapshot } from "@/lib/battle/product-state";
import { query, withTransaction } from "@/lib/db/pool";

const activeCollaborator = "c.status='active' AND (c.expires_at IS NULL OR c.expires_at>now())";
const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const json = (value: unknown) => JSON.stringify(value ?? {});

export type WorldPulseObservationInput = {
  source: string;
  observationKey: string;
  observationType: string;
  title: string;
  observedAt: string;
  location: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  sourceUrl?: string | null;
  idempotencyKey: string;
};

type ObservationRow = {
  id: string; battle_id: string; source: string; observation_key: string; observation_type: string;
  title: string; observed_at: Date; location_json: unknown; snapshot_json: unknown; source_url: string | null;
  actor_subject_type: string; actor_subject_id: string; idempotency_key: string; created_at: Date; updated_at: Date;
};

const mapRow = (row: ObservationRow) => ({
  id: row.id,
  battleId: row.battle_id,
  source: row.source,
  observationKey: row.observation_key,
  observationType: row.observation_type,
  title: row.title,
  observedAt: row.observed_at.toISOString(),
  location: row.location_json,
  snapshot: row.snapshot_json,
  sourceUrl: row.source_url,
  actor: { subjectType: row.actor_subject_type, subjectId: row.actor_subject_id },
  idempotencyKey: row.idempotency_key,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export async function listWorldPulseObservations(subject: AccountSubject, battleId: string) {
  const access = await query<{ allowed: boolean }>(
    `SELECT true AS allowed FROM battle_cases b WHERE b.id=$1
      AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id
          AND c.subject_type=$2 AND c.subject_id=$3 AND ${activeCollaborator}))`,
    [battleId, ...owner(subject)],
  );
  if (!access.rowCount) return null;
  const result = await query<ObservationRow>(
    `SELECT o.id,o.battle_id,o.source,o.observation_key,o.observation_type,o.title,o.observed_at,
            o.location_json,o.snapshot_json,o.source_url,o.actor_subject_type,o.actor_subject_id,
            o.idempotency_key,o.created_at,o.updated_at
       FROM battle_world_pulse_observations o JOIN battle_cases b ON b.id=o.battle_id
      WHERE o.battle_id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id
          AND c.subject_type=$2 AND c.subject_id=$3 AND ${activeCollaborator}))
      ORDER BY o.observed_at DESC,o.created_at DESC`,
    [battleId, ...owner(subject)],
  );
  return result.rows.map(mapRow);
}

export async function recordWorldPulseObservation(subject: AccountSubject, battleId: string, input: WorldPulseObservationInput) {
  return withTransaction(async (client) => {
    const access = await client.query(
      `SELECT b.id FROM battle_cases b WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id
          AND c.subject_type=$2 AND c.subject_id=$3 AND ${activeCollaborator} AND c.role='contributor')) FOR UPDATE`,
      [battleId, ...owner(subject)],
    );
    if (!access.rowCount) return null;
    const payloadHash = hashSnapshot({ source: input.source, observationKey: input.observationKey,
      observationType: input.observationType, title: input.title, observedAt: input.observedAt,
      location: input.location, snapshot: input.snapshot, sourceUrl: input.sourceUrl ?? null });
    const existing = await client.query<{ id: string; payload_hash: string }>(
      `SELECT id,payload_hash FROM battle_world_pulse_observations
        WHERE battle_id=$1 AND source=$2 AND observation_key=$3 AND idempotency_key=$4 LIMIT 1`,
      [battleId, input.source, input.observationKey, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].payload_hash !== payloadHash) return "conflict" as const;
      const saved = await client.query<ObservationRow>(
        `SELECT id,battle_id,source,observation_key,observation_type,title,observed_at,location_json,snapshot_json,
                source_url,actor_subject_type,actor_subject_id,idempotency_key,created_at,updated_at
           FROM battle_world_pulse_observations WHERE id=$1`, [existing.rows[0].id],
      );
      return saved.rows[0] ? { ...mapRow(saved.rows[0]), reused: true } : "conflict" as const;
    }
    const saved = await client.query<ObservationRow>(
      `INSERT INTO battle_world_pulse_observations
        (id,battle_id,source,observation_key,observation_type,title,observed_at,location_json,snapshot_json,
         source_url,actor_subject_type,actor_subject_id,idempotency_key,payload_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14)
       RETURNING id,battle_id,source,observation_key,observation_type,title,observed_at,location_json,snapshot_json,
                 source_url,actor_subject_type,actor_subject_id,idempotency_key,created_at,updated_at`,
      [randomUUID(), battleId, input.source, input.observationKey, input.observationType, input.title,
        input.observedAt, json(input.location), json(input.snapshot), input.sourceUrl ?? null,
        subject.subjectType, subject.subjectId, input.idempotencyKey, payloadHash],
    );
    await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
    return saved.rows[0] ? { ...mapRow(saved.rows[0]), reused: false } : null;
  });
}
