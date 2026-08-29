BEGIN;

-- Durable user actions against the official World Pulse catalog.  The catalog
-- remains immutable; this table stores only the user's explicit intervention
-- intent and the server-side result for a specific battle.
CREATE TABLE IF NOT EXISTS battle_world_pulse_interventions (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  event_id varchar(160) NOT NULL,
  event_version integer NOT NULL CHECK (event_version > 0),
  actor_subject_type varchar(32) NOT NULL,
  actor_subject_id varchar(128) NOT NULL,
  action varchar(120) NOT NULL CHECK (char_length(action) BETWEEN 1 AND 120),
  status varchar(16) NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','reversed')),
  request_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  usage_operation_id uuid REFERENCES battle_usage_operations(id) ON DELETE SET NULL,
  idempotency_key varchar(160) NOT NULL,
  payload_hash varchar(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, event_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS battle_world_pulse_interventions_battle_idx
  ON battle_world_pulse_interventions (battle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS battle_world_pulse_interventions_actor_idx
  ON battle_world_pulse_interventions (actor_subject_type, actor_subject_id, created_at DESC);

COMMIT;
