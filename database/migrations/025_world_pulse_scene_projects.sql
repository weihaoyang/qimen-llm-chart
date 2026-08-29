BEGIN;

-- God's Eye View scene-director projects are durable battle artifacts, not UI
-- preferences. Keep an append-only version history so a scene can be restored
-- across devices and concurrent editors cannot silently overwrite each other.
CREATE TABLE IF NOT EXISTS battle_world_pulse_projects (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  project_key varchar(64) NOT NULL DEFAULT 'default'
    CHECK (project_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  version integer NOT NULL CHECK (version > 0),
  schema_version integer NOT NULL CHECK (schema_version > 0),
  project_json jsonb NOT NULL CHECK (jsonb_typeof(project_json) = 'object'),
  actor_subject_type varchar(32) NOT NULL,
  actor_subject_id varchar(128) NOT NULL,
  idempotency_key varchar(160) NOT NULL,
  content_hash varchar(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, project_key, version),
  UNIQUE (battle_id, project_key, idempotency_key)
);

CREATE INDEX IF NOT EXISTS battle_world_pulse_projects_latest_idx
  ON battle_world_pulse_projects (battle_id, project_key, version DESC);
CREATE INDEX IF NOT EXISTS battle_world_pulse_projects_actor_idx
  ON battle_world_pulse_projects (actor_subject_type, actor_subject_id, created_at DESC);

COMMIT;
