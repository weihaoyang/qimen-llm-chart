import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { buildMultiRowInsert, orderRowsByKey } from "@/lib/db/batch";
import { stripReservedJobId } from "./input";
import { UserFacingError } from "@/lib/user-facing-error";
import type { Battle, BattleConstraint, BattleFact, GravityLine, InventoryItem, Junction, Move, ResourceSnapshot } from "./types";

type Json = Record<string, unknown>;
type CaseRow = { id:string; title:string; objective:string; minimum_outcome:string; ideal_outcome:string; opponent_summary:string; status:Battle["status"]; hard_deadline:Date|null; created_at:Date; updated_at:Date; scenario_id:string|null; scenario_version:number|null; source_type:Battle["sourceType"]; access_role?:Battle["accessRole"] };
type FactRow = { id:string; battle_id:string; kind:BattleFact["kind"]; content:string; source:BattleFact["source"]; confidence:number; occurred_at:Date|null; verified_at:Date|null; created_at:Date };
type ConstraintRow = { id:string; battle_id:string; kind:BattleConstraint["kind"]; label:string; description:string; hard:boolean; severity:number; threshold_json:Json; source_json:Json };
type InventoryRow = { id:string; battle_id:string; category:InventoryItem["category"]; label:string; description:string; quantity:string|null; unit:string|null; availability:InventoryItem["availability"]; expires_at:Date|null; cost_json:Json; evidence_json:Json };
type GravityRow = { version:number; summary:string; assumptions_json:unknown; expected_outcome:string; resource_cost_json:Json; failure_reasons_json:unknown; confidence:number; source_json:Json };
type JunctionRow = { id:string; battle_id:string; title:string; description:string; window_start:Date|null; window_end:Date|null; half_life_at:Date|null; core_variable:string; default_consequence:string; urgency:number; leverage:number; irreversibility:number; status:Junction["status"]; source_json:Json };
type MoveRow = { id:string; battle_id:string; junction_id:string|null; version:number; kind:Move["kind"]; title:string; key_variable:string; rationale:string; action_json:unknown; cost_json:Json; upside_json:Json; failure_cost_json:Json; validation_json:Json; stop_json:Json; assumptions_json:unknown; source_json:Json; state:Move["state"] };
type ResourceRow = { snapshot_json:Json };
type CommitmentRow = { id:string; battle_id:string; move_id:string; version:number; snapshot_json:Json; committed_at:Date; ended_at:Date|null; status:"active"|"verified"|"stopped"|"superseded" };

const ownership = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const activeCollaborator = "bc.status='active' AND (bc.expires_at IS NULL OR bc.expires_at>now())";
// Advisors may read and annotate a battle, but cannot mutate canonical state.
const contributorBattlePredicate = `(b.platform_subject_type=$2 AND b.platform_subject_id=$3) OR EXISTS (SELECT 1 FROM battle_collaborators bc WHERE bc.battle_id=b.id AND bc.subject_type=$2 AND bc.subject_id=$3 AND ${activeCollaborator} AND bc.role='contributor')`;
const contributorCasePredicate34 = (alias: string) => `(${alias}.platform_subject_type=$3 AND ${alias}.platform_subject_id=$4) OR EXISTS (SELECT 1 FROM battle_collaborators bc WHERE bc.battle_id=${alias}.id AND bc.subject_type=$3 AND bc.subject_id=$4 AND ${activeCollaborator} AND bc.role='contributor')`;
const writableBattlePredicate = contributorBattlePredicate;
const writableCasePredicate34 = contributorCasePredicate34;
const asRecord = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const asStrings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const iso = (value: Date|null|undefined) => value?.toISOString() ?? null;
const mapBattle = (row: CaseRow): Battle => ({ id:row.id, title:row.title, objective:row.objective, minimumOutcome:row.minimum_outcome, idealOutcome:row.ideal_outcome, opponentSummary:row.opponent_summary, status:row.status, hardDeadline:iso(row.hard_deadline), createdAt:row.created_at.toISOString(), updatedAt:row.updated_at.toISOString(), scenarioId:row.scenario_id, scenarioVersion:row.scenario_version, sourceType:row.source_type, accessRole:row.access_role });
const mapFact = (row: FactRow): BattleFact => ({ id:row.id, battleId:row.battle_id, kind:row.kind, content:row.content, source:row.source, confidence:row.confidence, occurredAt:iso(row.occurred_at), verifiedAt:iso(row.verified_at), createdAt:row.created_at.toISOString() });
const mapConstraint = (row: ConstraintRow): BattleConstraint => ({ id:row.id, battleId:row.battle_id, kind:row.kind, label:row.label, description:row.description, hard:row.hard, severity:row.severity, threshold:asRecord(row.threshold_json), source:asRecord(row.source_json) });
const mapInventory = (row: InventoryRow): InventoryItem => ({ id:row.id, battleId:row.battle_id, category:row.category, label:row.label, description:row.description, quantity:row.quantity === null ? null : Number(row.quantity), unit:row.unit, availability:row.availability, expiresAt:iso(row.expires_at), cost:asRecord(row.cost_json), evidence:asRecord(row.evidence_json) });
/**
 * The AI job that produced an inventory item, or `null` for user-authored cards.
 *
 * This identifies a **job**, not an item: every card from one model response
 * carries the same id. It is an idempotency key, so it must be compared for
 * equality only — never used to tell two cards of the same job apart.
 */
const inventoryJobId = (evidence: Record<string, unknown> | undefined) =>
  evidence && typeof evidence === "object" && typeof evidence.jobId === "string" ? evidence.jobId : null;
const mapGravity = (row: GravityRow): GravityLine => ({ version:row.version, summary:row.summary, assumptions:asStrings(row.assumptions_json), expectedOutcome:row.expected_outcome, resourceCost:asRecord(row.resource_cost_json), failureReasons:asStrings(row.failure_reasons_json), confidence:row.confidence, source:asRecord(row.source_json) });
const mapJunction = (row: JunctionRow): Junction => ({ id:row.id, battleId:row.battle_id, title:row.title, description:row.description, windowStart:iso(row.window_start), windowEnd:iso(row.window_end), halfLifeAt:iso(row.half_life_at), coreVariable:row.core_variable, defaultConsequence:row.default_consequence, urgency:row.urgency, leverage:row.leverage, irreversibility:row.irreversibility, status:row.status, source:asRecord(row.source_json) });
const mapMove = (row: MoveRow): Move => ({ id:row.id, battleId:row.battle_id, junctionId:row.junction_id, version:row.version, kind:row.kind, title:row.title, keyVariable:row.key_variable, rationale:row.rationale, actions:Array.isArray(row.action_json) ? row.action_json.filter((item): item is Move["actions"][number] => Boolean(item && typeof item === "object")) : [], cost:asRecord(row.cost_json), upside:asRecord(row.upside_json), failureCost:asRecord(row.failure_cost_json), validation:asRecord(row.validation_json), stop:asRecord(row.stop_json), assumptions:asStrings(row.assumptions_json), source:asRecord(row.source_json), state:row.state });

