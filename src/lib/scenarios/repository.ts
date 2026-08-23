import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { getScenario, SCENARIO_CATALOG_VERSION, type ScenarioSeed } from "./catalog";

const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];

export async function cloneScenario(subject: AccountSubject, scenario: ScenarioSeed) {
  return withTransaction(async (client) => {
    const battleId = randomUUID();
    const hardDeadline = new Date(Date.now() + scenario.hardDeadlineDays * 86_400_000);
    await client.query(`INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,minimum_outcome,ideal_outcome,opponent_summary,hard_deadline,scenario_id,scenario_version,source_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'official_catalog')`, [battleId, ...owner(subject), scenario.title, scenario.objective, scenario.minimumOutcome, scenario.idealOutcome, scenario.opponentSummary, hardDeadline, scenario.id, scenario.version]);
    for (const fact of scenario.facts) await client.query(`INSERT INTO battle_facts(id,battle_id,kind,content,source,confidence) VALUES($1,$2,$3,$4,'system',$5)`, [randomUUID(), battleId, fact.kind, fact.content, fact.confidence]);
    for (const constraint of scenario.constraints) await client.query(`INSERT INTO battle_constraints(id,battle_id,kind,label,description,hard,severity,source_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`, [randomUUID(), battleId, constraint.kind, constraint.label, constraint.description, constraint.hard, constraint.severity, JSON.stringify({ scenarioId: scenario.id, version: scenario.version })]);
    for (const item of scenario.inventory) await client.query(`INSERT INTO battle_inventory_items(id,battle_id,category,label,description,quantity,unit,evidence_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`, [randomUUID(), battleId, item.category, item.label, item.description, item.quantity ?? null, item.unit ?? null, JSON.stringify({ source: "official_catalog", scenarioId: scenario.id })]);
    await client.query(`INSERT INTO battle_scenario_snapshots(id,battle_id,scenario_id,scenario_version,catalog_version,snapshot_json) VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [randomUUID(), battleId, scenario.id, scenario.version, SCENARIO_CATALOG_VERSION, JSON.stringify(scenario)]);
    return { battleId, scenarioId: scenario.id, scenarioVersion: scenario.version, sourceType: "official_catalog" as const };
  });
}

export async function getBattleScenario(subject: AccountSubject, battleId: string) {
  const result = await query<{ scenario_id: string; scenario_version: number; catalog_version: number; snapshot_json: unknown }>(`SELECT s.scenario_id,s.scenario_version,s.catalog_version,s.snapshot_json FROM battle_scenario_snapshots s JOIN battle_cases b ON b.id=s.battle_id WHERE s.battle_id=$1 AND b.platform_subject_type=$2 AND b.platform_subject_id=$3 ORDER BY s.created_at DESC LIMIT 1`, [battleId, ...owner(subject)]);
  const row = result.rows[0];
  return row ? { scenarioId: row.scenario_id, scenarioVersion: row.scenario_version, catalogVersion: row.catalog_version, snapshot: row.snapshot_json } : null;
}

export function scenarioById(id: string) { return getScenario(id); }
