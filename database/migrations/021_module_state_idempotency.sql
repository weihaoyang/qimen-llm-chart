BEGIN;

-- Module snapshots are written by autosave, paid operations and explicit
-- user actions.  Keep retries tied to the append-only audit row so a lost
-- response cannot create a second snapshot, while still allowing historical
-- rows created before this migration (their payload hash remains nullable).
ALTER TABLE battle_module_state_events
  ADD COLUMN IF NOT EXISTS payload_hash varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS battle_module_state_events_idempotency_idx
  ON battle_module_state_events (battle_id, module_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS battle_module_state_events_version_idx
  ON battle_module_state_events (battle_id, module_id, version DESC);

COMMIT;
