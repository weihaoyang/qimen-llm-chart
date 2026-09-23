import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { SCENARIO_CATALOG_VERSION, getScenario, type ScenarioSeed } from "./catalog";
import { getOfficialScenario } from "@/lib/catalog/official-repository";
import { strategyTemplatesForScenario } from "./strategy-templates";
import { reportSwallowedError } from "@/lib/internal-log";
import { buildMultiRowInsert } from "@/lib/db/batch";

const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];

export async function cloneScenario(subject: AccountSubject, scenario: ScenarioSeed) {
  return withTransaction(async (client) => {
    const battleId = randomUUID();
    const hardDeadline = new Date(Date.now() + scenario.hardDeadlineDays * 86_400_000);
    await client.query(`INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,minimum_outcome,ideal_outcome,opponent_summary,hard_deadline,scenario_id,scenario_version,source_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'official_catalog')`, [battleId, ...owner(subject), scenario.title, scenario.objective, scenario.minimumOutcome, scenario.idealOutcome, scenario.opponentSummary, hardDeadline, scenario.id, scenario.version]);
    if (scenario.facts.length) {
      const statement = buildMultiRowInsert(
        "battle_facts",
        ["id","battle_id","kind","content","source","confidence"],
        [null,null,null,null,null,"int"],
        scenario.facts.map((fact) => [randomUUID(), battleId, fact.kind, fact.content, "system", fact.confidence]),
      );
      await client.query(statement.text, statement.values);
    }
    if (scenario.constraints.length) {
      const source = JSON.stringify({ scenarioId: scenario.id, version: scenario.version });
      const statement = buildMultiRowInsert(
        "battle_constraints",
        ["id","battle_id","kind","label","description","hard","severity","source_json"],
        [null,null,null,null,null,null,"int","jsonb"],
        scenario.constraints.map((constraint) => [randomUUID(), battleId, constraint.kind, constraint.label, constraint.description, constraint.hard, constraint.severity, source]),
      );
      await client.query(statement.text, statement.values);
    }
    if (scenario.inventory.length) {
      const evidence = JSON.stringify({ source: "official_catalog", scenarioId: scenario.id });
      const statement = buildMultiRowInsert(
        "battle_inventory_items",
        ["id","battle_id","category","label","description","quantity","unit","evidence_json"],
        [null,null,null,null,null,"numeric",null,"jsonb"],
        scenario.inventory.map((item) => [randomUUID(), battleId, item.category, item.label, item.description, item.quantity ?? null, item.unit ?? null, evidence]),
      );
      await client.query(statement.text, statement.values);
    }
    // Every cloned scenario starts with one explicit, editable decision
    // junction. Without it the copied case looked populated but the first
    // strategy could not be persisted because /moves requires a junction.
    const junctionId = randomUUID();
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + scenario.hardDeadlineDays * 86_400_000);
    const halfLifeAt = new Date(startsAt.getTime() + Math.max(1, Math.floor(scenario.hardDeadlineDays / 2)) * 86_400_000);
    await client.query(`INSERT INTO battle_junctions(id,battle_id,title,description,window_start,window_end,half_life_at,core_variable,default_consequence,urgency,leverage,irreversibility,status,source_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'open',$13::jsonb)`, [junctionId, battleId, `首个决策节点：${scenario.title}`, scenario.description, startsAt, endsAt, halfLifeAt, scenario.objective, scenario.minimumOutcome, 5, 4, 4, JSON.stringify({ source: "official_catalog", scenarioId: scenario.id, scenarioVersion: scenario.version })]);
    await client.query(`INSERT INTO battle_scenario_snapshots(id,battle_id,scenario_id,scenario_version,catalog_version,snapshot_json) VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [randomUUID(), battleId, scenario.id, scenario.version, SCENARIO_CATALOG_VERSION, JSON.stringify({ ...scenario, strategyTemplates: strategyTemplatesForScenario(scenario) })]);
    return { battleId, scenarioId: scenario.id, scenarioVersion: scenario.version, sourceType: "official_catalog" as const };
  });
}

export async function getBattleScenario(subject: AccountSubject, battleId: string) {
  const result = await query<{ scenario_id: string; scenario_version: number; catalog_version: number; snapshot_json: unknown }>(`SELECT s.scenario_id,s.scenario_version,s.catalog_version,s.snapshot_json
    FROM battle_scenario_snapshots s
    JOIN battle_cases b ON b.id=s.battle_id
    WHERE s.battle_id=$1
      AND (
        (b.platform_subject_type=$2 AND b.platform_subject_id=$3)
        OR EXISTS (
          SELECT 1
          FROM battle_collaborators c
          WHERE c.battle_id=b.id
            AND c.subject_type=$2
            AND c.subject_id=$3
            AND c.status='active'
            AND (c.expires_at IS NULL OR c.expires_at>now())
        )
      )
    ORDER BY s.created_at DESC LIMIT 1`, [battleId, ...owner(subject)]);
  const row = result.rows[0];
  return row ? { scenarioId: row.scenario_id, scenarioVersion: row.scenario_version, catalogVersion: row.catalog_version, snapshot: row.snapshot_json } : null;
}

export async function scenarioById(id: string) { return getOfficialScenario(id); }

/**
 * Read-only lookup for the two *public* scenario reference endpoints.
 *
 * `scenarioById` deliberately stays fail-closed, because cloning and
 * strategy-template generation write rows derived from the catalog and must not
 * proceed against a stale seed. These two GET endpoints only render a catalog
 * page, so a database outage degrades to the bundled seed — the same content
 * the catalog is seeded from — instead of surfacing an unhandled 500. An
 * operator-edited catalog still wins whenever the database answers.
 */
export async function publicScenarioById(id: string): Promise<ScenarioSeed | null> {
  try {
    return await getOfficialScenario(id);
  } catch (error) {
    reportSwallowedError("scenarios", `案例目录读取失败（scenarioId=${id}），已回退到内置目录。`, error);
    return getScenario(id) ?? null;
  }
}
