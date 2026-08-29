import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { getBattle, isBattleOwner } from "./repository";
import type { BattleAdvice, BattleAttachment, BattleReview, Collaborator, CollaboratorRole, Opportunity, ResourceAllocation, PlaybookEntry, CalibrationEvent, StrategyProfile, TimelineEdge, TimelineNode, TimelineRelation, TruthStatus, TimelineNodeKind, AdviceAdoption, AdviceStatus } from "./types";

type Json = Record<string, unknown>;
export class BattleIntegrityError extends Error { constructor(message: string) { super(message); this.name = "BattleIntegrityError"; } }
const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const activeCollaborator = "c.status='active' AND (c.expires_at IS NULL OR c.expires_at>now())";
// Canonical battle state is writable by the owner and contributors only.
// Advisors submit opinions through the advice/decision-board surfaces.
const writableBattlePredicate = `(b.platform_subject_type=$2 AND b.platform_subject_id=$3) OR EXISTS (SELECT 1 FROM battle_collaborators c WHERE c.battle_id=b.id AND c.subject_type=$2 AND c.subject_id=$3 AND ${activeCollaborator} AND c.role='contributor')`;
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const playbookSource = (visibility: PlaybookEntry["visibility"], source: Json): Json => visibility === "anonymous_pool"
  ? { layer: "anonymous_pool", provenance: "user_confirmed" }
  : source;
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;
const owned = async (subject: AccountSubject, battleId: string) => isBattleOwner(subject, battleId);
const accessible = async (subject: AccountSubject, battleId: string) => Boolean(await getBattle(subject, battleId));
const ownerBattleForClient = async (client: PoolClient, subject: AccountSubject, battleId: string) => {
  if (!battleId) return true;
  const result = await client.query(`SELECT 1 FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3`, [battleId, ...owner(subject)]);
  return Boolean(result.rowCount);
};
const targetExists = async (client: PoolClient, battleId: string, targetType: string, targetId: string | null) => {
  if (targetType === "battle") return targetId === null || targetId === battleId;
  if (!targetId) return false;
  if (targetType === "action") {
    const result = await client.query(`SELECT 1 FROM battle_move_actions a JOIN battle_moves m ON m.id=a.move_id WHERE a.id=$1 AND m.battle_id=$2`, [targetId, battleId]);
    return Boolean(result.rowCount);
  }
  const table = ({ fact: "battle_facts", junction: "battle_junctions", move: "battle_moves", commitment: "battle_commitments", review: "battle_reviews", node: "battle_timeline_nodes" } as Record<string,string>)[targetType];
  if (!table) return false;
  const result = await client.query(`SELECT 1 FROM ${table} WHERE id=$1 AND battle_id=$2`, [targetId, battleId]);
  return Boolean(result.rowCount);
};

export const getBattleAccess = async (subject: AccountSubject, battleId: string) => {
  // `getBattle` intentionally includes active collaborators.  It cannot be
  // used to decide ownership: doing so would promote every collaborator to
  // owner and bypass the write boundary for advice and other owner-only data.
  if (await isBattleOwner(subject, battleId)) {
    const own = await getBattle(subject, battleId);
    return own ? { battle:own, role:"owner" as const } : null;
  }
  const result = await query<{role:CollaboratorRole}>(`SELECT role FROM battle_collaborators c WHERE battle_id=$1 AND subject_type=$2 AND subject_id=$3 AND ${activeCollaborator}`, [battleId,...owner(subject)]);
  if (!result.rows[0]) return null;
  const battle = await getBattle(subject, battleId);
  return battle ? { battle, role:result.rows[0].role } : null;
};

type NodeRow = { id:string; battle_id:string; kind:TimelineNodeKind; title:string; description:string; starts_at:Date|null; ends_at:Date|null; truth_status:TruthStatus; importance:number; source_json:Json };
type EdgeRow = { id:string; battle_id:string; from_node_id:string; to_node_id:string; relation:TimelineRelation; confidence:number; evidence_json:Json };
type OpportunityRow = { id:string; battle_id:string; title:string; description:string; source_json:Json; opens_at:Date|null; best_action_at:Date|null; closes_at:Date|null; decay_json:Json; status:Opportunity["status"] };
type ReviewRow = { id:string; battle_id:string; commitment_id:string|null; outcome:string; facts:string; what_changed:string; diagnosis_json:Json; next_adjustment:string; reviewed_at:Date };

const mapNode = (r: NodeRow): TimelineNode => ({ id:r.id, battleId:r.battle_id, kind:r.kind, title:r.title, description:r.description, startsAt:iso(r.starts_at), endsAt:iso(r.ends_at), truthStatus:r.truth_status, importance:r.importance, source:record(r.source_json) });
const mapEdge = (r: EdgeRow): TimelineEdge => ({ id:r.id, battleId:r.battle_id, fromNodeId:r.from_node_id, toNodeId:r.to_node_id, relation:r.relation, confidence:r.confidence, evidence:record(r.evidence_json) });
const mapOpportunity = (r: OpportunityRow): Opportunity => ({ id:r.id, battleId:r.battle_id, title:r.title, description:r.description, source:record(r.source_json), opensAt:iso(r.opens_at), bestActionAt:iso(r.best_action_at), closesAt:iso(r.closes_at), decay:record(r.decay_json), status:r.status });
const mapReview = (r: ReviewRow): BattleReview => ({ id:r.id, battleId:r.battle_id, commitmentId:r.commitment_id, outcome:r.outcome, facts:r.facts, whatChanged:r.what_changed, diagnosis:record(r.diagnosis_json), nextAdjustment:r.next_adjustment, reviewedAt:r.reviewed_at.toISOString() });

