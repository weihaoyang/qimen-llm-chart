BEGIN;

-- A World Pulse observation is a user-confirmed snapshot from the embedded
-- God's Eye View map.  It is deliberately separate from catalog-backed
-- interventions: live/public-source signals have no official catalog version
-- and must never be silently promoted to an immutable scenario event.
CREATE TABLE IF NOT EXISTS battle_world_pulse_observations (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  source varchar(64) NOT NULL CHECK (char_length(source) BETWEEN 1 AND 64),
  observation_key varchar(160) NOT NULL CHECK (char_length(observation_key) BETWEEN 1 AND 160),
  observation_type varchar(64) NOT NULL CHECK (char_length(observation_type) BETWEEN 1 AND 64),
  title varchar(240) NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  observed_at timestamptz NOT NULL,
  location_json jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(location_json) = 'object'),
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(snapshot_json) = 'object'),
  source_url text,
  actor_subject_type varchar(32) NOT NULL,
  actor_subject_id varchar(128) NOT NULL,
  idempotency_key varchar(160) NOT NULL,
  payload_hash varchar(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, source, observation_key, idempotency_key)
);

CREATE INDEX IF NOT EXISTS battle_world_pulse_observations_battle_idx
  ON battle_world_pulse_observations (battle_id, observed_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS battle_world_pulse_observations_actor_idx
  ON battle_world_pulse_observations (actor_subject_type, actor_subject_id, created_at DESC);

COMMIT;
