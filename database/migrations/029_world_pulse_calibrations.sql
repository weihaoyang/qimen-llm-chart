BEGIN;

-- Explicit CCTV calibration is a reusable battle artifact.  Browser storage may
-- hydrate the map quickly, but the durable source is scoped to the user's battle
-- and can be restored on another device.
CREATE TABLE IF NOT EXISTS battle_world_pulse_calibrations (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  camera_id varchar(160) NOT NULL CHECK (camera_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,159}$'),
  version integer NOT NULL CHECK (version > 0),
  calibration_json jsonb NOT NULL CHECK (jsonb_typeof(calibration_json) = 'object'),
  actor_subject_type varchar(32) NOT NULL,
  actor_subject_id varchar(128) NOT NULL,
  idempotency_key varchar(160) NOT NULL,
  content_hash varchar(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, camera_id, version),
  UNIQUE (battle_id, camera_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS battle_world_pulse_calibrations_latest_idx
  ON battle_world_pulse_calibrations (battle_id, camera_id, version DESC);

COMMIT;
