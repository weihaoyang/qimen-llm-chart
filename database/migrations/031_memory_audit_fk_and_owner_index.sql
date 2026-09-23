BEGIN;

-- M — every audit row must point at a memory record that really exists.
--
-- Deletion in this domain is soft: `saveMemory` writes `consent_status='deleted'`
-- and the repository has no hard `DELETE FROM battle_memory_records` anywhere.
-- That is why this uses RESTRICT rather than CASCADE. The whole point of
-- `battle_memory_record_events` is that a revocation or deletion stays
-- traceable, so a cascade would erase the trail at exactly the moment it
-- matters. RESTRICT also turns a future hard delete into an explicit decision
-- instead of a silent orphan.
--
-- Deliberately `NOT VALID`, i.e. enforced for every new row from now on but not
-- yet checked against rows written since 026. 028 could validate immediately
-- because its references are created and deleted inside one transaction; this
-- table has been live for longer and its events may reference records that were
-- removed by hand or by a test fixture. Validating is a separate, auditable step
-- (`ALTER TABLE ... VALIDATE CONSTRAINT`) once those rows have been reconciled —
-- running it here would make the whole migration fail on the first orphan.
ALTER TABLE battle_memory_record_events
  ADD CONSTRAINT battle_memory_record_events_memory_fkey
  FOREIGN KEY (memory_id) REFERENCES battle_memory_records(id) ON DELETE RESTRICT NOT VALID;

-- N — `battle_cases_owner_updated_idx` was created as a partial index
-- (`WHERE status <> 'archived'`), but `listBattles` deliberately carries no
-- status predicate: archived battles stay visible so the owner can restore them
-- from War Rooms. The partial predicate therefore excludes the index from that
-- query entirely, and the owner's list fell back to a sequential scan.
--
-- Replaced with the full index rather than adding a second partial one, so both
-- the filtered and unfiltered reads share a single structure instead of relying
-- on the planner combining two partial indexes.
DROP INDEX IF EXISTS battle_cases_owner_updated_idx;
CREATE INDEX IF NOT EXISTS battle_cases_owner_updated_idx
  ON battle_cases(platform_subject_type, platform_subject_id, updated_at DESC);

COMMIT;
