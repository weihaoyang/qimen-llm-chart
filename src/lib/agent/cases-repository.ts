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
  const branches: Array<{ id: string; key: string }> = [];
  for (const branch of input.branches ?? []) {
    const id = randomUUID();
    await client.query(`INSERT INTO agent_decision_branches(id,tree_version_id,branch_key,title,assumptions_json,first_action,cost,risks_json,validation_date,stop_condition) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10)`, [id,treeId,branch.key,branch.title,JSON.stringify(branch.assumptions ?? []),branch.firstAction ?? "",branch.cost ?? "",JSON.stringify(branch.risks ?? []),branch.validationDate ?? null,branch.stopCondition ?? ""]);
    branches.push({ id, key: branch.key });
  }
  return { id: treeId, version, branches };
});

export const getLatestTreeVersion = async (subject: AccountSubject, caseId: string) => {
  const owner = await getCase(subject, caseId);
  if (!owner) return null;
  const tree = await query<{ id:string; version:number; root_json:unknown; created_at:Date }>(`SELECT id,version,root_json,created_at FROM agent_decision_tree_versions WHERE case_id=$1 ORDER BY version DESC LIMIT 1`, [caseId]);
  const latest = tree.rows[0];
  if (!latest) return { version: null, tree: null };
  const branches = await query<{ id:string; branch_key:string; title:string; assumptions_json:unknown; first_action:string; cost:string; risks_json:unknown; validation_date:Date|null; stop_condition:string; selected_at:Date|null }>(`SELECT id,branch_key,title,assumptions_json,first_action,cost,risks_json,validation_date,stop_condition,selected_at FROM agent_decision_branches WHERE tree_version_id=$1 ORDER BY branch_key`, [latest.id]);
  return {
    version: latest.version,
    tree: {
      id: latest.id,
      root: latest.root_json,
      createdAt: latest.created_at.toISOString(),
      branches: branches.rows.map((branch) => ({ id: branch.id, key: branch.branch_key, title: branch.title, assumptions: branch.assumptions_json, firstAction: branch.first_action, cost: branch.cost, risks: branch.risks_json, validationDate: branch.validation_date?.toISOString() ?? null, stopCondition: branch.stop_condition, selectedAt: branch.selected_at?.toISOString() ?? null })),
    },
  };
};

export const selectTreeBranch = async (subject: AccountSubject, caseId: string, branchId: string) => withTransaction(async (client) => {
  const tree = await client.query<{ id: string }>(`SELECT t.id FROM agent_decision_tree_versions t JOIN agent_cases c ON c.id=t.case_id WHERE t.case_id=$1 AND t.version=(SELECT MAX(version) FROM agent_decision_tree_versions WHERE case_id=$1) AND c.platform_subject_type=$2 AND c.platform_subject_id=$3 AND c.deleted_at IS NULL FOR UPDATE`, [caseId, ...ownership(subject)]);
  const treeId = tree.rows[0]?.id;
  if (!treeId) return null;
  await client.query(`UPDATE agent_decision_branches SET selected_at=NULL WHERE tree_version_id=$1`, [treeId]);
  const selected = await client.query<{ id:string; branch_key:string; selected_at:Date }>(`UPDATE agent_decision_branches SET selected_at=now() WHERE id=$1 AND tree_version_id=$2 RETURNING id,branch_key,selected_at`, [branchId, treeId]);
  if (!selected.rowCount) return { invalidBranch: true as const };
  await client.query(`UPDATE agent_cases SET updated_at=now() WHERE id=$1`, [caseId]);
  const row = selected.rows[0];
  return { branch: { id: row.id, key: row.branch_key, selectedAt: row.selected_at.toISOString() } };
});

export type AgentReview = {
  id: string;
  caseId: string;
  branchId: string | null;
  outcome: string;
  facts: string;
  whatChanged: string;
  nextAdjustment: string;
  reviewedAt: string;
};

export const listReviews = async (subject: AccountSubject, caseId: string) => {
  const result = await query<{ id:string; case_id:string; branch_id:string|null; outcome:string; facts:string; what_changed:string; next_adjustment:string; reviewed_at:Date }>(`SELECT r.id,r.case_id,r.branch_id,r.outcome,r.facts,r.what_changed,r.next_adjustment,r.reviewed_at FROM agent_reviews r JOIN agent_cases c ON c.id=r.case_id WHERE r.case_id=$1 AND c.platform_subject_type=$2 AND c.platform_subject_id=$3 AND c.deleted_at IS NULL ORDER BY r.reviewed_at DESC LIMIT 50`, [caseId, ...ownership(subject)]);
  return result.rows.map((row): AgentReview => ({ id: row.id, caseId: row.case_id, branchId: row.branch_id, outcome: row.outcome, facts: row.facts, whatChanged: row.what_changed, nextAdjustment: row.next_adjustment, reviewedAt: row.reviewed_at.toISOString() }));
};

export const createReview = async (subject: AccountSubject, caseId: string, input: { branchId?: string | null; outcome: string; facts?: string; whatChanged?: string; nextAdjustment?: string }) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT id FROM agent_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND deleted_at IS NULL FOR UPDATE`, [caseId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  if (input.branchId) {
    const branch = await client.query(`SELECT b.id FROM agent_decision_branches b JOIN agent_decision_tree_versions t ON t.id=b.tree_version_id WHERE b.id=$1 AND t.case_id=$2`, [input.branchId, caseId]);
    if (!branch.rowCount) return { invalidBranch: true as const };
  }
  const result = await client.query<{ id:string; case_id:string; branch_id:string|null; outcome:string; facts:string; what_changed:string; next_adjustment:string; reviewed_at:Date }>(`INSERT INTO agent_reviews(id,case_id,branch_id,outcome,facts,what_changed,next_adjustment) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,case_id,branch_id,outcome,facts,what_changed,next_adjustment,reviewed_at`, [randomUUID(), caseId, input.branchId ?? null, input.outcome, input.facts ?? "", input.whatChanged ?? "", input.nextAdjustment ?? ""]);
  await client.query(`UPDATE agent_cases SET updated_at=now() WHERE id=$1`, [caseId]);
  const row = result.rows[0];
  return { review: { id: row.id, caseId: row.case_id, branchId: row.branch_id, outcome: row.outcome, facts: row.facts, whatChanged: row.what_changed, nextAdjustment: row.next_adjustment, reviewedAt: row.reviewed_at.toISOString() } satisfies AgentReview };
});
