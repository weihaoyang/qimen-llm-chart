import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import { LIST_READ_LIMIT } from "@/lib/db/read-limits";
import type { AccountSubject } from "./account-subject";

export type AgentCase = {
  id: string;
  title: string;
  question: string;
  status: "active" | "decided" | "archived";
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
};

type CaseRow = { id: string; title: string; question: string; status: AgentCase["status"]; deadline: Date | null; created_at: Date; updated_at: Date };
const mapCase = (row: CaseRow): AgentCase => ({ id: row.id, title: row.title, question: row.question, status: row.status, deadline: row.deadline?.toISOString() ?? null, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() });

const ownership = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];

export const listCases = async (subject: AccountSubject) => {
  const result = await query<CaseRow>(`SELECT id,title,question,status,deadline,created_at,updated_at FROM agent_cases WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 100`, ownership(subject));
  return result.rows.map(mapCase);
};

export const createCase = async (subject: AccountSubject, input: { title: string; question: string; deadline?: string | null }) => {
  const id = randomUUID();
  const values = [id, ...ownership(subject), input.title, input.question, input.deadline || null];
  const result = await query<CaseRow>(`INSERT INTO agent_cases(id,platform_subject_type,platform_subject_id,title,question,deadline) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,title,question,status,deadline,created_at,updated_at`, values);
  return mapCase(result.rows[0]);
};

export const getCase = async (subject: AccountSubject, id: string) => {
  const result = await query<CaseRow>(`SELECT id,title,question,status,deadline,created_at,updated_at FROM agent_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND deleted_at IS NULL`, [id, ...ownership(subject)]);
  return result.rows[0] ? mapCase(result.rows[0]) : null;
};

export const updateCase = async (subject: AccountSubject, id: string, input: { title?: string; question?: string; status?: AgentCase["status"]; deadline?: string | null }) => {
  const current = await getCase(subject, id);
  if (!current) return null;
  const next = {
    title: input.title?.trim() || current.title,
    question: input.question?.trim() || current.question,
    status: input.status ?? current.status,
    deadline: input.deadline === undefined ? current.deadline : input.deadline,
  };
  const result = await query<CaseRow>(`UPDATE agent_cases SET title=$1,question=$2,status=$3,deadline=$4,updated_at=now() WHERE id=$5 AND platform_subject_type=$6 AND platform_subject_id=$7 AND deleted_at IS NULL RETURNING id,title,question,status,deadline,created_at,updated_at`, [next.title, next.question, next.status, next.deadline, id, ...ownership(subject)]);
  return result.rows[0] ? mapCase(result.rows[0]) : null;
};

export const deleteCase = async (subject: AccountSubject, id: string) => {
  const result = await query(`UPDATE agent_cases SET deleted_at=now(),updated_at=now() WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND deleted_at IS NULL`, [id, ...ownership(subject)]);
  return result.rowCount === 1;
};

export const listTurns = async (subject: AccountSubject, caseId: string) => {
  const result = await query<{ id:string; sequence_no:number; role:"user"|"assistant"; content:string; phase:string; created_at:Date }>(`SELECT t.id,t.sequence_no,t.role,t.content,t.phase,t.created_at FROM agent_interview_turns t JOIN agent_cases c ON c.id=t.case_id WHERE t.case_id=$1 AND c.platform_subject_type=$2 AND c.platform_subject_id=$3 AND c.deleted_at IS NULL ORDER BY t.sequence_no LIMIT ${LIST_READ_LIMIT}`, [caseId, ...ownership(subject)]);
  return result.rows.map((row) => ({ id: row.id, sequenceNo: row.sequence_no, role: row.role, content: row.content, phase: row.phase, createdAt: row.created_at.toISOString() }));
};

export const appendTurn = async (subject: AccountSubject, caseId: string, input: { role:"user"|"assistant"; content:string; phase:string }) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT id FROM agent_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND deleted_at IS NULL FOR UPDATE`, [caseId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const result = await client.query<{ id:string; sequence_no:number; role:"user"|"assistant"; content:string; phase:string; created_at:Date }>(`INSERT INTO agent_interview_turns(id,case_id,sequence_no,role,content,phase) SELECT $1,$2,COALESCE(MAX(sequence_no),0)+1,$3,$4,$5 FROM agent_interview_turns WHERE case_id=$2 RETURNING id,sequence_no,role,content,phase,created_at`, [randomUUID(), caseId, input.role, input.content, input.phase]);
  await client.query(`UPDATE agent_cases SET updated_at=now() WHERE id=$1`, [caseId]);
  const row = result.rows[0];
  return { id: row.id, sequenceNo: row.sequence_no, role: row.role, content: row.content, phase: row.phase, createdAt: row.created_at.toISOString() };
});

export const saveEvidenceSnapshot = async (subject: AccountSubject, caseId: string, input: { mode:string; sourceText:string; structuredJson:unknown }) => {
  const owner = await getCase(subject, caseId);
  if (!owner) return null;
  const id = randomUUID();
  await query(`INSERT INTO agent_evidence_snapshots(id,case_id,mode,source_text,structured_json) VALUES($1,$2,$3,$4,$5::jsonb)`, [id,caseId,input.mode,input.sourceText,JSON.stringify(input.structuredJson)]);
  return { id };
};

export const getLatestEvidenceSnapshot = async (subject: AccountSubject, caseId: string) => {
  const result = await query<{ id:string; mode:string; source_text:string; structured_json:unknown; created_at:Date }>(`SELECT e.id,e.mode,e.source_text,e.structured_json,e.created_at FROM agent_evidence_snapshots e JOIN agent_cases c ON c.id=e.case_id WHERE e.case_id=$1 AND c.platform_subject_type=$2 AND c.platform_subject_id=$3 AND c.deleted_at IS NULL ORDER BY e.created_at DESC LIMIT 1`, [caseId, ...ownership(subject)]);
  const row = result.rows[0];
  return row ? { id: row.id, mode: row.mode, sourceText: row.source_text, structuredJson: row.structured_json, createdAt: row.created_at.toISOString() } : null;
};
