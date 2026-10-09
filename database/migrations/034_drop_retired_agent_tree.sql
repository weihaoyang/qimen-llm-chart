BEGIN;

-- Drop the retired 胜天半子 decision-tree / review tables.
--
-- They were only ever read and written by the removed agent-case tree and
-- review endpoints (the "关键决策树" surface). The agent workspace this product
-- still uses persists cases, turns and evidence in `agent_cases`,
-- `agent_interview_turns` and `agent_evidence_snapshots`, all of which stay.

DROP TABLE IF EXISTS
  agent_decision_branches,
  agent_decision_tree_versions,
  agent_reviews
CASCADE;

COMMIT;
