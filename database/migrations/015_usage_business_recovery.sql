BEGIN;
ALTER TABLE battle_usage_operations DROP CONSTRAINT IF EXISTS battle_usage_operations_status_check;
ALTER TABLE battle_usage_operations ADD CONSTRAINT battle_usage_operations_status_check CHECK(status IN ('pending','charged','succeeded','failed'));
ALTER TABLE battle_usage_operations ADD COLUMN IF NOT EXISTS payload_hash varchar(64) NOT NULL DEFAULT '';
ALTER TABLE battle_usage_operations ADD COLUMN IF NOT EXISTS reservation_id varchar(160);
COMMIT;