export const isBattleId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Shared by the two branches of `listBattles`. Both must project the same list in
// the same order, because `UNION ALL` takes its column names from the first.
const battleListColumns = "c.id,c.title,c.objective,c.minimum_outcome,c.ideal_outcome,c.opponent_summary,c.status,c.hard_deadline,c.created_at,c.updated_at,c.scenario_id,c.scenario_version,c.source_type";

export const listBattles = async (subject: AccountSubject) => {
  // Archived battles remain visible so the owner can explicitly restore them
  // from War Rooms. Hiding them here made the existing “取消归档” action
  // unreachable and turned a reversible state into an apparent deletion.
  //
  // The owner branch and the collaborator branch are written separately rather
  // than as a single `... OR EXISTS (...)`. That disjunction is what no index can
  // serve: `battle_cases_owner_updated_idx` is keyed on
  // (platform_subject_type, platform_subject_id, updated_at DESC), and no scan of
  // it can also produce rows matched only through `battle_collaborators`. The
  // planner abandoned the index and sequentially scanned every battle in the
  // system, running the correlated subquery once per row. Measured against 20k
  // battles: `Rows Removed by Filter: 19931`, subplan executed 19931 times, 49.7ms.
  // Split, the owner branch is an index scan and the whole query runs in 0.7ms.
  // The gap is not a constant — the old plan's cost was proportional to every
  // battle in the system rather than to the caller's.
  //
  // `UNION ALL` is safe because the collaborator branch excludes battles the
  // subject already owns, so no row can arrive from both. Without that exclusion,
  // an owner who is also recorded as a collaborator on their own battle would see
  // it twice.
  const result = await query<CaseRow>(`SELECT u.id,u.title,u.objective,u.minimum_outcome,u.ideal_outcome,u.opponent_summary,u.status,u.hard_deadline,u.created_at,u.updated_at,u.scenario_id,u.scenario_version,u.source_type,u.access_role FROM (SELECT ${battleListColumns},'owner' AS access_role FROM battle_cases c WHERE c.platform_subject_type=$1 AND c.platform_subject_id=$2 UNION ALL SELECT ${battleListColumns},bc.role AS access_role FROM battle_cases c JOIN battle_collaborators bc ON bc.battle_id=c.id WHERE bc.subject_type=$1 AND bc.subject_id=$2 AND ${activeCollaborator} AND NOT (c.platform_subject_type=$1 AND c.platform_subject_id=$2)) u ORDER BY u.updated_at DESC LIMIT 100`, ownership(subject));
  return result.rows.map(mapBattle);
};

export const getBattle = async (subject: AccountSubject, id: string) => {
  const result = await query<CaseRow>(`SELECT c.id,c.title,c.objective,c.minimum_outcome,c.ideal_outcome,c.opponent_summary,c.status,c.hard_deadline,c.created_at,c.updated_at,c.scenario_id,c.scenario_version,c.source_type,CASE WHEN c.platform_subject_type=$2 AND c.platform_subject_id=$3 THEN 'owner' ELSE (SELECT bc.role FROM battle_collaborators bc WHERE bc.battle_id=c.id AND bc.subject_type=$2 AND bc.subject_id=$3 AND ${activeCollaborator} LIMIT 1) END AS access_role FROM battle_cases c WHERE c.id=$1 AND ((c.platform_subject_type=$2 AND c.platform_subject_id=$3) OR EXISTS (SELECT 1 FROM battle_collaborators bc WHERE bc.battle_id=c.id AND bc.subject_type=$2 AND bc.subject_id=$3 AND ${activeCollaborator}))`, [id, ...ownership(subject)]);
  return result.rows[0] ? mapBattle(result.rows[0]) : null;
};

export const isBattleOwner = async (subject: AccountSubject, id: string) => Boolean((await query<{id:string}>(`SELECT id FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3`, [id,...ownership(subject)])).rowCount);

export const createBattle = async (subject: AccountSubject, input: Pick<Battle, "title"|"objective"|"minimumOutcome"|"idealOutcome"|"opponentSummary"|"hardDeadline">) => {
  const id = randomUUID();
  const row = await query<CaseRow>(`INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,minimum_outcome,ideal_outcome,opponent_summary,hard_deadline) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,title,objective,minimum_outcome,ideal_outcome,opponent_summary,status,hard_deadline,created_at,updated_at,scenario_id,scenario_version,source_type`, [id, ...ownership(subject), input.title, input.objective, input.minimumOutcome, input.idealOutcome, input.opponentSummary, input.hardDeadline]);
  return mapBattle(row.rows[0]);
};

export const updateBattle = async (subject: AccountSubject, id: string, input: Partial<Pick<Battle, "title"|"objective"|"minimumOutcome"|"idealOutcome"|"opponentSummary"|"hardDeadline"|"status">>) => {
  const current = await getBattle(subject, id);
  if (!current) return null;
  const row = await query<CaseRow>(`UPDATE battle_cases b SET title=$4,objective=$5,minimum_outcome=$6,ideal_outcome=$7,opponent_summary=$8,status=$9,hard_deadline=$10,updated_at=now() WHERE b.id=$1 AND (${contributorBattlePredicate}) RETURNING b.id,b.title,b.objective,b.minimum_outcome,b.ideal_outcome,b.opponent_summary,b.status,b.hard_deadline,b.created_at,b.updated_at,b.scenario_id,b.scenario_version,b.source_type`, [id, ...ownership(subject), input.title ?? current.title, input.objective ?? current.objective, input.minimumOutcome ?? current.minimumOutcome, input.idealOutcome ?? current.idealOutcome, input.opponentSummary ?? current.opponentSummary, input.status ?? current.status, input.hardDeadline === undefined ? current.hardDeadline : input.hardDeadline]);
  return row.rows[0] ? mapBattle(row.rows[0]) : null;
};

