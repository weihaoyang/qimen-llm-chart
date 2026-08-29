import { randomUUID } from "node:crypto";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { hashSnapshot } from "@/lib/battle/product-state";
import { query, withTransaction } from "@/lib/db/pool";

const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const activeCollaborator = "c.status='active' AND (c.expires_at IS NULL OR c.expires_at>now())";
const json = (value: unknown) => JSON.stringify(value ?? {});

type ProjectRow = {
  id: string;
  battle_id: string;
  project_key: string;
  version: number;
  schema_version: number;
  project_json: unknown;
  actor_subject_type: string;
  actor_subject_id: string;
  idempotency_key: string;
  content_hash: string;
  created_at: Date;
};

const mapRow = (row: ProjectRow) => ({
  id: row.id,
  battleId: row.battle_id,
  projectKey: row.project_key,
  version: row.version,
  schemaVersion: row.schema_version,
  project: row.project_json,
  actor: { subjectType: row.actor_subject_type, subjectId: row.actor_subject_id },
  idempotencyKey: row.idempotency_key,
  contentHash: row.content_hash,
  createdAt: row.created_at.toISOString(),
});

export async function getWorldPulseProject(subject: AccountSubject, battleId: string, projectKey = "default") {
  const access = await query<{ allowed: boolean }>(
    `SELECT true AS allowed FROM battle_cases b
      WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (SELECT 1 FROM battle_collaborators c
          WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3 AND ${activeCollaborator}))`,
    [battleId, ...owner(subject)],
  );
  if (!access.rowCount) return null;
  const result = await query<ProjectRow>(
    `SELECT id,battle_id,project_key,version,schema_version,project_json,
            actor_subject_type,actor_subject_id,idempotency_key,content_hash,created_at
       FROM battle_world_pulse_projects
      WHERE battle_id=$1 AND project_key=$2
      ORDER BY version DESC LIMIT 1`,
    [battleId, projectKey],
  );
  return { accessible: true as const, project: result.rows[0] ? mapRow(result.rows[0]) : null };
}

export async function saveWorldPulseProject(
  subject: AccountSubject,
  battleId: string,
  input: {
    projectKey?: string;
    schemaVersion: number;
    project: Record<string, unknown>;
    idempotencyKey: string;
    expectedVersion?: number;
  },
) {
  const projectKey = input.projectKey ?? "default";
  return withTransaction(async (client) => {
    const access = await client.query(
      `SELECT b.id FROM battle_cases b
        WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
          OR EXISTS (SELECT 1 FROM battle_collaborators c
            WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3
              AND ${activeCollaborator} AND c.role='contributor')) FOR UPDATE`,
      [battleId, ...owner(subject)],
    );
    if (!access.rowCount) return null;

    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`world-pulse-project:${battleId}:${projectKey}`]);
    const contentHash = hashSnapshot(input.project);
    const existing = await client.query<ProjectRow>(
      `SELECT id,battle_id,project_key,version,schema_version,project_json,
              actor_subject_type,actor_subject_id,idempotency_key,content_hash,created_at
         FROM battle_world_pulse_projects
        WHERE battle_id=$1 AND project_key=$2 AND idempotency_key=$3 LIMIT 1`,
      [battleId, projectKey, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].content_hash !== contentHash) return "idempotency_conflict" as const;
      return { ...mapRow(existing.rows[0]), reused: true };
    }

    const current = await client.query<{ version: number }>(
      `SELECT version FROM battle_world_pulse_projects
        WHERE battle_id=$1 AND project_key=$2 ORDER BY version DESC LIMIT 1`,
      [battleId, projectKey],
    );
    const currentVersion = current.rows[0]?.version ?? 0;
    if (input.expectedVersion !== undefined && input.expectedVersion !== currentVersion) return "version_conflict" as const;
    const nextVersion = currentVersion + 1;
    const saved = await client.query<ProjectRow>(
      `INSERT INTO battle_world_pulse_projects
        (id,battle_id,project_key,version,schema_version,project_json,actor_subject_type,
         actor_subject_id,idempotency_key,content_hash)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
       RETURNING id,battle_id,project_key,version,schema_version,project_json,
                 actor_subject_type,actor_subject_id,idempotency_key,content_hash,created_at`,
      [randomUUID(), battleId, projectKey, nextVersion, input.schemaVersion, json(input.project),
        subject.subjectType, subject.subjectId, input.idempotencyKey, contentHash],
    );
    await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
    return { ...mapRow(saved.rows[0]), reused: false };
  });
}
