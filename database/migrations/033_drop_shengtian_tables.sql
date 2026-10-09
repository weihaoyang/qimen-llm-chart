BEGIN;

-- Drop the 胜天半子 (Battle Domain / ecosystem / connector) tables.
--
-- That product was split into its own repository and its code was removed from
-- this one, so these tables have no reader or writer left. The schema history
-- (001–032) is kept intact so an existing database still migrates cleanly; this
-- migration is the explicit step that removes the storage.
--
-- `IF EXISTS` makes it a no-op on a database that never had them. `CASCADE`
-- drops the intra-domain foreign keys that pointed at these tables; no table
-- this product still owns references any of them (checked against the
-- migrations), so nothing qmdj uses is touched.

DROP TABLE IF EXISTS
  battle_move_actions,
  battle_moves,
  battle_breakers,
  battle_commitments,
  battle_interview_turns,
  battle_decision_dna_records,
  battle_memory_record_events,
  battle_memory_records,
  battle_ai_jobs,
  battle_module_state_events,
  battle_module_states,
  battle_usage_operations,
  battle_advice,
  battle_attachments,
  battle_collaborators,
  battle_resource_allocations,
  battle_playbook_entries,
  battle_calibration_events,
  battle_resource_snapshots,
  battle_scenario_snapshots,
  battle_world_pulse_interventions,
  battle_world_pulse_projects,
  battle_world_pulse_observations,
  battle_world_pulse_calibrations,
  battle_gravity_lines,
  battle_timeline_edges,
  battle_timeline_nodes,
  battle_opportunities,
  battle_junctions,
  battle_facts,
  battle_constraints,
  battle_inventory_items,
  battle_reviews,
  battle_strategy_profiles,
  battle_cases,
  official_catalog_entries,
  account_connector_sync_records,
  account_connectors
CASCADE;

COMMIT;