export const deleteBattle = async (subject: AccountSubject, id: string) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT id FROM battle_cases WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 FOR UPDATE`, [id, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  // Long-term symbiote memories use ON DELETE SET NULL to preserve referential
  // auditability. Scrub their private payload before deleting the battle so
  // they cannot survive as readable, source-less account memories.
  await client.query(
    `UPDATE battle_memory_records
        SET battle_id=NULL,
            title='已删除战局记忆',
            memory_json='{}'::jsonb,
            source_json=jsonb_build_object('deletedBattleId',$1,'reason','battle_deleted'),
            consent_status='deleted',
            updated_at=now()
      WHERE battle_id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3`,
    [id, ...ownership(subject)],
  );
  const result = await client.query<{id:string}>(`DELETE FROM battle_cases WHERE id=$1 RETURNING id`, [id]);
  return Boolean(result.rowCount);
});

const requireAccessibleBattle = async (subject: AccountSubject, id: string) => Boolean(await getBattle(subject, id));

export const listBattleFacts = async (subject: AccountSubject, battleId: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<FactRow>(`SELECT id,battle_id,kind,content,source,confidence,occurred_at,verified_at,created_at FROM battle_facts WHERE battle_id=$1 ORDER BY created_at`, [battleId]);
  return result.rows.map(mapFact);
};

export const addBattleFacts = async (subject: AccountSubject, battleId: string, input: Array<Pick<BattleFact, "kind"|"content"|"source"|"confidence"|"occurredAt"|"verifiedAt">>) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const facts: BattleFact[] = [];
  if (input.length) {
    const ids = input.map(() => randomUUID());
    const statement = buildMultiRowInsert(
      "battle_facts",
      ["id","battle_id","kind","content","source","confidence","occurred_at","verified_at"],
      [null,null,null,null,null,"int","timestamptz","timestamptz"],
      input.map((item, index) => [ids[index], battleId, item.kind, item.content, item.source, item.confidence, item.occurredAt, item.verifiedAt]),
    );
    const rows = await client.query<FactRow>(`${statement.text} RETURNING id,battle_id,kind,content,source,confidence,occurred_at,verified_at,created_at`, statement.values);
    facts.push(...orderRowsByKey(rows.rows.map(mapFact), ids, (fact) => fact.id, "写入战局事实"));
  }
  await client.query(`UPDATE battle_cases SET updated_at=now(),status=CASE WHEN status='intake' THEN 'active' ELSE status END WHERE id=$1`, [battleId]);
  return facts;
});

export const listBattleConstraints = async (subject: AccountSubject, battleId: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<ConstraintRow>(`SELECT id,battle_id,kind,label,description,hard,severity,threshold_json,source_json FROM battle_constraints WHERE battle_id=$1 ORDER BY severity DESC,created_at`, [battleId]);
  return result.rows.map(mapConstraint);
};

export const replaceBattleConstraints = async (subject: AccountSubject, battleId: string, input: Array<Omit<BattleConstraint, "id"|"battleId">>) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  await client.query(`DELETE FROM battle_constraints WHERE battle_id=$1`, [battleId]);
  const constraints: BattleConstraint[] = [];
  if (input.length) {
    const ids = input.map(() => randomUUID());
    const statement = buildMultiRowInsert(
      "battle_constraints",
      ["id","battle_id","kind","label","description","hard","severity","threshold_json","source_json"],
      [null,null,null,null,null,null,"int","jsonb","jsonb"],
      input.map((item, index) => [ids[index], battleId, item.kind, item.label, item.description, item.hard, item.severity, JSON.stringify(item.threshold), JSON.stringify(item.source)]),
    );
    const rows = await client.query<ConstraintRow>(`${statement.text} RETURNING id,battle_id,kind,label,description,hard,severity,threshold_json,source_json`, statement.values);
    constraints.push(...orderRowsByKey(rows.rows.map(mapConstraint), ids, (item) => item.id, "写入战局约束"));
  }
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return constraints;
});

/**
 * Confirm the structured interview extraction as one user action.
 *
 * Facts and constraints are deliberately committed in the same transaction:
 * a browser retry must never leave the interview half-confirmed. The
 * confirmation key is stored in the battle's versioned confirmation ledger
 * and makes the operation idempotent across refreshes and double clicks.
 */
export const confirmInterviewExtraction = async (
  subject: AccountSubject,
  battleId: string,
  confirmationKey: string,
  factsInput: Array<Pick<BattleFact, "kind"|"content"|"source"|"confidence"|"occurredAt"|"verifiedAt">>,
  constraintsInput: Array<Omit<BattleConstraint, "id"|"battleId">>,
) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;

  const marker = await client.query<{ state_json:unknown }>(
    `SELECT state_json FROM battle_module_states WHERE battle_id=$1 AND module_id='interview-confirmations' ORDER BY version DESC LIMIT 1`,
    [battleId],
  );
  const markerState = marker.rows[0] ? asRecord(marker.rows[0].state_json) : {};
  const appliedKeys = asStrings(markerState.keys);
  const reused = appliedKeys.includes(confirmationKey);
  if (!reused) {
    if (factsInput.length) {
      const statement = buildMultiRowInsert(
        "battle_facts",
        ["id","battle_id","kind","content","source","confidence","occurred_at","verified_at"],
        [null,null,null,null,null,"int","timestamptz","timestamptz"],
        factsInput.map((item) => [randomUUID(), battleId, item.kind, item.content, item.source, item.confidence, item.occurredAt, item.verifiedAt]),
      );
      await client.query(statement.text, statement.values);
    }
    // Confirmed interview constraints are appended. Existing constraints may
    // come from the official scenario or another interview and must survive.
    if (constraintsInput.length) {
      const statement = buildMultiRowInsert(
        "battle_constraints",
        ["id","battle_id","kind","label","description","hard","severity","threshold_json","source_json"],
        [null,null,null,null,null,null,"int","jsonb","jsonb"],
        constraintsInput.map((item) => [randomUUID(), battleId, item.kind, item.label, item.description, item.hard, item.severity, JSON.stringify(item.threshold), JSON.stringify({ ...item.source, interviewConfirmationKey: confirmationKey })]),
      );
      await client.query(statement.text, statement.values);
    }
    const nextKeys = [...appliedKeys, confirmationKey].slice(-200);
    const nextVersion = (await client.query<{ version:number }>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_module_states WHERE battle_id=$1 AND module_id='interview-confirmations'`, [battleId])).rows[0].version;
    const nextState = { keys: nextKeys };
    await client.query(`INSERT INTO battle_module_states(id,battle_id,module_id,version,state_json,consent_json) VALUES($1,$2,'interview-confirmations',$3,$4::jsonb,'{}'::jsonb)`, [randomUUID(), battleId, nextVersion, JSON.stringify(nextState)]);
    await client.query(
      `INSERT INTO battle_module_state_events(id,battle_id,module_id,version,actor_subject_type,actor_subject_id,event_type,state_json,consent_json,idempotency_key)
       VALUES($1,$2,'interview-confirmations',$3,$4,$5,'updated',$6::jsonb,'{}'::jsonb,$7)`,
      [randomUUID(), battleId, nextVersion, subject.subjectType, subject.subjectId, JSON.stringify(nextState), confirmationKey],
    );
    await client.query(`UPDATE battle_cases SET updated_at=now(),status=CASE WHEN status='intake' THEN 'active' ELSE status END WHERE id=$1`, [battleId]);
  }

  const [facts, constraints] = await Promise.all([
    client.query<FactRow>(`SELECT id,battle_id,kind,content,source,confidence,occurred_at,verified_at,created_at FROM battle_facts WHERE battle_id=$1 ORDER BY created_at`, [battleId]),
    client.query<ConstraintRow>(`SELECT id,battle_id,kind,label,description,hard,severity,threshold_json,source_json FROM battle_constraints WHERE battle_id=$1 ORDER BY severity DESC,created_at`, [battleId]),
  ]);
  return { facts: facts.rows.map(mapFact), constraints: constraints.rows.map(mapConstraint), reused };
});

