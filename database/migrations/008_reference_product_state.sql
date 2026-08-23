BEGIN;

CREATE TABLE IF NOT EXISTS battle_module_states (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  module_id varchar(64) NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  state_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, module_id, version)
);
CREATE INDEX IF NOT EXISTS battle_module_states_latest_idx
  ON battle_module_states (battle_id, module_id, version DESC);

CREATE TABLE IF NOT EXISTS battle_ai_jobs (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  kind varchar(32) NOT NULL CHECK (kind IN ('interview','cards','red_team','breakthrough','review')),
  idempotency_key varchar(160) NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('queued','running','succeeded','failed','timed_out')),
  input_snapshot_hash varchar(128) NOT NULL,
  input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_version varchar(64) NOT NULL,
  model_version varchar(128),
  result_json jsonb,
  error_code varchar(64),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE (battle_id, kind, idempotency_key)
);
CREATE INDEX IF NOT EXISTS battle_ai_jobs_status_idx
  ON battle_ai_jobs (battle_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS battle_memory_records (
  id uuid PRIMARY KEY,
  battle_id uuid REFERENCES battle_cases(id) ON DELETE SET NULL,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  title varchar(200) NOT NULL,
  memory_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_status varchar(16) NOT NULL DEFAULT 'active' CHECK (consent_status IN ('active','paused','revoked','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_memory_subject_idx
  ON battle_memory_records (platform_subject_type, platform_subject_id, updated_at DESC);

COMMIT;
