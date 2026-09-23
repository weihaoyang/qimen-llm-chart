BEGIN;

-- `battle_reviews` is read as `WHERE battle_id=$1 ORDER BY reviewed_at DESC`
-- (extended-repository.listReviews) and is reached by `ON DELETE CASCADE` from
-- battle_cases. The only index on this table is the partial expression index
-- from 011, which covers a different predicate entirely, so both the read and
-- the cascade were sequential scans.
CREATE INDEX IF NOT EXISTS battle_reviews_battle_idx
  ON battle_reviews (battle_id, reviewed_at DESC);

-- `saveMemory` resolves a retry by matching the caller-supplied
-- `source_json->>'recordId'` scoped to one account. Without a supporting index
-- that lookup was a sequential scan on every memory write.
CREATE INDEX IF NOT EXISTS battle_memory_records_source_record_idx
  ON battle_memory_records (platform_subject_type, platform_subject_id, (source_json ->> 'type'), (source_json ->> 'recordId'));

COMMIT;