export const listTimeline = async (subject: AccountSubject, battleId: string) => {
  if (!await accessible(subject, battleId)) return null;
  const [nodes, edges] = await Promise.all([
    query<NodeRow>(`SELECT id,battle_id,kind,title,description,starts_at,ends_at,truth_status,importance,source_json FROM battle_timeline_nodes WHERE battle_id=$1 ORDER BY starts_at NULLS LAST,created_at`, [battleId]),
    query<EdgeRow>(`SELECT id,battle_id,from_node_id,to_node_id,relation,confidence,evidence_json FROM battle_timeline_edges WHERE battle_id=$1 ORDER BY created_at`, [battleId]),
  ]);
  return { nodes:nodes.rows.map(mapNode), edges:edges.rows.map(mapEdge) };
};

export const addTimeline = async (subject: AccountSubject, battleId: string, nodes: Array<Omit<TimelineNode,"id"|"battleId">>, edges: Array<Omit<TimelineEdge,"id"|"battleId">>) => withTransaction(async (client) => {
  const check = await client.query(`SELECT id FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 FOR UPDATE`, [battleId, ...owner(subject)]);
  if (!check.rowCount) return null;
  for (const edge of edges) {
    const endpoints = await client.query<{count:string}>(`SELECT COUNT(*)::text AS count FROM battle_timeline_nodes WHERE battle_id=$1 AND id IN ($2,$3)`, [battleId, edge.fromNodeId, edge.toNodeId]);
    if (Number(endpoints.rows[0]?.count ?? 0) !== 2) throw new BattleIntegrityError("时间线连线只能连接当前战局的节点。");
  }
  const savedNodes: TimelineNode[] = [];
  for (const item of nodes) {
    const id = randomUUID();
    const row = await client.query<NodeRow>(`INSERT INTO battle_timeline_nodes(id,battle_id,kind,title,description,starts_at,ends_at,truth_status,importance,source_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id,battle_id,kind,title,description,starts_at,ends_at,truth_status,importance,source_json`, [id,battleId,item.kind,item.title,item.description,item.startsAt,item.endsAt,item.truthStatus,item.importance,JSON.stringify(item.source)]);
    savedNodes.push(mapNode(row.rows[0]));
  }
  const savedEdges: TimelineEdge[] = [];
  for (const item of edges) {
    const id = randomUUID();
    const row = await client.query<EdgeRow>(`INSERT INTO battle_timeline_edges(id,battle_id,from_node_id,to_node_id,relation,confidence,evidence_json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id,battle_id,from_node_id,to_node_id,relation,confidence,evidence_json`, [id,battleId,item.fromNodeId,item.toNodeId,item.relation,item.confidence,JSON.stringify(item.evidence)]);
    savedEdges.push(mapEdge(row.rows[0]));
  }
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return { nodes:savedNodes, edges:savedEdges };
});

export const listOpportunities = async (subject: AccountSubject, battleId: string) => {
  if (!await accessible(subject, battleId)) return null;
  const result = await query<OpportunityRow>(`SELECT id,battle_id,title,description,source_json,opens_at,best_action_at,closes_at,decay_json,status FROM battle_opportunities WHERE battle_id=$1 ORDER BY closes_at NULLS LAST,created_at DESC`, [battleId]);
  return result.rows.map(mapOpportunity);
};

export const replaceOpportunities = async (subject: AccountSubject, battleId: string, items: Array<Omit<Opportunity,"id"|"battleId"> & { id?: string }>) => withTransaction(async (client) => {
  const check = await client.query(`SELECT id FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 FOR UPDATE`, [battleId, ...owner(subject)]);
  if (!check.rowCount) return null;
  const ids = items.flatMap((item) => item.id ? [item.id] : []);
  await client.query(`DELETE FROM battle_opportunities WHERE battle_id=$1 AND status IN ('open','watching') AND NOT (id = ANY($2::uuid[]))`, [battleId, ids]);
  const saved: Opportunity[] = [];
  for (const item of items) {
    const id = item.id ?? randomUUID();
    const row = item.id
      ? await client.query<OpportunityRow>(`UPDATE battle_opportunities SET title=$3,description=$4,source_json=$5::jsonb,opens_at=$6,best_action_at=$7,closes_at=$8,decay_json=$9::jsonb,status=$10 WHERE id=$1 AND battle_id=$2 RETURNING id,battle_id,title,description,source_json,opens_at,best_action_at,closes_at,decay_json,status`, [id,battleId,item.title,item.description,JSON.stringify(item.source),item.opensAt,item.bestActionAt,item.closesAt,JSON.stringify(item.decay),item.status])
      : await client.query<OpportunityRow>(`INSERT INTO battle_opportunities(id,battle_id,title,description,source_json,opens_at,best_action_at,closes_at,decay_json,status) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10) RETURNING id,battle_id,title,description,source_json,opens_at,best_action_at,closes_at,decay_json,status`, [id,battleId,item.title,item.description,JSON.stringify(item.source),item.opensAt,item.bestActionAt,item.closesAt,JSON.stringify(item.decay),item.status]);
    if (!row.rows[0]) throw new BattleIntegrityError("机会标识不属于当前战局。");
    saved.push(mapOpportunity(row.rows[0]));
  }
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return saved;
});

export const listReviews = async (subject: AccountSubject, battleId: string) => {
  if (!await accessible(subject, battleId)) return null;
  const result = await query<ReviewRow>(`SELECT id,battle_id,commitment_id,outcome,facts,what_changed,diagnosis_json,next_adjustment,reviewed_at FROM battle_reviews WHERE battle_id=$1 ORDER BY reviewed_at DESC`, [battleId]);
  return result.rows.map(mapReview);
};

