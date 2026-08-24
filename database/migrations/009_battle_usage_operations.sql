BEGIN;

CREATE TABLE IF NOT EXISTS battle_usage_operations (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  operation varchar(80) NOT NULL,
  idempotency_key varchar(160) NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  usage_json jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (battle_id, operation, idempotency_key)
);
CREATE INDEX IF NOT EXISTS battle_usage_operations_status_idx
  ON battle_usage_operations (battle_id, status, created_at DESC);

COMMIT;
