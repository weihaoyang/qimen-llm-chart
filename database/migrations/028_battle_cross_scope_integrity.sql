BEGIN;

-- Keep every graph/strategy reference inside its owning battle.  The original
-- UUID foreign keys only proved that a referenced row existed; they did not
-- prove that it belonged to the same battle.  A malformed client payload (or
-- a stale tab) could therefore attach a node, junction, move, or commitment
-- from another user's battle.  Composite foreign keys close that isolation
-- gap while retaining the existing single-column FKs for their delete
-- semantics (SET NULL/CASCADE).

CREATE UNIQUE INDEX IF NOT EXISTS battle_junctions_id_battle_uidx
  ON battle_junctions(id, battle_id);
CREATE UNIQUE INDEX IF NOT EXISTS battle_moves_id_battle_uidx
  ON battle_moves(id, battle_id);
CREATE UNIQUE INDEX IF NOT EXISTS battle_timeline_nodes_id_battle_uidx
  ON battle_timeline_nodes(id, battle_id);
CREATE UNIQUE INDEX IF NOT EXISTS battle_commitments_id_battle_uidx
  ON battle_commitments(id, battle_id);

ALTER TABLE battle_timeline_edges
  ADD CONSTRAINT battle_timeline_edges_from_scope_fkey
  FOREIGN KEY (from_node_id, battle_id)
  REFERENCES battle_timeline_nodes(id, battle_id)
  NOT VALID;
ALTER TABLE battle_timeline_edges
  VALIDATE CONSTRAINT battle_timeline_edges_from_scope_fkey;

ALTER TABLE battle_timeline_edges
  ADD CONSTRAINT battle_timeline_edges_to_scope_fkey
  FOREIGN KEY (to_node_id, battle_id)
  REFERENCES battle_timeline_nodes(id, battle_id)
  NOT VALID;
ALTER TABLE battle_timeline_edges
  VALIDATE CONSTRAINT battle_timeline_edges_to_scope_fkey;

ALTER TABLE battle_moves
  ADD CONSTRAINT battle_moves_junction_scope_fkey
  FOREIGN KEY (junction_id, battle_id)
  REFERENCES battle_junctions(id, battle_id)
  NOT VALID;
ALTER TABLE battle_moves
  VALIDATE CONSTRAINT battle_moves_junction_scope_fkey;

ALTER TABLE battle_commitments
  ADD CONSTRAINT battle_commitments_move_scope_fkey
  FOREIGN KEY (move_id, battle_id)
  REFERENCES battle_moves(id, battle_id)
  NOT VALID;
ALTER TABLE battle_commitments
  VALIDATE CONSTRAINT battle_commitments_move_scope_fkey;

ALTER TABLE battle_reviews
  ADD CONSTRAINT battle_reviews_commitment_scope_fkey
  FOREIGN KEY (commitment_id, battle_id)
  REFERENCES battle_commitments(id, battle_id)
  NOT VALID;
ALTER TABLE battle_reviews
  VALIDATE CONSTRAINT battle_reviews_commitment_scope_fkey;

COMMIT;
