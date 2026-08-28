BEGIN;

-- Advisor submissions are user actions and can be retried after a lost
-- response. Keep a caller-supplied key scoped to the author and battle so a
-- retry returns the same opinion instead of creating a duplicate record.
ALTER TABLE battle_advice ADD COLUMN IF NOT EXISTS idempotency_key varchar(160);
CREATE UNIQUE INDEX IF NOT EXISTS battle_advice_idempotency_idx
  ON battle_advice (battle_id, author_subject_type, author_subject_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
