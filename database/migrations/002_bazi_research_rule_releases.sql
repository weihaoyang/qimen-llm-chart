BEGIN;

CREATE TABLE IF NOT EXISTS bazi_research_rule_releases (
  rule_hash varchar(64) PRIMARY KEY,
  experiment_id varchar(64) NOT NULL,
  base_prediction_version varchar(96) NOT NULL,
  rule_definition_json jsonb NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','active','superseded','retired')),
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bazi_research_rule_releases_status_idx ON bazi_research_rule_releases(status, activated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS bazi_research_rule_releases_one_active_idx ON bazi_research_rule_releases((status)) WHERE status='active';

COMMIT;