export const listInventory = async (subject: AccountSubject, battleId: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<InventoryRow>(`SELECT id,battle_id,category,label,description,quantity,unit,availability,expires_at,cost_json,evidence_json FROM battle_inventory_items WHERE battle_id=$1 ORDER BY created_at`, [battleId]);
  return result.rows.map(mapInventory);
};

/**
 * A card on its way in. `id` is optional — omitting it means "create" — so it has
 * to be removed from `InventoryItem` before being re-added as optional:
 * `Omit<InventoryItem, "battleId"> & { id?: string }` leaves `id` *required*,
 * because an intersection is only optional where every member says so. The route
 * had to cast around that to pass `id: undefined` for a new card.
 */
export type InventoryWrite = Omit<InventoryItem, "battleId" | "id"> & { id?: string };

export const replaceInventory = async (subject: AccountSubject, battleId: string, input: InventoryWrite[]) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const requestedIds = input.map((item) => item.id).filter((id): id is string => typeof id === "string");
  if (new Set(requestedIds).size !== requestedIds.length) {
    throw new UserFacingError("底牌标识重复。", { status: 400, reasonCode: "inventory_duplicate_id" });
  }
  if (requestedIds.length) {
    const existing = await client.query<{ id:string; battle_id:string }>(
      `SELECT id,battle_id FROM battle_inventory_items WHERE id = ANY($1::uuid[])`,
      [requestedIds],
    );
    const foreign = existing.rows.find((row) => row.battle_id !== battleId);
    if (foreign) throw new UserFacingError("底牌不属于当前战局。", { status: 409, reasonCode: "inventory_scope_mismatch" });
  }
  const ids = input.map((item) => item.id ?? randomUUID());
  let items: InventoryItem[] = [];
  if (input.length) {
    // `evidence.jobId` is server-reserved: `appendInventory` reads it back to
    // decide whether a job's cards were already applied, so a client that wrote
    // one here could suppress a later job's insert (or forge AI provenance).
    // The AI path builds `evidence` itself, so stripping only affects this one.
    const statement = buildMultiRowInsert(
      "battle_inventory_items",
      ["id","battle_id","category","label","description","quantity","unit","availability","expires_at","cost_json","evidence_json"],
      [null,null,null,null,null,"numeric",null,null,"timestamptz","jsonb","jsonb"],
      input.map((item, index) => [ids[index], battleId, item.category, item.label, item.description, item.quantity, item.unit, item.availability, item.expiresAt, JSON.stringify(item.cost), JSON.stringify(stripReservedJobId(item.evidence))]),
    );
    // `battle_id` is deliberately absent from the SET list: every supplied id was
    // just proven to belong to this battle, so re-assigning it could only be a
    // no-op — or, if that proof were ever wrong, a cross-battle move.
    const rows = await client.query<InventoryRow>(
      `${statement.text} ON CONFLICT (id) DO UPDATE SET category=EXCLUDED.category,label=EXCLUDED.label,description=EXCLUDED.description,quantity=EXCLUDED.quantity,unit=EXCLUDED.unit,availability=EXCLUDED.availability,expires_at=EXCLUDED.expires_at,cost_json=EXCLUDED.cost_json,evidence_json=EXCLUDED.evidence_json RETURNING id,battle_id,category,label,description,quantity,unit,availability,expires_at,cost_json,evidence_json`,
      statement.values,
    );
    items = orderRowsByKey(rows.rows.map(mapInventory), ids, (item) => item.id, "保存战局底牌");
  }
  // `id = ANY('{}')` is false for every row, so an empty request deletes the whole
  // inventory without needing the separate branch the per-row loop used.
  await client.query(`DELETE FROM battle_inventory_items WHERE battle_id=$1 AND NOT (id = ANY($2::uuid[]))`, [battleId, ids]);
  // Remove references to cards that are no longer part of this inventory.
  // Strategy source is JSON by design, so clean only the known card-id field.
  await client.query(
    `UPDATE battle_moves
     SET source_json = jsonb_set(source_json, '{assignedCardIds}',
       COALESCE((SELECT jsonb_agg(to_jsonb(card_id))
                 FROM jsonb_array_elements_text(source_json->'assignedCardIds') AS cards(card_id)
                 WHERE card_id = ANY($2::text[])), '[]'::jsonb), true)
     WHERE battle_id=$1 AND source_json ? 'assignedCardIds' AND jsonb_typeof(source_json->'assignedCardIds')='array'`,
    [battleId, ids],
  );
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return items;
});

/**
 * Append generated or user-provided inventory without deleting existing cards.
 *
 * `jobId` in `evidence_json` is an idempotency key for AI retries, and it names a
 * *job* rather than an item — every card of one model response carries the same
 * id, and a job's cards are written inside this one transaction. So "this job id
 * is already stored" means the whole job was applied, and its rows are reused.
 *
 * The previous per-item `... LIMIT 1` lookup asked that question once per card and
 * answered it with the *first* card every time, which silently collapsed a
 * multi-card job into a single inventory item: three generated cards produced one
 * row. One lookup for the whole batch both fixes that and removes the per-card
 * round trip.
 *
 * Cards with no job id are always appended.
 */
