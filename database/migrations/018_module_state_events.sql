BEGIN;

-- Append-only audit trail for battle-scoped module snapshots.  The latest
-- state remains in battle_module_states; this table records who changed it
-- and which version was written so refresh/recovery and compliance reviews
-- do not depend on browser state.
CREATE TABLE IF NOT EXISTS battle_module_state_events (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  module_id varchar(64) NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  actor_subject_type varchar(32) NOT NULL,
  actor_subject_id varchar(128) NOT NULL,
  event_type varchar(32) NOT NULL DEFAULT 'updated'
    CHECK (event_type IN ('created','updated','reward_claimed','consent_changed')),
  state_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, module_id, version)
);

CREATE INDEX IF NOT EXISTS battle_module_state_events_case_idx
  ON battle_module_state_events (battle_id, module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS battle_module_state_events_actor_idx
  ON battle_module_state_events (actor_subject_type, actor_subject_id, created_at DESC);

COMMIT;