export const createReview = async (subject: AccountSubject, battleId: string, input: Omit<BattleReview,"id"|"battleId"|"reviewedAt">, idempotencyKey?: string | null) => withTransaction(async (client) => {
  // Reviews become canonical battle evidence and therefore follow the same
  // owner/contributor write boundary as facts, moves and module snapshots.
  const check = await client.query(`SELECT id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...owner(subject)]);
  if (!check.rowCount) return null;
  if (idempotencyKey) {
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`battle-review:${battleId}:${idempotencyKey}`]);
    const existing = await client.query<ReviewRow>(`SELECT id,battle_id,commitment_id,outcome,facts,what_changed,diagnosis_json,next_adjustment,reviewed_at FROM battle_reviews WHERE battle_id=$1 AND diagnosis_json->>'_idempotencyKey'=$2 ORDER BY reviewed_at DESC LIMIT 1`, [battleId, idempotencyKey]);
    if (existing.rows[0]) return { ...mapReview(existing.rows[0]), reused:true };
  }
  if (input.commitmentId) {
    const commitment = await client.query(`SELECT id FROM battle_commitments WHERE id=$1 AND battle_id=$2`, [input.commitmentId, battleId]);
    if (!commitment.rowCount) return null;
  }
  const id = randomUUID();
  const diagnosis = idempotencyKey ? { ...input.diagnosis, _idempotencyKey:idempotencyKey } : input.diagnosis;
  const row = await client.query<ReviewRow>(`INSERT INTO battle_reviews(id,battle_id,commitment_id,outcome,facts,what_changed,diagnosis_json,next_adjustment) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING id,battle_id,commitment_id,outcome,facts,what_changed,diagnosis_json,next_adjustment,reviewed_at`, [id,battleId,input.commitmentId,input.outcome,input.facts,input.whatChanged,JSON.stringify(diagnosis),input.nextAdjustment]);
  // A confirmed DNA reflection gets its own indexed row.  The module snapshot
  // remains the UI projection, while this table is the durable account-wide
  // source used for profile aggregation and idempotent recovery.
  const dna = record(input.diagnosis?.dnaRecord);
  if (typeof dna.id === "string" && dna.id.length > 0 && typeof dna.battlefieldTitle === "string" && typeof dna.timestamp === "string" && typeof dna.selectedStrategy === "string" && typeof dna.survivalOutcome === "string" && ["SURVIVED","PARTIAL_SUCCESS","LESSON_LEARNED"].includes(dna.survivalOutcome)) {
    const extracted = Array.isArray(dna.extractedDNA) ? dna.extractedDNA.filter((item): item is string => typeof item === "string").slice(0, 50) : [];
    const decidedAt = Number.isNaN(Date.parse(dna.timestamp)) ? new Date() : new Date(dna.timestamp);
    await client.query(
      `INSERT INTO battle_decision_dna_records(id,battle_id,platform_subject_type,platform_subject_id,battlefield_title,decided_at,selected_strategy,survival_outcome,fatal_question,user_reflection,extracted_dna_json,source_review_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
       ON CONFLICT (battle_id,id) DO UPDATE SET battlefield_title=EXCLUDED.battlefield_title,decided_at=EXCLUDED.decided_at,selected_strategy=EXCLUDED.selected_strategy,survival_outcome=EXCLUDED.survival_outcome,fatal_question=EXCLUDED.fatal_question,user_reflection=EXCLUDED.user_reflection,extracted_dna_json=EXCLUDED.extracted_dna_json,source_review_id=EXCLUDED.source_review_id,updated_at=now()`,
      [dna.id, battleId, subject.subjectType, subject.subjectId, dna.battlefieldTitle, decidedAt, dna.selectedStrategy, dna.survivalOutcome, typeof dna.fatalQuestion === "string" ? dna.fatalQuestion : "", typeof dna.userReflection === "string" ? dna.userReflection : "", JSON.stringify(extracted), id],
    );
  }
  await client.query(`UPDATE battle_cases SET status='review',updated_at=now() WHERE id=$1`, [battleId]);
  return { ...mapReview(row.rows[0]), reused:false };
});

export const getStrategyProfile = async (subject: AccountSubject) => {
  const result = await query<{version:number;profile_json:Json;updated_at:Date}>(`SELECT version,profile_json,updated_at FROM battle_strategy_profiles WHERE platform_subject_type=$1 AND platform_subject_id=$2 ORDER BY version DESC LIMIT 1`, owner(subject));
  const row = result.rows[0];
  return row ? { version:row.version, profile:record(row.profile_json), updatedAt:row.updated_at.toISOString() } satisfies StrategyProfile : null;
};

/**
 * Account-level counters used by the reference profile. These values are
 * derived from canonical battle/review rows, never from the editable UI
 * profile JSON, so a refresh or a client payload cannot fabricate progress.
 */
export const getAccountBattleStats = async (subject: AccountSubject) => {
  const result = await query<{ total_battles:string; reviewed_battles:string; survived_reviews:string }>(
    `SELECT
       (SELECT COUNT(*)::text FROM battle_cases WHERE platform_subject_type=$1 AND platform_subject_id=$2) AS total_battles,
       (SELECT COUNT(DISTINCT r.battle_id)::text
          FROM battle_reviews r
          JOIN battle_cases b ON b.id=r.battle_id
         WHERE b.platform_subject_type=$1 AND b.platform_subject_id=$2) AS reviewed_battles,
       (SELECT COUNT(*)::text
          FROM battle_decision_dna_records d
         WHERE d.platform_subject_type=$1 AND d.platform_subject_id=$2 AND d.survival_outcome='SURVIVED') AS survived_reviews`,
    owner(subject),
  );
  const row = result.rows[0] ?? { total_battles:"0", reviewed_battles:"0", survived_reviews:"0" };
  const totalBattles = Number(row.total_battles);
  const reviewedBattles = Number(row.reviewed_battles);
  const survivedReviews = Number(row.survived_reviews);
  return {
    totalSimulations: totalBattles,
    singularitySuccessRate: reviewedBattles > 0 ? Math.round((survivedReviews / reviewedBattles) * 100) : 0,
  };
};

/**
 * Return the latest decision-DNA snapshot from every battle owned by the
 * account. DNA is written to a battle module because each reflection belongs
 * to a battle, but the profile view is account-wide and must survive battle
 * switching. Keep this read-only aggregation here instead of copying records
 * into a second source of truth.
 */
export const listDecisionDna = async (subject: AccountSubject) => {
  const durable = await query<{ id:string; battlefield_title:string; decided_at:Date; selected_strategy:string; survival_outcome:string; fatal_question:string; user_reflection:string; extracted_dna_json:unknown }>(
    `SELECT id,battlefield_title,decided_at,selected_strategy,survival_outcome,fatal_question,user_reflection,extracted_dna_json
       FROM battle_decision_dna_records
      WHERE platform_subject_type=$1 AND platform_subject_id=$2
      ORDER BY decided_at DESC LIMIT 500`,
    owner(subject),
  );
  const result = await query<{ state_json: unknown }>(
    `SELECT latest.state_json
       FROM battle_module_states latest
       JOIN battle_cases b ON b.id=latest.battle_id
      WHERE b.platform_subject_type=$1
        AND b.platform_subject_id=$2
        AND latest.module_id='decision-dna'
        AND latest.version=(
          SELECT MAX(current.version)
            FROM battle_module_states current
           WHERE current.battle_id=latest.battle_id
             AND current.module_id='decision-dna'
        )
      ORDER BY latest.updated_at DESC`,
    owner(subject),
  );
  const byId = new Map<string, Json>();
  for (const row of durable.rows) {
    byId.set(row.id, {
      id: row.id,
      battlefieldTitle: row.battlefield_title,
      timestamp: row.decided_at.toISOString(),
      selectedStrategy: row.selected_strategy,
      survivalOutcome: row.survival_outcome,
      fatalQuestion: row.fatal_question,
      userReflection: row.user_reflection,
      extractedDNA: Array.isArray(row.extracted_dna_json) ? row.extracted_dna_json.filter((item): item is string => typeof item === "string") : [],
    });
  }
  for (const row of result.rows) {
    const state = record(row.state_json);
    const records = Array.isArray(state.records) ? state.records : [];
    for (const value of records) {
      const item = record(value);
      if (typeof item.id !== 'string' || !item.id) continue;
      // A record id is generated by the client once and is also used as the
      // review idempotency key. Deduplication keeps retries and old snapshots
      // from showing the same reflection twice.
      // Newer normalized rows carry the canonical timestamp/fields. Keep the
      // module snapshot only as a compatibility fallback for legacy DNA that
      // predates migration 023.
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const aTime = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : 0;
    const bTime = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : 0;
    return bTime - aTime;
  }).slice(0, 500);
};

export const getArchonProgress = async (subject: AccountSubject) => {
  const result = await query<{ reviewed_battles:string; committed_battles:string; collaboration_battles:string; archive_unlocks:string }>(
    `SELECT
       (SELECT COUNT(DISTINCT r.battle_id)::text FROM battle_reviews r JOIN battle_cases b ON b.id=r.battle_id WHERE b.platform_subject_type=$1 AND b.platform_subject_id=$2) AS reviewed_battles,
       (SELECT COUNT(DISTINCT c.battle_id)::text FROM battle_commitments c JOIN battle_cases b ON b.id=c.battle_id WHERE b.platform_subject_type=$1 AND b.platform_subject_id=$2) AS committed_battles,
       (SELECT COUNT(DISTINCT c.battle_id)::text FROM battle_collaborators c WHERE c.subject_type=$1 AND c.subject_id=$2 AND ${activeCollaborator}) AS collaboration_battles,
       (SELECT COALESCE(SUM(jsonb_array_length(CASE WHEN jsonb_typeof(s.state_json->'unlockedIds')='array' THEN s.state_json->'unlockedIds' ELSE '[]'::jsonb END)),0)::text
          FROM battle_module_states s JOIN battle_cases b ON b.id=s.battle_id
         WHERE b.platform_subject_type=$1 AND b.platform_subject_id=$2 AND s.module_id='deep-archives'
           AND s.version=(SELECT MAX(latest.version) FROM battle_module_states latest WHERE latest.battle_id=s.battle_id AND latest.module_id=s.module_id)) AS archive_unlocks`,
    owner(subject),
  );
  const row = result.rows[0] ?? { reviewed_battles:"0", committed_battles:"0", collaboration_battles:"0", archive_unlocks:"0" };
  const reviewedBattles = Number(row.reviewed_battles);
  const committedBattles = Number(row.committed_battles);
  const collaborationBattles = Number(row.collaboration_battles);
  const archiveUnlocks = Number(row.archive_unlocks);
  const score = reviewedBattles * 2 + committedBattles + collaborationBattles * 2 + archiveUnlocks;
  return {
    reviewedBattles,
    committedBattles,
    collaborationBattles,
    archiveUnlocks,
    score,
    rankTitle: score >= 20 ? "首席执政官" : score >= 10 ? "高阶执棋官" : score >= 4 ? "正式观测者" : "见习观测者",
    seals: Math.floor(score / 3),
    privileges: { precognition:score >= 4, archiveAnnotation:score >= 10, realityProposal:score >= 20 },
  };
};

export const saveStrategyProfile = async (subject: AccountSubject, profile: Record<string, unknown>) => withTransaction(async (client) => {
  // The profile is versioned so calibration can be audited. Serialize version
  // allocation across browser tabs before calculating MAX(version)+1.
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`battle-profile:${subject.subjectType}:${subject.subjectId}`]);
  const version = (await client.query<{version:number}>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_strategy_profiles WHERE platform_subject_type=$1 AND platform_subject_id=$2`, owner(subject))).rows[0].version;
  const row = await client.query<{version:number;profile_json:Json;updated_at:Date}>(`INSERT INTO battle_strategy_profiles(id,platform_subject_type,platform_subject_id,version,profile_json) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING version,profile_json,updated_at`, [randomUUID(),...owner(subject),version,JSON.stringify(profile)]);
  return { version:row.rows[0].version, profile:record(row.rows[0].profile_json), updatedAt:row.rows[0].updated_at.toISOString() } satisfies StrategyProfile;
});