export const appendInventory = async (subject: AccountSubject, battleId: string, input: Array<Omit<InventoryItem, "id"|"battleId">>) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const jobIds = [...new Set(input.flatMap((item) => { const jobId = inventoryJobId(item.evidence); return jobId ? [jobId] : []; }))];
  // job id -> the rows that job already stored, in insertion order.
  const applied = new Map<string, InventoryItem[]>();
  if (jobIds.length) {
    const existing = await client.query<InventoryRow>(`SELECT id,battle_id,category,label,description,quantity,unit,availability,expires_at,cost_json,evidence_json FROM battle_inventory_items WHERE battle_id=$1 AND evidence_json->>'jobId' = ANY($2::text[]) ORDER BY created_at,id`, [battleId, jobIds]);
    for (const row of existing.rows) {
      const jobId = inventoryJobId(asRecord(row.evidence_json));
      if (!jobId) continue;
      const bucket = applied.get(jobId);
      if (bucket) bucket.push(mapInventory(row));
      else applied.set(jobId, [mapInventory(row)]);
    }
  }
  const fresh = input.filter((item) => { const jobId = inventoryJobId(item.evidence); return !jobId || !applied.has(jobId); });
  const inserted: InventoryItem[] = [];
  if (fresh.length) {
    const ids = fresh.map(() => randomUUID());
    const statement = buildMultiRowInsert(
      "battle_inventory_items",
      ["id","battle_id","category","label","description","quantity","unit","availability","expires_at","cost_json","evidence_json"],
      [null,null,null,null,null,"numeric",null,null,"timestamptz","jsonb","jsonb"],
      fresh.map((item, index) => [ids[index], battleId, item.category, item.label, item.description, item.quantity, item.unit, item.availability, item.expiresAt, JSON.stringify(item.cost), JSON.stringify(item.evidence)]),
    );
    const rows = await client.query<InventoryRow>(`${statement.text} RETURNING id,battle_id,category,label,description,quantity,unit,availability,expires_at,cost_json,evidence_json`, statement.values);
    inserted.push(...orderRowsByKey(rows.rows.map(mapInventory), ids, (item) => item.id, "写入战局底牌"));
  }
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  // Walk the request in order. A job that was already applied contributes its
  // stored rows once, at the first card that names it; everything else takes the
  // row just written for it.
  const items: InventoryItem[] = [];
  const reported = new Set<string>();
  let next = 0;
  for (const item of input) {
    const jobId = inventoryJobId(item.evidence);
    const stored = jobId ? applied.get(jobId) : undefined;
    if (stored) {
      if (reported.has(jobId!)) continue;
      reported.add(jobId!);
      items.push(...stored);
      continue;
    }
    items.push(inserted[next++]);
  }
  return items;
});

export const saveGravityLine = async (subject: AccountSubject, battleId: string, gravity: GravityLine) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const version = (await client.query<{ version:number }>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_gravity_lines WHERE battle_id=$1`, [battleId])).rows[0].version;
  await client.query(`INSERT INTO battle_gravity_lines(id,battle_id,version,summary,assumptions_json,expected_outcome,resource_cost_json,failure_reasons_json,confidence,source_json) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8::jsonb,$9,$10::jsonb)`, [randomUUID(),battleId,version,gravity.summary,JSON.stringify(gravity.assumptions),gravity.expectedOutcome,JSON.stringify(gravity.resourceCost),JSON.stringify(gravity.failureReasons),gravity.confidence,JSON.stringify(gravity.source)]);
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return { ...gravity, version };
});

export const getLatestGravityLine = async (subject: AccountSubject, battleId: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<GravityRow>(`SELECT version,summary,assumptions_json,expected_outcome,resource_cost_json,failure_reasons_json,confidence,source_json FROM battle_gravity_lines WHERE battle_id=$1 ORDER BY version DESC LIMIT 1`, [battleId]);
  return result.rows[0] ? mapGravity(result.rows[0]) : undefined;
};

export const saveResourceSnapshot = async (subject: AccountSubject, battleId: string, snapshot: ResourceSnapshot) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const version = (await client.query<{ version:number }>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_resource_snapshots WHERE battle_id=$1`, [battleId])).rows[0].version;
  await client.query(`INSERT INTO battle_resource_snapshots(id,battle_id,version,snapshot_json) VALUES($1,$2,$3,$4::jsonb)`, [randomUUID(),battleId,version,JSON.stringify(snapshot)]);
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return { version, snapshot };
});

export const getLatestResourceSnapshot = async (subject: AccountSubject, battleId: string): Promise<ResourceSnapshot | null> => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<ResourceRow>(`SELECT snapshot_json FROM battle_resource_snapshots WHERE battle_id=$1 ORDER BY version DESC LIMIT 1`, [battleId]);
  return result.rows[0] ? asRecord(result.rows[0].snapshot_json) as ResourceSnapshot : null;
};

export const replaceJunctions = async (subject: AccountSubject, battleId: string, input: Array<Omit<Junction, "id"|"battleId">>) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  await client.query(`DELETE FROM battle_junctions WHERE battle_id=$1 AND status='open'`, [battleId]);
  const junctions: Junction[] = [];
  if (input.length) {
    const ids = input.map(() => randomUUID());
    const statement = buildMultiRowInsert(
      "battle_junctions",
      ["id","battle_id","title","description","window_start","window_end","half_life_at","core_variable","default_consequence","urgency","leverage","irreversibility","status","source_json"],
      [null,null,null,null,"timestamptz","timestamptz","timestamptz",null,null,"int","int","int",null,"jsonb"],
      input.map((item, index) => [ids[index], battleId, item.title, item.description, item.windowStart, item.windowEnd, item.halfLifeAt, item.coreVariable, item.defaultConsequence, item.urgency, item.leverage, item.irreversibility, item.status, JSON.stringify(item.source)]),
    );
    const rows = await client.query<JunctionRow>(`${statement.text} RETURNING id,battle_id,title,description,window_start,window_end,half_life_at,core_variable,default_consequence,urgency,leverage,irreversibility,status,source_json`, statement.values);
    junctions.push(...orderRowsByKey(rows.rows.map(mapJunction), ids, (item) => item.id, "写入决策节点"));
  }
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return junctions;
});

