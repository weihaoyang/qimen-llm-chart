BEGIN;

-- L — `jsonb` columns in the battle domain accept any JSON value, including a
-- scalar.
--
-- `jsonb` is not "an object column": it can hold `"text"`, `3`, `true` or
-- `null`. Nothing in the schema stopped a write of `'[]'::jsonb` into
-- `source_json` or `'"oops"'::jsonb` into `state_json`, and the repositories read
-- those columns back with `as SomeType`, which compiles for every shape. A
-- scalar therefore reached callers typed as an object and failed later as a
-- property access on a string.
--
-- The newer world-pulse tables (025 / 027 / 029) already declare this check at
-- creation time. These are the older battle-domain columns that predate the
-- pattern, so the constraint is added here instead.
--
-- Every one of these columns is written as an object by the product
-- (`JSON.stringify({...})` / `json(value)`); none is written as an array. The
-- world-pulse tables that legitimately store arrays are not in this list.
--
-- All constraints are `NOT VALID`: enforced for every future insert and update,
-- but not yet verified against rows written since 003. Running a validating scan
-- here would make the whole migration fail on the first legacy row, which is a
-- worse outcome than constraining future writes now and reconciling separately
-- (`ALTER TABLE ... VALIDATE CONSTRAINT`).
--
-- NULL passes: `jsonb_typeof(NULL)` is NULL, and a CHECK only rejects FALSE.

-- state_json — module state snapshots.
ALTER TABLE battle_module_states
  ADD CONSTRAINT battle_module_states_state_json_object
  CHECK (jsonb_typeof(state_json) = 'object') NOT VALID;

ALTER TABLE battle_module_state_events
  ADD CONSTRAINT battle_module_state_events_state_json_object
  CHECK (jsonb_typeof(state_json) = 'object') NOT VALID;

-- memory_json — the user-confirmed memory payload.
ALTER TABLE battle_memory_records
  ADD CONSTRAINT battle_memory_records_memory_json_object
  CHECK (jsonb_typeof(memory_json) = 'object') NOT VALID;

ALTER TABLE battle_memory_record_events
  ADD CONSTRAINT battle_memory_record_events_memory_json_object
  CHECK (jsonb_typeof(memory_json) = 'object') NOT VALID;

-- result_json — the committed AI result. NULL is a real state here (a job that
-- has not produced output yet), which is why the constraint must allow it.
ALTER TABLE battle_ai_jobs
  ADD CONSTRAINT battle_ai_jobs_result_json_object
  CHECK (jsonb_typeof(result_json) = 'object') NOT VALID;

ALTER TABLE battle_world_pulse_interventions
  ADD CONSTRAINT battle_world_pulse_interventions_result_json_object
  CHECK (jsonb_typeof(result_json) = 'object') NOT VALID;

-- source_json — provenance metadata on every domain table that carries it.
ALTER TABLE battle_advice
  ADD CONSTRAINT battle_advice_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_attachments
  ADD CONSTRAINT battle_attachments_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_constraints
  ADD CONSTRAINT battle_constraints_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_gravity_lines
  ADD CONSTRAINT battle_gravity_lines_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_junctions
  ADD CONSTRAINT battle_junctions_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_memory_records
  ADD CONSTRAINT battle_memory_records_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_memory_record_events
  ADD CONSTRAINT battle_memory_record_events_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_moves
  ADD CONSTRAINT battle_moves_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_opportunities
  ADD CONSTRAINT battle_opportunities_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_playbook_entries
  ADD CONSTRAINT battle_playbook_entries_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_resource_allocations
  ADD CONSTRAINT battle_resource_allocations_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

ALTER TABLE battle_timeline_nodes
  ADD CONSTRAINT battle_timeline_nodes_source_json_object
  CHECK (jsonb_typeof(source_json) = 'object') NOT VALID;

COMMIT;
