import { createHash, randomUUID } from "node:crypto";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { query, withTransaction } from "@/lib/db/pool";

const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const activeCollaborator = "c.status='active' AND (c.expires_at IS NULL OR c.expires_at>now())";
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const hash = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

export type WorldPulseCalibration = {
  cameraId: string;
  version: number;
  values: Record<string, number>;
  savedAt: string;
  contentHash: string;
};

type Row = { camera_id:string; version:number; calibration_json:Record<string, unknown>; created_at:Date; content_hash:string };
const mapRow = (row: Row): WorldPulseCalibration => ({
  cameraId: row.camera_id,
  version: row.version,
  values: Object.fromEntries(Object.entries(row.calibration_json).map(([key, value]) => [key, Number(value)])),
  savedAt: row.created_at.toISOString(),
  contentHash: row.content_hash,
});

async function access(subject: AccountSubject, battleId: string, write = false) {
  const result = await query(
    `SELECT b.id FROM battle_cases b
      WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (SELECT 1 FROM battle_collaborators c
          WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3
            AND ${activeCollaborator}${write ? " AND c.role='contributor'" : ""}))`,
    [battleId, ...owner(subject)],
  );
  return Boolean(result.rowCount);
}

export async function listWorldPulseCalibrations(subject: AccountSubject, battleId: string) {
  if (!(await access(subject, battleId))) return null;
  const result = await query<Row>(
    `SELECT DISTINCT ON (camera_id) camera_id,version,calibration_json,created_at,content_hash
       FROM battle_world_pulse_calibrations WHERE battle_id=$1
      ORDER BY camera_id,version DESC`, [battleId],
  );
  return result.rows.map(mapRow);
}

export async function saveWorldPulseCalibration(subject: AccountSubject, battleId: string, input: {
  cameraId: string; values: Record<string, number>; idempotencyKey: string;
}) {
  return withTransaction(async (client) => {
    const allowed = await client.query(
      `SELECT b.id FROM battle_cases b WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3
          AND ${activeCollaborator} AND c.role='contributor')) FOR UPDATE`, [battleId, ...owner(subject)],
    );
    if (!allowed.rowCount) return null;
    const contentHash = hash(input.values);
    const existing = await client.query<Row>(
      `SELECT camera_id,version,calibration_json,created_at,content_hash FROM battle_world_pulse_calibrations
        WHERE battle_id=$1 AND camera_id=$2 AND idempotency_key=$3 LIMIT 1`,
      [battleId, input.cameraId, input.idempotencyKey],
    );
    if (existing.rows[0]) return existing.rows[0].content_hash === contentHash ? { ...mapRow(existing.rows[0]), reused:true } : "idempotency_conflict" as const;
    const current = await client.query<{ version:number }>(
      `SELECT version FROM battle_world_pulse_calibrations WHERE battle_id=$1 AND camera_id=$2 ORDER BY version DESC LIMIT 1`, [battleId, input.cameraId],
    );
    const version = (current.rows[0]?.version ?? 0) + 1;
    const saved = await client.query<Row>(
      `INSERT INTO battle_world_pulse_calibrations(id,battle_id,camera_id,version,calibration_json,actor_subject_type,actor_subject_id,idempotency_key,content_hash)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
       RETURNING camera_id,version,calibration_json,created_at,content_hash`,
      [randomUUID(), battleId, input.cameraId, version, JSON.stringify(input.values), ...owner(subject), input.idempotencyKey, contentHash],
    );
    await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
    return { ...mapRow(saved.rows[0]), reused:false };
  });
}

export async function resetWorldPulseCalibration(subject: AccountSubject, battleId: string, cameraId: string) {
  return withTransaction(async (client) => {
    const allowed = await client.query(
      `SELECT b.id FROM battle_cases b WHERE b.id=$1 AND ((b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3
          AND ${activeCollaborator} AND c.role='contributor')) FOR UPDATE`, [battleId, ...owner(subject)],
    );
    if (!allowed.rowCount) return null;
    const result = await client.query(`DELETE FROM battle_world_pulse_calibrations WHERE battle_id=$1 AND camera_id=$2`, [battleId, cameraId]);
    if (result.rowCount) await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
    return { deleted: true };
  });
}