type CollaboratorRow = { id:string; battle_id:string; subject_type:string; subject_id:string; role:CollaboratorRole; status:Collaborator["status"]; permissions_json:Json; expires_at:Date|null; created_at:Date; updated_at:Date };
const collaboratorSelect = `id,battle_id,subject_type,subject_id,role,status,permissions_json,expires_at,created_at,updated_at`;
const mapCollaborator = (r:CollaboratorRow): Collaborator => ({ id:r.id,battleId:r.battle_id,subjectType:r.subject_type,subjectId:r.subject_id,role:r.role,status:r.status,permissions:record(r.permissions_json),expiresAt:iso(r.expires_at),createdAt:r.created_at.toISOString(),updatedAt:r.updated_at.toISOString() });
export const listCollaborators = async (subject:AccountSubject,battleId:string) => {
  // Active collaborators need the roster to render their shared workspace;
  // mutation operations remain owner-only below.
  if (!await accessible(subject, battleId)) return null;
  const result = await query<CollaboratorRow>(`SELECT ${collaboratorSelect} FROM battle_collaborators WHERE battle_id=$1 AND (expires_at IS NULL OR expires_at>now()) ORDER BY created_at`,[battleId]);
  return result.rows.map(mapCollaborator);
};
export const upsertCollaborator = async (subject:AccountSubject,battleId:string,input:{subjectType:string;subjectId:string;role:CollaboratorRole;permissions:Json}) => withTransaction(async(client)=>{const check=await client.query(`SELECT id FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 FOR UPDATE`,[battleId,...owner(subject)]);if(!check.rowCount)return null;const row=await client.query<CollaboratorRow>(`INSERT INTO battle_collaborators(id,battle_id,subject_type,subject_id,role,status,permissions_json,invited_by_type,invited_by_id,expires_at) VALUES($1,$2,$3,$4,$5,'invited',$6::jsonb,$7,$8,now()+interval '7 days') ON CONFLICT(battle_id,subject_type,subject_id) DO UPDATE SET role=EXCLUDED.role,status='invited',permissions_json=EXCLUDED.permissions_json,expires_at=now()+interval '7 days',updated_at=now() RETURNING ${collaboratorSelect}`,[randomUUID(),battleId,input.subjectType,input.subjectId,input.role,JSON.stringify(input.permissions),subject.subjectType,subject.subjectId]);return mapCollaborator(row.rows[0]);});
export const setCollaboratorStatus = async (subject:AccountSubject,battleId:string,collaboratorId:string,status:Collaborator["status"]) => { if(!await owned(subject,battleId))return null; const result=await query<CollaboratorRow>(`UPDATE battle_collaborators SET status=$3,updated_at=now() WHERE id=$1 AND battle_id=$2 RETURNING ${collaboratorSelect}`,[collaboratorId,battleId,status]);return result.rows[0]?mapCollaborator(result.rows[0]):undefined; };
export const acceptCollaboratorInvitation = async (subject:AccountSubject,battleId:string,collaboratorId:string) => { const result=await query<CollaboratorRow>(`UPDATE battle_collaborators SET status='active',updated_at=now() WHERE id=$1 AND battle_id=$2 AND subject_type=$3 AND subject_id=$4 AND status='invited' AND expires_at>now() RETURNING ${collaboratorSelect}`,[collaboratorId,battleId,...owner(subject)]); return result.rows[0]?mapCollaborator(result.rows[0]):null; };

