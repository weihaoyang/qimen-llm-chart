BEGIN;

ALTER TABLE battle_cases ADD COLUMN IF NOT EXISTS scenario_id varchar(120);
ALTER TABLE battle_cases ADD COLUMN IF NOT EXISTS scenario_version integer;
ALTER TABLE battle_cases ADD COLUMN IF NOT EXISTS source_type varchar(32) NOT NULL DEFAULT 'user_created';
ALTER TABLE battle_cases ADD CONSTRAINT battle_cases_source_type_check CHECK (source_type IN ('user_created','official_catalog','legacy_import'));
CREATE INDEX IF NOT EXISTS battle_cases_scenario_idx ON battle_cases(scenario_id, scenario_version) WHERE scenario_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS battle_scenario_snapshots (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  scenario_id varchar(120) NOT NULL,
  scenario_version integer NOT NULL CHECK (scenario_version > 0),
  catalog_version integer NOT NULL CHECK (catalog_version > 0),
  snapshot_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_scenario_snapshots_battle_idx ON battle_scenario_snapshots(battle_id, created_at DESC);

COMMIT;
