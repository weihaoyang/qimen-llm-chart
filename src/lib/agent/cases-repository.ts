import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
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
  const result = await query<CaseRow>(`UPDATE agent_cases SET title=$4,question=$5,status=$6,deadline=$7,updated_at=now() WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND deleted_at IS NULL RETURNING id,title,question,status,deadline,created_at,updated_at`, [id, ...ownership(subject), input.title ?? current.title, input.question ?? current.question, input.status ?? current.status, input.deadline === undefined ? current.deadline : input.deadline]);
  return result.rows[0] ? mapCase(result.rows[0]) : null;
};

export const deleteCase = async (subject: AccountSubject, id: string) => {
  const result = await query(`UPDATE agent_cases SET deleted_at=now(),updated_at=now() WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND deleted_at IS NULL`, [id, ...ownership(subject)]);
  return result.rowCount === 1;
};

export const listTurns = async (subject: AccountSubject, caseId: string) => {
  const result = await query<{ id:string; sequence_no:number; role:"user"|"assistant"; content:string; phase:string; created_at:Date }>(`SELECT t.id,t.sequence_no,t.role,t.content,t.phase,t.created_at FROM agent_interview_turns t JOIN agent_cases c ON c.id=t.case_id WHERE t.case_id=$1 AND c.platform_subject_type=$2 AND c.platform_subject_id=$3 AND c.deleted_at IS NULL ORDER BY t.sequence_no`, [caseId, ...ownership(subject)]);
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

export const saveTreeVersion = async (subject: AccountSubject, caseId: string, input: { root:unknown; generatedFromTurnId?:string|null; branches?:Array<{ key:string; title:string; assumptions?:unknown; firstAction?:string; cost?:string; risks?:unknown; validationDate?:string|null; stopCondition?:string }> }) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT id FROM agent_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND deleted_at IS NULL FOR UPDATE`, [caseId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const versionResult = await client.query<{ version:number }>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM agent_decision_tree_versions WHERE case_id=$1`, [caseId]);
  const version = versionResult.rows[0].version;
  const treeId = randomUUID();
  await client.query(`INSERT INTO agent_decision_tree_versions(id,case_id,version,root_json,generated_from_turn_id) VALUES($1,$2,$3,$4::jsonb,$5)`, [treeId,caseId,version,JSON.stringify(input.root),input.generatedFromTurnId ?? null]);
  for (const branch of input.branches ?? []) await client.query(`INSERT INTO agent_decision_branches(id,tree_version_id,branch_key,title,assumptions_json,first_action,cost,risks_json,validation_date,stop_condition) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10)`, [randomUUID(),treeId,branch.key,branch.title,JSON.stringify(branch.assumptions ?? []),branch.firstAction ?? "",branch.cost ?? "",JSON.stringify(branch.risks ?? []),branch.validationDate ?? null,branch.stopCondition ?? ""]);
  return { id: treeId, version };
});