type InvitationRow = CollaboratorRow & { battle_title:string; invited_by_type:string; invited_by_id:string };
export const listPendingInvitations = async (subject:AccountSubject) => {
  const result = await query<InvitationRow>(`SELECT c.id,c.battle_id,c.subject_type,c.subject_id,c.role,c.status,c.permissions_json,c.expires_at,c.created_at,c.updated_at,b.title AS battle_title,c.invited_by_type,c.invited_by_id FROM battle_collaborators c JOIN battle_cases b ON b.id=c.battle_id WHERE c.subject_type=$1 AND c.subject_id=$2 AND c.status='invited' AND c.expires_at>now() ORDER BY c.created_at DESC LIMIT 100`,owner(subject));
  return result.rows.map((row) => ({ ...mapCollaborator(row), battleTitle:row.battle_title, invitedBy:{ subjectType:row.invited_by_type, subjectId:row.invited_by_id } }));
};
export const respondToInvitation = async (subject:AccountSubject,collaboratorId:string,action:"accept"|"decline") => {
  const status = action === "accept" ? "active" : "revoked";
  const result = await query<CollaboratorRow>(`UPDATE battle_collaborators SET status=$4,updated_at=now() WHERE id=$1 AND subject_type=$2 AND subject_id=$3 AND status='invited' AND expires_at>now() RETURNING ${collaboratorSelect}`,[collaboratorId,...owner(subject),status]);
  return result.rows[0] ? mapCollaborator(result.rows[0]) : null;
};