export const listJunctions = async (subject: AccountSubject, battleId: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<JunctionRow>(`SELECT id,battle_id,title,description,window_start,window_end,half_life_at,core_variable,default_consequence,urgency,leverage,irreversibility,status,source_json FROM battle_junctions WHERE battle_id=$1 ORDER BY status='open' DESC, urgency DESC, leverage DESC, half_life_at NULLS LAST`, [battleId]);
  return result.rows.map(mapJunction);
};

export const saveMoveSet = async (subject: AccountSubject, battleId: string, junctionId: string, moves: Array<Omit<Move, "id"|"battleId"|"junctionId"|"version"|"state">>) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT c.id FROM battle_cases c JOIN battle_junctions j ON j.battle_id=c.id WHERE c.id=$1 AND j.id=$2 AND (${writableCasePredicate34('c')}) FOR UPDATE`, [battleId,junctionId,...ownership(subject)]);
  if (!owner.rowCount) return null;
  const version = (await client.query<{ version:number }>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_moves WHERE battle_id=$1`, [battleId])).rows[0].version;
  const saved: Move[] = [];
  if (moves.length) {
    const ids = moves.map(() => randomUUID());
    const statement = buildMultiRowInsert(
      "battle_moves",
      ["id","battle_id","junction_id","version","kind","title","key_variable","rationale","action_json","cost_json","upside_json","failure_cost_json","validation_json","stop_json","assumptions_json","source_json"],
      [null,null,"uuid","int",null,null,null,null,"jsonb","jsonb","jsonb","jsonb","jsonb","jsonb","jsonb","jsonb"],
      moves.map((move, index) => [ids[index], battleId, junctionId, version, move.kind, move.title, move.keyVariable, move.rationale, JSON.stringify(move.actions), JSON.stringify(move.cost), JSON.stringify(move.upside), JSON.stringify(move.failureCost), JSON.stringify(move.validation), JSON.stringify(move.stop), JSON.stringify(move.assumptions), JSON.stringify(move.source)]),
    );
    const rows = await client.query<MoveRow>(`${statement.text} RETURNING id,battle_id,junction_id,version,kind,title,key_variable,rationale,action_json,cost_json,upside_json,failure_cost_json,validation_json,stop_json,assumptions_json,source_json,state`, statement.values);
    saved.push(...orderRowsByKey(rows.rows.map(mapMove), ids, (item) => item.id, "写入战局动作"));
  }
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return saved;
});

export const listMoves = async (subject: AccountSubject, battleId: string, junctionId?: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<MoveRow>(junctionId ? `SELECT id,battle_id,junction_id,version,kind,title,key_variable,rationale,action_json,cost_json,upside_json,failure_cost_json,validation_json,stop_json,assumptions_json,source_json,state FROM battle_moves WHERE battle_id=$1 AND junction_id=$2 ORDER BY version DESC,kind` : `SELECT id,battle_id,junction_id,version,kind,title,key_variable,rationale,action_json,cost_json,upside_json,failure_cost_json,validation_json,stop_json,assumptions_json,source_json,state FROM battle_moves WHERE battle_id=$1 ORDER BY version DESC,kind`, junctionId ? [battleId,junctionId] : [battleId]);
  return result.rows.map(mapMove);
};

export const deleteDraftMove = async (subject: AccountSubject, battleId: string, moveId: string) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT c.id FROM battle_cases c JOIN battle_moves m ON m.battle_id=c.id WHERE c.id=$1 AND m.id=$2 AND (${writableCasePredicate34('c')}) FOR UPDATE`, [battleId, moveId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const deleted = await client.query(`DELETE FROM battle_moves WHERE id=$1 AND battle_id=$2 AND state='draft' RETURNING id`, [moveId, battleId]);
  return Boolean(deleted.rowCount);
});

export const updateDraftMoveSource = async (subject: AccountSubject, battleId: string, moveId: string, source: Record<string, unknown>) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT m.id FROM battle_moves m JOIN battle_cases c ON c.id=m.battle_id WHERE m.id=$1 AND m.battle_id=$2 AND (${writableCasePredicate34('c')}) AND m.state='draft' FOR UPDATE`, [moveId, battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const result = await client.query<MoveRow>(`UPDATE battle_moves SET source_json=$3::jsonb WHERE id=$1 AND battle_id=$2 AND state='draft' RETURNING id,battle_id,junction_id,version,kind,title,key_variable,rationale,action_json,cost_json,upside_json,failure_cost_json,validation_json,stop_json,assumptions_json,source_json,state`, [moveId, battleId, JSON.stringify(source)]);
  await client.query(`UPDATE battle_cases SET updated_at=now() WHERE id=$1`, [battleId]);
  return result.rows[0] ? mapMove(result.rows[0]) : null;
});

