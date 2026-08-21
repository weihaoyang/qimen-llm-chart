BEGIN;

CREATE TABLE IF NOT EXISTS battle_resource_snapshots (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  snapshot_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(battle_id, version)
);
CREATE INDEX IF NOT EXISTS battle_resources_case_latest_idx ON battle_resource_snapshots(battle_id, version DESC);

COMMIT;