type AllocationRow = { id:string; battle_id:string|null; label:string; resource_kind:ResourceAllocation["resourceKind"]; amount:string; unit:string; starts_at:Date|null; ends_at:Date|null; priority:number; status:ResourceAllocation["status"]; source_json:Json };
const mapAllocation=(r:AllocationRow):ResourceAllocation=>({id:r.id,battleId:r.battle_id,label:r.label,resourceKind:r.resource_kind,amount:Number(r.amount),unit:r.unit,startsAt:iso(r.starts_at),endsAt:iso(r.ends_at),priority:r.priority,status:r.status,source:record(r.source_json)});
export const listAllocations=async(subject:AccountSubject)=>{const result=await query<AllocationRow>(`SELECT id,battle_id,label,resource_kind,amount,unit,starts_at,ends_at,priority,status,source_json FROM battle_resource_allocations WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND status NOT IN ('released','cancelled') ORDER BY starts_at NULLS LAST,priority DESC`,owner(subject));return result.rows.map(mapAllocation);};
export const saveAllocation=async(subject:AccountSubject,input:Omit<ResourceAllocation,"id">)=>withTransaction(async(client)=>{if(input.battleId&&!await ownerBattleForClient(client,subject,input.battleId))return null;const id=randomUUID();const result=await client.query<AllocationRow>(`INSERT INTO battle_resource_allocations(id,platform_subject_type,platform_subject_id,battle_id,label,resource_kind,amount,unit,starts_at,ends_at,priority,status,source_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) RETURNING id,battle_id,label,resource_kind,amount,unit,starts_at,ends_at,priority,status,source_json`,[id,...owner(subject),input.battleId,input.label,input.resourceKind,input.amount,input.unit,input.startsAt,input.endsAt,input.priority,input.status,JSON.stringify(input.source)]);return mapAllocation(result.rows[0]);});
export const detectAllocationConflicts=async(subject:AccountSubject)=>{const allocations=await listAllocations(subject);const conflicts: Array<{resourceKind:string;from:ResourceAllocation;to:ResourceAllocation;overlap:string}>=[];for(let i=0;i<allocations.length;i++){for(let j=i+1;j<allocations.length;j++){const a=allocations[i],b=allocations[j];if(a.resourceKind!==b.resourceKind||a.battleId===b.battleId||!a.startsAt||!b.startsAt)continue;const aEnd=a.endsAt?new Date(a.endsAt).getTime():Number.MAX_SAFE_INTEGER;const bEnd=b.endsAt?new Date(b.endsAt).getTime():Number.MAX_SAFE_INTEGER;if(new Date(a.startsAt).getTime()<bEnd&&new Date(b.startsAt).getTime()<aEnd)conflicts.push({resourceKind:a.resourceKind,from:a,to:b,overlap:"时间窗口重叠，需要主动取舍"});}}return conflicts;};

type PlaybookRow = { id:string; battle_id:string|null; visibility:PlaybookEntry["visibility"]; category:string; pattern:string; adjustment:string; evidence_count:number; source_json:Json; created_at:Date };
const mapPlaybook=(r:PlaybookRow):PlaybookEntry=>({id:r.id,battleId:r.battle_id,visibility:r.visibility,category:r.category,pattern:r.pattern,adjustment:r.adjustment,evidenceCount:r.evidence_count,source:record(r.source_json),createdAt:r.created_at.toISOString()});
export const listPlaybook=async(subject:AccountSubject,includePool=false)=>{const result=await query<PlaybookRow>(`SELECT id,CASE WHEN visibility='anonymous_pool' THEN NULL ELSE battle_id END AS battle_id,visibility,category,pattern,adjustment,evidence_count,source_json,created_at FROM battle_playbook_entries WHERE (platform_subject_type=$1 AND platform_subject_id=$2) OR ($3=true AND visibility='anonymous_pool') ORDER BY created_at DESC LIMIT 200`,[...owner(subject),includePool]);return result.rows.map(mapPlaybook);};
export const createPlaybookEntry=async(subject:AccountSubject,input:Omit<PlaybookEntry,"id"|"createdAt">)=>withTransaction(async(client)=>{if(input.battleId&&!await ownerBattleForClient(client,subject,input.battleId))return null;const id=randomUUID();const result=await client.query<PlaybookRow>(`INSERT INTO battle_playbook_entries(id,platform_subject_type,platform_subject_id,battle_id,visibility,category,pattern,adjustment,evidence_count,source_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id,battle_id,visibility,category,pattern,adjustment,evidence_count,source_json,created_at`,[id,...owner(subject),input.battleId,input.visibility,input.category,input.pattern,input.adjustment,input.evidenceCount,JSON.stringify(playbookSource(input.visibility,input.source))]);return mapPlaybook(result.rows[0]);});

type CalibrationRow = { id:string; battle_id:string|null; commitment_id:string|null; dimension:CalibrationEvent["dimension"]; expected:number|null; actual:number|null; error:number|null; note:string; created_at:Date };
const mapCalibration=(r:CalibrationRow):CalibrationEvent=>({id:r.id,battleId:r.battle_id,commitmentId:r.commitment_id,dimension:r.dimension,expected:r.expected,actual:r.actual,error:r.error,note:r.note,createdAt:r.created_at.toISOString()});
export const listCalibration=async(subject:AccountSubject)=>{const result=await query<CalibrationRow>(`SELECT id,battle_id,commitment_id,dimension,expected,actual,error,note,created_at FROM battle_calibration_events WHERE platform_subject_type=$1 AND platform_subject_id=$2 ORDER BY created_at DESC LIMIT 500`,owner(subject));return result.rows.map(mapCalibration);};
export const createCalibration=async(subject:AccountSubject,input:Omit<CalibrationEvent,"id"|"createdAt"|"error">)=>withTransaction(async(client)=>{if(input.battleId&&!await ownerBattleForClient(client,subject,input.battleId))return null;if(input.commitmentId){const commitment=await client.query(`SELECT 1 FROM battle_commitments c JOIN battle_cases b ON b.id=c.battle_id WHERE c.id=$1 AND b.platform_subject_type=$2 AND b.platform_subject_id=$3${input.battleId?" AND c.battle_id=$4":""}`,input.battleId?[input.commitmentId,...owner(subject),input.battleId]:[input.commitmentId,...owner(subject)]);if(!commitment.rowCount)return null;}const id=randomUUID();const error=input.expected!==null&&input.actual!==null?input.actual-input.expected:null;const result=await client.query<CalibrationRow>(`INSERT INTO battle_calibration_events(id,platform_subject_type,platform_subject_id,battle_id,commitment_id,dimension,expected,actual,error,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,battle_id,commitment_id,dimension,expected,actual,error,note,created_at`,[id,...owner(subject),input.battleId,input.commitmentId,input.dimension,input.expected,input.actual,error,input.note]);return mapCalibration(result.rows[0]);});