export const commitMove = async (subject: AccountSubject, battleId: string, moveId: string, changeReason?: string) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT b.id FROM battle_cases b WHERE b.id=$1 AND (${writableBattlePredicate}) FOR UPDATE`, [battleId, ...ownership(subject)]);
  if (!owner.rowCount) return null;
  const move = await client.query<MoveRow>(`SELECT id,battle_id,junction_id,version,kind,title,key_variable,rationale,action_json,cost_json,upside_json,failure_cost_json,validation_json,stop_json,assumptions_json,source_json,state FROM battle_moves WHERE id=$1 AND battle_id=$2 AND state NOT IN ('stopped','rejected','verified') FOR UPDATE`, [moveId,battleId]);
  if (!move.rowCount) return { invalidMove: true as const };
  const selected = mapMove(move.rows[0]);
  const active = await client.query<{ id:string }>(`SELECT id FROM battle_commitments WHERE battle_id=$1 AND status='active' FOR UPDATE`, [battleId]);
  if (active.rowCount && !changeReason?.trim()) return { missingChangeReason: true as const };
  const version = (await client.query<{ version:number }>(`SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_commitments WHERE battle_id=$1`, [battleId])).rows[0].version;
  await client.query(`UPDATE battle_commitments SET status='superseded',ended_at=now() WHERE battle_id=$1 AND status='active'`, [battleId]);
  const id = randomUUID();
  await client.query(`INSERT INTO battle_commitments(id,battle_id,move_id,version,snapshot_json) VALUES($1,$2,$3,$4,$5::jsonb)`, [id,battleId,moveId,version,JSON.stringify({ ...selected, commitmentChangeReason: changeReason?.trim() || null })]);
  await client.query(`UPDATE battle_moves SET state='selected' WHERE id=$1`, [moveId]);
  // A committed move starts one explicit, battle-scoped reality echo. The
  // echo is deterministic from the committed strategy; users resolve it in
  // the UI and the resulting snapshot remains durable across refreshes.
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`battle-module:${battleId}:reality-echoes`]);
  const echoState = await client.query<{ state_json: unknown }>(
    `SELECT state_json FROM battle_module_states
      WHERE battle_id=$1 AND module_id='reality-echoes'
      ORDER BY version DESC LIMIT 1`,
    [battleId],
  );
  const currentEchoState = asRecord(echoState.rows[0]?.state_json);
  const echoes = Array.isArray(currentEchoState.items)
    ? currentEchoState.items.filter((item): item is Json => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
  if (!echoes.some((echo) => echo.commitmentId === id)) {
    const createdAt = new Date();
    const echoId = randomUUID();
    const dustId = randomUUID();
    const strategyTitle = selected.title.slice(0, 200);
    const echo = {
      id: echoId,
      commitmentId: id,
      battlefieldId: battleId,
      battlefieldTitle: String((await client.query<{ title:string }>(`SELECT title FROM battle_cases WHERE id=$1`, [battleId])).rows[0]?.title ?? "现实决策战局"),
      singularityStrategyName: strategyTitle,
      createdAt: createdAt.toISOString(),
      echoPeriodDays: 14,
      remainingDays: 14,
      equilibriumStatus: "UNSTABLE_ECHO",
      equilibriumProgress: 0,
      causalDustEvents: [{
        id: dustId,
        title: "执行后的关键假设待验证",
        sourceSingularity: strategyTitle,
        description: `策略「${strategyTitle}」已进入执行。请在回响期内验证成功信号与停止条件，避免把推演结果误当作现实结果。`,
        collateralType: "REPUTATION_FALLOUT",
        collateralTypeName: "关系与信誉余震",
        severity: "MEDIUM",
        options: [
          { id: randomUUID(), action: "先做小范围验证", outcomeProb: 70, costEquity: 0, rewardDesc: "降低错误扩散范围", actionExplanation: "用最小可逆动作验证策略的关键假设。" },
          { id: randomUUID(), action: "收缩暴露面并保留退出口", outcomeProb: 55, costEquity: 0, rewardDesc: "保留换线空间", actionExplanation: "降低承诺强度，直到成功信号被现实确认。" },
        ],
        status: "PENDING",
      }],
      finalRewardUnlocked: false,
      rewardClaimStatus: "unrequested",
      finalRewardEquity: 0,
      postDeductionNarrative: "这不是预测结论，而是对已提交行动的现实反馈记录。先观察信号，再决定是否继续加码。",
    };
    const nextState = { ...currentEchoState, items: [...echoes, echo] };
    const nextVersion = (await client.query<{ version:number }>(
      `SELECT COALESCE(MAX(version),0)+1 AS version FROM battle_module_states WHERE battle_id=$1 AND module_id='reality-echoes'`,
      [battleId],
    )).rows[0].version;
    await client.query(
      `INSERT INTO battle_module_states(id,battle_id,module_id,version,state_json,consent_json)
       VALUES($1,$2,'reality-echoes',$3,$4::jsonb,$5::jsonb)`,
      [randomUUID(), battleId, nextVersion, JSON.stringify(nextState), JSON.stringify({ source: "commitment", commitmentId: id })],
    );
    await client.query(
      `INSERT INTO battle_module_state_events(id,battle_id,module_id,version,actor_subject_type,actor_subject_id,event_type,state_json,consent_json)
       VALUES($1,$2,'reality-echoes',$3,$4,$5,'created',$6::jsonb,$7::jsonb)`,
      [randomUUID(), battleId, nextVersion, subject.subjectType, subject.subjectId, JSON.stringify(nextState), JSON.stringify({ source: "commitment", commitmentId: id })],
    );
  }
  await client.query(`UPDATE battle_cases SET status='committed',updated_at=now() WHERE id=$1`, [battleId]);
  return { id, battleId, moveId, version, snapshot: selected, status: 'active' as const };
});

export const getActiveCommitment = async (subject: AccountSubject, battleId: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const result = await query<CommitmentRow>(`SELECT id,battle_id,move_id,version,snapshot_json,committed_at,ended_at,status FROM battle_commitments WHERE battle_id=$1 AND status='active' ORDER BY version DESC LIMIT 1`, [battleId]);
  const row = result.rows[0];
  return row ? { id:row.id, battleId:row.battle_id, moveId:row.move_id, version:row.version, snapshot:asRecord(row.snapshot_json), committedAt:row.committed_at.toISOString(), endedAt:iso(row.ended_at), status:row.status } : undefined;
};

export const saveExecutionPlan = async (subject: AccountSubject, battleId: string, moveId: string, actions: Array<{ title:string; description:string; owner:string; dueAt:string|null; successSignal:string; failureSignal:string }>, breakers: Array<{ kind:string; label:string; threshold:Json; actionOnTrigger:string; enabled:boolean }>) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT m.id FROM battle_moves m JOIN battle_cases b ON b.id=m.battle_id JOIN battle_commitments cm ON cm.move_id=m.id AND cm.battle_id=m.battle_id AND cm.status='active' WHERE m.id=$1 AND m.battle_id=$2 AND (${writableCasePredicate34('b')}) FOR UPDATE`, [moveId,battleId,...ownership(subject)]);
  if (!owner.rowCount) return null;
  await client.query(`DELETE FROM battle_move_actions WHERE move_id=$1`, [moveId]);
  await client.query(`DELETE FROM battle_breakers WHERE move_id=$1`, [moveId]);
  const savedActions = [];
  if (actions.length) {
    const ids = actions.map(() => randomUUID());
    const statement = buildMultiRowInsert(
      "battle_move_actions",
      ["id","move_id","sequence_no","title","description","owner","due_at","success_signal","failure_signal"],
      [null,"uuid","int",null,null,null,"timestamptz",null,null],
      actions.map((item, index) => [ids[index], moveId, index + 1, item.title, item.description, item.owner, item.dueAt, item.successSignal, item.failureSignal]),
    );
    const rows = await client.query<{ id:string; sequence_no:number; status:string }>(`${statement.text} RETURNING id,sequence_no,status`, statement.values);
    // `sequence_no` is the request position, so zipping the re-ordered rows back
    // onto the input keeps the response in request order.
    savedActions.push(...orderRowsByKey(rows.rows, ids, (row) => row.id, "写入落子行动")
      .map((row, index) => ({ ...actions[index], id:row.id, sequenceNo:row.sequence_no, status:row.status })));
  }
  const savedBreakers = [];
  if (breakers.length) {
    const ids = breakers.map(() => randomUUID());
    const statement = buildMultiRowInsert(
      "battle_breakers",
      ["id","move_id","kind","label","threshold_json","action_on_trigger","enabled"],
      [null,"uuid",null,null,"jsonb",null,null],
      breakers.map((item, index) => [ids[index], moveId, item.kind, item.label, JSON.stringify(item.threshold), item.actionOnTrigger, item.enabled]),
    );
    await client.query(statement.text, statement.values);
    savedBreakers.push(...breakers.map((item, index) => ({ ...item, id:ids[index], moveId, triggeredAt:null })));
  }
  await client.query(`UPDATE battle_moves SET state='executing' WHERE id=$1` , [moveId]);
  await client.query(`UPDATE battle_cases SET status='committed',updated_at=now() WHERE id=$1`, [battleId]);
  return { actions:savedActions, breakers:savedBreakers };
});

