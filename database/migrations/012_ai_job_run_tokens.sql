BEGIN;
ALTER TABLE battle_ai_jobs ADD COLUMN IF NOT EXISTS run_token uuid;
UPDATE battle_ai_jobs SET run_token=gen_random_uuid() WHERE run_token IS NULL;
ALTER TABLE battle_ai_jobs ALTER COLUMN run_token SET NOT NULL;
CREATE INDEX IF NOT EXISTS battle_ai_jobs_run_token_idx ON battle_ai_jobs (id, run_token);
COMMIT;