type AdviceRow = { id:string; battle_id:string; author_subject_type:string; author_subject_id:string; target_type:BattleAdvice["targetType"]; target_id:string|null; opinion:string; rationale:string; uncertainty:string; source_json:Json; status:AdviceStatus; adopted_as:AdviceAdoption|null; adopted_record_id:string|null; adopted_at:Date|null; created_at:Date; updated_at:Date };
const mapAdvice = (r:AdviceRow):BattleAdvice => ({id:r.id,battleId:r.battle_id,authorSubjectType:r.author_subject_type,authorSubjectId:r.author_subject_id,targetType:r.target_type,targetId:r.target_id,opinion:r.opinion,rationale:r.rationale,uncertainty:r.uncertainty,source:record(r.source_json),status:r.status,adoptedAs:r.adopted_as,adoptedRecordId:r.adopted_record_id,adoptedAt:iso(r.adopted_at),createdAt:r.created_at.toISOString(),updatedAt:r.updated_at.toISOString()});
const adviceSelect = `id,battle_id,author_subject_type,author_subject_id,target_type,target_id,opinion,rationale,uncertainty,source_json,status,adopted_as,adopted_record_id,adopted_at,created_at,updated_at`;

export const listAdvice = async (subject:AccountSubject,battleId:string) => {
  if (!await accessible(subject,battleId)) return null;
  const result = await query<AdviceRow>(`SELECT ${adviceSelect} FROM battle_advice WHERE battle_id=$1 ORDER BY created_at DESC`,[battleId]);
  return result.rows.map(mapAdvice);
};

export const createAdvice = async (subject:AccountSubject,battleId:string,input:Pick<BattleAdvice,"targetType"|"targetId"|"opinion"|"rationale"|"uncertainty"|"source"> & { idempotencyKey?: string }) => {
  const access = await getBattleAccess(subject,battleId);
  if (!access || !["owner","advisor","contributor"].includes(access.role)) return null;
  return withTransaction(async (client) => {
    const ownerRow = await client.query(`SELECT 1 FROM battle_cases WHERE id=$1 FOR UPDATE`, [battleId]);
    const collaborator = await client.query(`SELECT 1 FROM battle_collaborators c WHERE battle_id=$1 AND subject_type=$2 AND subject_id=$3 AND ${activeCollaborator}`, [battleId, subject.subjectType, subject.subjectId]);
    const ownerAccess = await client.query(`SELECT 1 FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3`, [battleId, subject.subjectType, subject.subjectId]);
    if (!ownerRow.rowCount || (!ownerAccess.rowCount && !collaborator.rowCount) || !await targetExists(client,battleId,input.targetType,input.targetId)) return null;
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const existing = await client.query<AdviceRow>(`SELECT ${adviceSelect} FROM battle_advice WHERE battle_id=$1 AND author_subject_type=$2 AND author_subject_id=$3 AND idempotency_key=$4 LIMIT 1`, [battleId, subject.subjectType, subject.subjectId, idempotencyKey]);
      if (existing.rows[0]) return mapAdvice(existing.rows[0]);
    }
    // AI jobs may be retried after a successful platform charge. Reuse the
    // previously persisted advice by job id so recovery never duplicates it.
    const sourceJobId = typeof input.source.jobId === "string" ? input.source.jobId : null;
    if (sourceJobId) {
      const existing = await client.query<AdviceRow>(`SELECT ${adviceSelect} FROM battle_advice WHERE battle_id=$1 AND source_json->>'jobId'=$2 LIMIT 1`, [battleId, sourceJobId]);
      if (existing.rows[0]) return mapAdvice(existing.rows[0]);
    }
    const id = randomUUID();
    const source = {...input.source,layer:"advisor_opinion",author:{subjectType:subject.subjectType,subjectId:subject.subjectId}};
    const result = await client.query<AdviceRow>(`INSERT INTO battle_advice(id,battle_id,author_subject_type,author_subject_id,target_type,target_id,opinion,rationale,uncertainty,source_json,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) ON CONFLICT DO NOTHING RETURNING ${adviceSelect}`,[id,battleId,...owner(subject),input.targetType,input.targetId,input.opinion,input.rationale,input.uncertainty,JSON.stringify(source),idempotencyKey]);
    if (result.rows[0]) return mapAdvice(result.rows[0]);
    const jobId = typeof input.source.jobId === "string" ? input.source.jobId : null;
    if (!jobId) return null;
    const existing = await client.query<AdviceRow>(`SELECT ${adviceSelect} FROM battle_advice WHERE battle_id=$1 AND source_json->>'jobId'=$2 LIMIT 1`,[battleId,jobId]);
    if (existing.rows[0]) return mapAdvice(existing.rows[0]);
    if (idempotencyKey) {
      const retried = await client.query<AdviceRow>(`SELECT ${adviceSelect} FROM battle_advice WHERE battle_id=$1 AND author_subject_type=$2 AND author_subject_id=$3 AND idempotency_key=$4 LIMIT 1`, [battleId, subject.subjectType, subject.subjectId, idempotencyKey]);
      return retried.rows[0] ? mapAdvice(retried.rows[0]) : null;
    }
    return null;
  });
};