export const getExecutionPlan = async (subject: AccountSubject, battleId: string, moveId: string) => {
  if (!await requireAccessibleBattle(subject, battleId)) return null;
  const ownedMove = await query<{ id:string }>(`SELECT m.id FROM battle_moves m WHERE m.id=$1 AND m.battle_id=$2`, [moveId,battleId]);
  if (!ownedMove.rowCount) return null;
  const [actions, breakers] = await Promise.all([
    query<{id:string;sequence_no:number;title:string;description:string;owner:string;due_at:Date|null;status:string;success_signal:string;failure_signal:string;actual_cost_json:Json;completed_at:Date|null}>(`SELECT id,sequence_no,title,description,owner,due_at,status,success_signal,failure_signal,actual_cost_json,completed_at FROM battle_move_actions WHERE move_id=$1 ORDER BY sequence_no`, [moveId]),
    query<{id:string;kind:string;label:string;threshold_json:Json;action_on_trigger:string;enabled:boolean;triggered_at:Date|null}>(`SELECT id,kind,label,threshold_json,action_on_trigger,enabled,triggered_at FROM battle_breakers WHERE move_id=$1 ORDER BY id`, [moveId]),
  ]);
  return { actions: actions.rows.map((row)=>({ id:row.id, sequenceNo:row.sequence_no, title:row.title, description:row.description, owner:row.owner, dueAt:iso(row.due_at), status:row.status, successSignal:row.success_signal, failureSignal:row.failure_signal, actualCost:asRecord(row.actual_cost_json), completedAt:iso(row.completed_at) })), breakers: breakers.rows.map((row)=>({ id:row.id, moveId, kind:row.kind, label:row.label, threshold:asRecord(row.threshold_json), actionOnTrigger:row.action_on_trigger, enabled:row.enabled, triggeredAt:iso(row.triggered_at) })) };
};

export const updateExecutionAction = async (subject: AccountSubject, battleId: string, moveId: string, actionId: string, status: string, actualCost: Json = {}) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT a.id FROM battle_move_actions a JOIN battle_moves m ON m.id=a.move_id JOIN battle_cases b ON b.id=m.battle_id WHERE a.id=$1 AND m.id=$2 AND b.id=$3 AND ((b.platform_subject_type=$4 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators bc WHERE bc.battle_id=b.id AND bc.subject_type=$4 AND bc.subject_id=$5 AND ${activeCollaborator} AND bc.role='contributor'))) FOR UPDATE`, [actionId,moveId,battleId,...ownership(subject)]);
  if (!owner.rowCount) return null;
  const completed = status === "done" ? "now()" : "NULL";
  const row = await client.query<{id:string;sequence_no:number;title:string;description:string;owner:string;due_at:Date|null;status:string;success_signal:string;failure_signal:string;actual_cost_json:Json;completed_at:Date|null}>(`UPDATE battle_move_actions SET status=$3,actual_cost_json=$4::jsonb,completed_at=${completed} WHERE id=$1 AND move_id=$2 RETURNING id,sequence_no,title,description,owner,due_at,status,success_signal,failure_signal,actual_cost_json,completed_at`, [actionId,moveId,status,JSON.stringify(actualCost)]);
  await client.query(`UPDATE battle_cases SET updated_at=now(),status=CASE WHEN $2='done' THEN 'monitoring' ELSE status END WHERE id=$1`, [battleId,status]);
  const item=row.rows[0]; return item ? { id:item.id, sequenceNo:item.sequence_no, title:item.title, description:item.description, owner:item.owner, dueAt:iso(item.due_at), status:item.status, successSignal:item.success_signal, failureSignal:item.failure_signal, actualCost:asRecord(item.actual_cost_json), completedAt:iso(item.completed_at) } : null;
});

export const triggerBreaker = async (subject: AccountSubject, battleId: string, moveId: string, breakerId: string) => withTransaction(async (client) => {
  const owner = await client.query(`SELECT br.id FROM battle_breakers br JOIN battle_moves m ON m.id=br.move_id JOIN battle_cases b ON b.id=m.battle_id WHERE br.id=$1 AND m.id=$2 AND b.id=$3 AND ((b.platform_subject_type=$4 AND b.platform_subject_id=$5) OR EXISTS (SELECT 1 FROM battle_collaborators bc WHERE bc.battle_id=b.id AND bc.subject_type=$4 AND bc.subject_id=$5 AND ${activeCollaborator} AND bc.role='contributor'))) FOR UPDATE`, [breakerId,moveId,battleId,...ownership(subject)]);
  if (!owner.rowCount) return null;
  const breaker = await client.query<{id:string;kind:string;label:string;threshold_json:Json;action_on_trigger:string;enabled:boolean;triggered_at:Date|null}>(`UPDATE battle_breakers SET triggered_at=COALESCE(triggered_at,now()) WHERE id=$1 RETURNING id,kind,label,threshold_json,action_on_trigger,enabled,triggered_at`, [breakerId]);
  await client.query(`UPDATE battle_moves SET state='stopped' WHERE id=$1`, [moveId]);
  await client.query(`UPDATE battle_commitments SET status='stopped',ended_at=COALESCE(ended_at,now()) WHERE battle_id=$1 AND move_id=$2 AND status='active'`, [battleId,moveId]);
  await client.query(`UPDATE battle_cases SET status='active',updated_at=now() WHERE id=$1`, [battleId]);
  const row=breaker.rows[0]; return row ? { id:row.id,moveId,kind:row.kind,label:row.label,threshold:asRecord(row.threshold_json),actionOnTrigger:row.action_on_trigger,enabled:row.enabled,triggeredAt:iso(row.triggered_at) } : null;
});
