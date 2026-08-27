BEGIN;

ALTER TABLE battle_ai_jobs
  ADD COLUMN IF NOT EXISTS reservation_id varchar(160),
  ADD COLUMN IF NOT EXISTS usage_json jsonb,
  ADD COLUMN IF NOT EXISTS payload_hash varchar(128);

ALTER TABLE battle_ai_jobs
  DROP CONSTRAINT IF EXISTS battle_ai_jobs_status_check;
ALTER TABLE battle_ai_jobs
  ADD CONSTRAINT battle_ai_jobs_status_check
  CHECK (status IN ('queued','running','committing','charged','succeeded','failed','timed_out'));

COMMIT;