export const updateAdviceStatus = async (subject:AccountSubject,battleId:string,adviceId:string,status:Exclude<AdviceStatus,"accepted">) => withTransaction(async(client)=>{
  const row = await client.query<AdviceRow>(`SELECT ${adviceSelect} FROM battle_advice WHERE id=$1 AND battle_id=$2 FOR UPDATE`,[adviceId,battleId]);
  if (!row.rows[0]) return null;
  const advice = row.rows[0];
  const isOwner = await client.query(`SELECT 1 FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3`,[battleId,...owner(subject)]);
  const isAuthor = advice.author_subject_type===subject.subjectType && advice.author_subject_id===subject.subjectId;
  if (!isOwner.rowCount && !(isAuthor && status==="withdrawn")) return undefined;
  const updated = await client.query<AdviceRow>(`UPDATE battle_advice SET status=$3,updated_at=now() WHERE id=$1 AND battle_id=$2 RETURNING ${adviceSelect}`,[adviceId,battleId,status]);
  return mapAdvice(updated.rows[0]);
});

export const adoptAdvice = async (subject:AccountSubject,battleId:string,adviceId:string,adoptedAs:AdviceAdoption) => withTransaction(async(client)=>{
  const ownerRow = await client.query(`SELECT id FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 FOR UPDATE`,[battleId,...owner(subject)]);
  if (!ownerRow.rowCount) return null;
  const row = await client.query<AdviceRow>(`SELECT ${adviceSelect} FROM battle_advice WHERE id=$1 AND battle_id=$2 AND status='proposed' FOR UPDATE`,[adviceId,battleId]);
  if (!row.rows[0]) return undefined;
  const advice = row.rows[0];
  let adoptedRecordId: string | null = null;
  if (adoptedAs === "fact") {
    adoptedRecordId = randomUUID();
    await client.query(`INSERT INTO battle_facts(id,battle_id,kind,content,source,confidence,occurred_at,verified_at) VALUES($1,$2,'fact',$3,'system',50,now(),NULL)`,[adoptedRecordId,battleId,advice.opinion]);
  } else if (adoptedAs === "action") {
    adoptedRecordId = randomUUID();
    await client.query(`INSERT INTO battle_timeline_nodes(id,battle_id,kind,title,description,truth_status,importance,source_json) VALUES($1,$2,'action',$3,$4,'projected',3,$5::jsonb)`,[adoptedRecordId,battleId,"顾问建议 · 待执行",advice.opinion,JSON.stringify({layer:"adopted_advisor_opinion",adviceId,author:{subjectType:advice.author_subject_type,subjectId:advice.author_subject_id}})]);
  }
  const updated = await client.query<AdviceRow>(`UPDATE battle_advice SET status='accepted',adopted_as=$3,adopted_record_id=$4,adopted_by_type=$5,adopted_by_id=$6,adopted_at=now(),updated_at=now() WHERE id=$1 AND battle_id=$2 RETURNING ${adviceSelect}`,[adviceId,battleId,adoptedAs,adoptedRecordId,subject.subjectType,subject.subjectId]);
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`,[battleId]);
  return { advice:mapAdvice(updated.rows[0]), adoptedRecordId };
});

type AttachmentRow = { id:string; battle_id:string; target_type:BattleAttachment["targetType"]; target_id:string|null; filename:string; media_type:string; storage_key:string; byte_size:string; checksum:string|null; source_json:Json; created_at:Date };
const mapAttachment = (r:AttachmentRow):BattleAttachment => ({id:r.id,battleId:r.battle_id,targetType:r.target_type,targetId:r.target_id,filename:r.filename,mediaType:r.media_type,storageKey:r.storage_key,byteSize:Number(r.byte_size),checksum:r.checksum,source:record(r.source_json),createdAt:r.created_at.toISOString()});
const attachmentSelect = `id,battle_id,target_type,target_id,filename,media_type,storage_key,byte_size,checksum,source_json,created_at`;
export const listAttachments = async (subject:AccountSubject,battleId:string) => { if(!await accessible(subject,battleId)) return null; const result=await query<AttachmentRow>(`SELECT ${attachmentSelect} FROM battle_attachments WHERE battle_id=$1 ORDER BY created_at DESC`,[battleId]); return result.rows.map(mapAttachment); };
export const addAttachment = async (subject:AccountSubject,battleId:string,input:Omit<BattleAttachment,"id"|"battleId"|"createdAt">) => withTransaction(async(client)=>{ const check=await client.query(`SELECT id FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 FOR UPDATE`,[battleId,...owner(subject)]); if(!check.rowCount||!await targetExists(client,battleId,input.targetType,input.targetId))return null; const id=randomUUID(); const result=await client.query<AttachmentRow>(`INSERT INTO battle_attachments(id,battle_id,target_type,target_id,filename,media_type,storage_key,byte_size,checksum,source_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING ${attachmentSelect}`,[id,battleId,input.targetType,input.targetId,input.filename,input.mediaType,input.storageKey,input.byteSize,input.checksum,JSON.stringify(input.source)]); await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`,[battleId]); return mapAttachment(result.rows[0]); });
export const removeAttachment = async (subject:AccountSubject,battleId:string,attachmentId:string) => { if(!await owned(subject,battleId))return null; const result=await query<{id:string}>(`DELETE FROM battle_attachments WHERE id=$1 AND battle_id=$2 RETURNING id`,[attachmentId,battleId]); return Boolean(result.rowCount); };
