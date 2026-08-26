BEGIN;

-- The review API stores its server-controlled idempotency key in diagnosis
-- metadata so existing schemas remain backward compatible. Enforce the same
-- invariant at the database boundary in addition to the transaction lock.
CREATE UNIQUE INDEX IF NOT EXISTS battle_reviews_idempotency_idx
  ON battle_reviews (battle_id, ((diagnosis_json ->> '_idempotencyKey')))
  WHERE diagnosis_json ? '_idempotencyKey';

COMMIT;
