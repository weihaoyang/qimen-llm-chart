BEGIN;

ALTER TABLE battle_ai_jobs
  DROP CONSTRAINT IF EXISTS battle_ai_jobs_status_check;
ALTER TABLE battle_ai_jobs
  ADD CONSTRAINT battle_ai_jobs_status_check
  CHECK (status IN ('queued','running','committing','succeeded','failed','timed_out'));

CREATE UNIQUE INDEX IF NOT EXISTS battle_advice_ai_job_unique_idx
  ON battle_advice (battle_id, (source_json->>'jobId'))
  WHERE source_json ? 'jobId';

COMMIT;
