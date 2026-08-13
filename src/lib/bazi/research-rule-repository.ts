import { withTransaction } from "@/lib/db/pool";
import {
  type ResearchReleaseBundle,
  type ResearchRuleDefinition,
  researchRuleHash,
  validateResearchRuleDefinition,
} from "./research-rules";

export type ResearchRuleRelease = {
  ruleHash: string;
  experimentId: string;
  basePredictionVersion: string;
  ruleDefinition: ResearchRuleDefinition;
  status: "staged" | "active" | "superseded" | "retired";
  activatedAt: string | null;
  createdAt: string;
};

type ReleaseRow = {
  rule_hash: string; experiment_id: string; base_prediction_version: string; rule_definition_json: unknown;
  status: ResearchRuleRelease["status"]; activated_at: Date | null; created_at: Date;
};

const mapRelease = (row: ReleaseRow): ResearchRuleRelease => ({
  ruleHash: row.rule_hash,
  experimentId: row.experiment_id,
  basePredictionVersion: row.base_prediction_version,
  ruleDefinition: validateResearchRuleDefinition(row.rule_definition_json),
  status: row.status,
  activatedAt: row.activated_at?.toISOString() ?? null,
  createdAt: row.created_at.toISOString(),
});

const releaseColumns = "rule_hash,experiment_id,base_prediction_version,rule_definition_json,status,activated_at,created_at";
const releaseQuery = `SELECT ${releaseColumns} FROM bazi_research_rule_releases`;

export const stageResearchRuleRelease = async (bundle: ResearchReleaseBundle) => {
  const definition = validateResearchRuleDefinition(bundle.rule_definition);
  const expectedHash = researchRuleHash(bundle.base_prediction_version, definition);
  if (bundle.release_contract_version !== "bazi-research-release-v1" || bundle.rule_hash !== expectedHash || !bundle.experiment_id || bundle.experiment_id.length > 64) {
    throw new Error("研究发布 bundle 不完整或哈希不一致。");
  }
  return withTransaction(async (client) => {
    const existing = await client.query<ReleaseRow>(`${releaseQuery} WHERE rule_hash=$1 FOR UPDATE`, [bundle.rule_hash]);
    if (existing.rows[0]) return mapRelease(existing.rows[0]);
    const inserted = await client.query<ReleaseRow>(`INSERT INTO bazi_research_rule_releases(rule_hash,experiment_id,base_prediction_version,rule_definition_json,status) VALUES($1,$2,$3,$4::jsonb,'staged') RETURNING ${releaseColumns}`, [bundle.rule_hash, bundle.experiment_id, bundle.base_prediction_version, JSON.stringify(definition)]);
    return mapRelease(inserted.rows[0]);
  });
};

export const activateResearchRuleRelease = async (ruleHash: string) => withTransaction(async (client) => {
  const candidate = await client.query<ReleaseRow>(`${releaseQuery} WHERE rule_hash=$1 FOR UPDATE`, [ruleHash]);
  if (!candidate.rows[0]) throw new Error("没有该暂存研究规则。");
  if (candidate.rows[0].status === "retired") throw new Error("已退役规则不可重新激活。");
  await client.query("UPDATE bazi_research_rule_releases SET status='superseded' WHERE status='active'");
  const active = await client.query<ReleaseRow>("UPDATE bazi_research_rule_releases SET status='active',activated_at=now() WHERE rule_hash=$1 RETURNING rule_hash,experiment_id,base_prediction_version,rule_definition_json,status,activated_at,created_at", [ruleHash]);
  return mapRelease(active.rows[0]);
});

export const rollbackResearchRuleRelease = async () => withTransaction(async (client) => {
  const current = await client.query<ReleaseRow>(`${releaseQuery} WHERE status='active' ORDER BY activated_at DESC LIMIT 1 FOR UPDATE`);
  if (current.rows[0]) await client.query("UPDATE bazi_research_rule_releases SET status='retired' WHERE rule_hash=$1", [current.rows[0].rule_hash]);
  const prior = await client.query<ReleaseRow>(`${releaseQuery} WHERE status='superseded' ORDER BY activated_at DESC NULLS LAST, created_at DESC LIMIT 1 FOR UPDATE`);
  if (!prior.rows[0]) return null;
  const restored = await client.query<ReleaseRow>("UPDATE bazi_research_rule_releases SET status='active',activated_at=now() WHERE rule_hash=$1 RETURNING rule_hash,experiment_id,base_prediction_version,rule_definition_json,status,activated_at,created_at", [prior.rows[0].rule_hash]);
  return mapRelease(restored.rows[0]);
});

export const getActiveResearchRuleRelease = async () => {
  const { query } = await import("@/lib/db/pool");
  const result = await query<ReleaseRow>(`${releaseQuery} WHERE status='active' ORDER BY activated_at DESC LIMIT 1`);
  return result.rows[0] ? mapRelease(result.rows[0]) : null;
};
