import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";

const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const activeCollaborator = "c.status='active' AND (c.expires_at IS NULL OR c.expires_at>now())";
const parse = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export type InterviewTurnInput = {
  role: "user" | "assistant";
  content: string;
  structured?: Record<string, unknown>;
  extractionStatus?: "none" | "pending" | "accepted";
  idempotencyKey?: string;
  clientMessageId?: string;
};

const accessPredicate = `(b.platform_subject_type=$2 AND b.platform_subject_id=$3)
  OR EXISTS (SELECT 1 FROM battle_collaborators c
             WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3
               AND ${activeCollaborator})`;

export async function appendInterviewTurn(subject: AccountSubject, battleId: string, input: InterviewTurnInput) {
  return withTransaction(async (client) => {
    const access = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${accessPredicate}) FOR UPDATE`, [battleId, ...owner(subject)]);
    if (!access.rowCount) return null;
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`battle-interview:${battleId}`]);

    if (input.idempotencyKey) {
      const existing = await client.query<{ id:string; sequence_no:number; role:string; content:string; structured_json:unknown; extraction_status:string; client_message_id:string|null; created_at:Date }>(
        `SELECT id,sequence_no,role,content,structured_json,extraction_status,client_message_id,created_at
           FROM battle_interview_turns WHERE battle_id=$1 AND idempotency_key=$2 LIMIT 1`,
        [battleId, input.idempotencyKey],
      );
      if (existing.rows[0]) return map(existing.rows[0]);
    }
    const sequence = (await client.query<{ next:number }>(
      `SELECT COALESCE(MAX(sequence_no),0)+1 AS next FROM battle_interview_turns WHERE battle_id=$1`, [battleId],
    )).rows[0].next;
    const row = (await client.query<{ id:string; sequence_no:number; role:string; content:string; structured_json:unknown; extraction_status:string; client_message_id:string|null; created_at:Date }>(
      `INSERT INTO battle_interview_turns(id,battle_id,sequence_no,actor_subject_type,actor_subject_id,role,client_message_id,content,structured_json,extraction_status,idempotency_key)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
       RETURNING id,sequence_no,role,content,structured_json,extraction_status,client_message_id,created_at`,
      [randomUUID(), battleId, sequence, subject.subjectType, subject.subjectId, input.role, input.clientMessageId ?? null, input.content, JSON.stringify(input.structured ?? {}), input.extractionStatus ?? "none", input.idempotencyKey ?? null],
    )).rows[0];
    await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
    return map(row);
  });
}

export async function markInterviewTurnAccepted(subject: AccountSubject, battleId: string, clientMessageId: string) {
  const result = await query<{ id:string }>(
    `UPDATE battle_interview_turns t SET extraction_status='accepted'
       FROM battle_cases b
      WHERE t.battle_id=$1 AND t.client_message_id=$2 AND t.role='assistant' AND b.id=t.battle_id
        AND ((b.platform_subject_type=$3 AND b.platform_subject_id=$4)
          OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$3 AND c.subject_id=$4 AND ${activeCollaborator} AND c.role='contributor'))
      RETURNING t.id`,
    [battleId, clientMessageId, ...owner(subject)],
  );
  return Boolean(result.rowCount);
}

export async function listInterviewTurns(subject: AccountSubject, battleId: string) {
  const result = await query<{ id:string; sequence_no:number; role:string; content:string; structured_json:unknown; extraction_status:string; client_message_id:string|null; created_at:Date }>(
    `SELECT t.id,t.sequence_no,t.role,t.content,t.structured_json,t.extraction_status,t.client_message_id,t.created_at
       FROM battle_interview_turns t JOIN battle_cases b ON b.id=t.battle_id
      WHERE t.battle_id=$1 AND (${accessPredicate})
      ORDER BY t.sequence_no`,
    [battleId, ...owner(subject)],
  );
  return result.rows.map(map);
}

function map(row: { id:string; sequence_no:number; role:string; content:string; structured_json:unknown; extraction_status:string; client_message_id:string|null; created_at:Date }) {
  return {
    id: row.client_message_id ?? row.id,
    sequenceNo: row.sequence_no,
    role: row.role as "user" | "assistant",
    content: row.content,
    structured: parse(row.structured_json),
    extractionStatus: row.extraction_status as "none" | "pending" | "accepted",
    createdAt: row.created_at.toISOString(),
  };
}
