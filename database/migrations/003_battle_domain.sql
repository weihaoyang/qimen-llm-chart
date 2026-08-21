BEGIN;

-- Canonical product domain for 胜天半子. The old agent_* tables remain readable
-- for existing paid workspaces; new product state is written here only.
CREATE TABLE IF NOT EXISTS battle_cases (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  legacy_agent_case_id uuid REFERENCES agent_cases(id) ON DELETE SET NULL,
  title varchar(160) NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  objective text NOT NULL CHECK (char_length(objective) <= 6000),
  minimum_outcome text NOT NULL DEFAULT '' CHECK (char_length(minimum_outcome) <= 6000),
  ideal_outcome text NOT NULL DEFAULT '' CHECK (char_length(ideal_outcome) <= 6000),
  opponent_summary text NOT NULL DEFAULT '' CHECK (char_length(opponent_summary) <= 6000),
  status varchar(24) NOT NULL DEFAULT 'intake' CHECK (status IN ('intake','active','committed','monitoring','review','closed','archived')),
  hard_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS battle_cases_owner_updated_idx ON battle_cases(platform_subject_type, platform_subject_id, updated_at DESC) WHERE status <> 'archived';

CREATE TABLE IF NOT EXISTS battle_facts (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  kind varchar(16) NOT NULL CHECK (kind IN ('fact','assumption','unknown','goal','emotion')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  source varchar(32) NOT NULL DEFAULT 'user' CHECK (source IN ('user','attachment','system','ai')),
  confidence smallint NOT NULL DEFAULT 100 CHECK (confidence BETWEEN 0 AND 100),
  occurred_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_facts_case_created_idx ON battle_facts(battle_id, created_at DESC);

CREATE TABLE IF NOT EXISTS battle_constraints (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  kind varchar(24) NOT NULL CHECK (kind IN ('cash','time','energy','legal','contract','health','relationship','reputation','privacy','other')),
  label varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 6000),
  hard boolean NOT NULL DEFAULT true,
  severity smallint NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  threshold_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battle_inventory_items (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  category varchar(24) NOT NULL CHECK (category IN ('cash','time','skill','asset','information','relationship','credential','channel','other')),
  label varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 6000),
  quantity numeric,
  unit varchar(32),
  availability varchar(24) NOT NULL DEFAULT 'available' CHECK (availability IN ('available','limited','blocked','expired')),
  expires_at timestamptz,
  cost_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_inventory_case_category_idx ON battle_inventory_items(battle_id, category, availability);

CREATE TABLE IF NOT EXISTS battle_gravity_lines (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  summary text NOT NULL CHECK (char_length(summary) <= 12000),
  assumptions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_outcome text NOT NULL DEFAULT '' CHECK (char_length(expected_outcome) <= 6000),
  resource_cost_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reasons_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence smallint NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(battle_id, version)
);

CREATE TABLE IF NOT EXISTS battle_timeline_nodes (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  kind varchar(24) NOT NULL CHECK (kind IN ('fact','decision','resource','relationship','rule_change','opportunity','risk','junction','action','result')),
  title varchar(200) NOT NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 12000),
  starts_at timestamptz,
  ends_at timestamptz,
  truth_status varchar(16) NOT NULL DEFAULT 'observed' CHECK (truth_status IN ('observed','assumed','projected','verified','rejected')),
  importance smallint NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_timeline_case_time_idx ON battle_timeline_nodes(battle_id, starts_at NULLS LAST, created_at);

CREATE TABLE IF NOT EXISTS battle_timeline_edges (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES battle_timeline_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES battle_timeline_nodes(id) ON DELETE CASCADE,
  relation varchar(24) NOT NULL CHECK (relation IN ('causes','accelerates','blocks','depends_on','conflicts','repeats','verifies','inherits','transmits','counterfactual')),
  confidence smallint NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_node_id <> to_node_id)
);
CREATE INDEX IF NOT EXISTS battle_timeline_edges_case_idx ON battle_timeline_edges(battle_id, from_node_id, to_node_id);

CREATE TABLE IF NOT EXISTS battle_opportunities (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 12000),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  opens_at timestamptz,
  best_action_at timestamptz,
  closes_at timestamptz,
  decay_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','watching','acted','missed','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_opportunities_window_idx ON battle_opportunities(battle_id, closes_at, status);

CREATE TABLE IF NOT EXISTS battle_junctions (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 12000),
  window_start timestamptz,
  window_end timestamptz,
  half_life_at timestamptz,
  core_variable text NOT NULL DEFAULT '' CHECK (char_length(core_variable) <= 6000),
  default_consequence text NOT NULL DEFAULT '' CHECK (char_length(default_consequence) <= 6000),
  urgency smallint NOT NULL DEFAULT 3 CHECK (urgency BETWEEN 1 AND 5),
  leverage smallint NOT NULL DEFAULT 3 CHECK (leverage BETWEEN 1 AND 5),
  irreversibility smallint NOT NULL DEFAULT 3 CHECK (irreversibility BETWEEN 1 AND 5),
  status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','selected','expired','resolved')),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_junctions_active_idx ON battle_junctions(battle_id, status, half_life_at);

CREATE TABLE IF NOT EXISTS battle_moves (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  junction_id uuid REFERENCES battle_junctions(id) ON DELETE SET NULL,
  version integer NOT NULL CHECK (version > 0),
  kind varchar(16) NOT NULL CHECK (kind IN ('strong_attack','probe','hedge')),
  title varchar(200) NOT NULL,
  key_variable text NOT NULL DEFAULT '' CHECK (char_length(key_variable) <= 6000),
  rationale text NOT NULL DEFAULT '' CHECK (char_length(rationale) <= 12000),
  action_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  upside_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_cost_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  stop_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  state varchar(16) NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','selected','executing','verified','stopped','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(battle_id, version, kind)
);
CREATE INDEX IF NOT EXISTS battle_moves_junction_state_idx ON battle_moves(junction_id, state);

CREATE TABLE IF NOT EXISTS battle_move_actions (
  id uuid PRIMARY KEY,
  move_id uuid NOT NULL REFERENCES battle_moves(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  title varchar(240) NOT NULL,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 6000),
  owner varchar(160) NOT NULL DEFAULT '',
  due_at timestamptz,
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','waiting','done','failed','skipped')),
  success_signal text NOT NULL DEFAULT '',
  failure_signal text NOT NULL DEFAULT '',
  actual_cost_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  UNIQUE(move_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS battle_breakers (
  id uuid PRIMARY KEY,
  move_id uuid NOT NULL REFERENCES battle_moves(id) ON DELETE CASCADE,
  kind varchar(24) NOT NULL CHECK (kind IN ('cash','time','relationship','energy','legal','assumption','opportunity')),
  label varchar(200) NOT NULL,
  threshold_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_on_trigger text NOT NULL DEFAULT '' CHECK (char_length(action_on_trigger) <= 6000),
  enabled boolean NOT NULL DEFAULT true,
  triggered_at timestamptz
);

CREATE TABLE IF NOT EXISTS battle_commitments (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  move_id uuid NOT NULL REFERENCES battle_moves(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  snapshot_json jsonb NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','verified','stopped','superseded')),
  UNIQUE(battle_id, version)
);

CREATE TABLE IF NOT EXISTS battle_reviews (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  commitment_id uuid REFERENCES battle_commitments(id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (char_length(outcome) <= 12000),
  facts text NOT NULL DEFAULT '' CHECK (char_length(facts) <= 12000),
  what_changed text NOT NULL DEFAULT '' CHECK (char_length(what_changed) <= 12000),
  diagnosis_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_adjustment text NOT NULL DEFAULT '' CHECK (char_length(next_adjustment) <= 12000),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battle_strategy_profiles (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform_subject_type, platform_subject_id, version)
);
CREATE INDEX IF NOT EXISTS battle_strategy_profile_owner_idx ON battle_strategy_profiles(platform_subject_type, platform_subject_id, version DESC);

COMMIT;
