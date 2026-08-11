BEGIN;

CREATE TABLE IF NOT EXISTS agent_cases (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  title varchar(120) NOT NULL,
  question text NOT NULL CHECK (char_length(question) <= 2000),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','decided','archived')),
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS agent_cases_owner_updated_idx ON agent_cases(platform_subject_type,platform_subject_id,updated_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS agent_interview_turns (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES agent_cases(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  role varchar(16) NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (char_length(content) <= 12000),
  phase varchar(24) NOT NULL DEFAULT 'issue',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id,sequence_no)
);

CREATE TABLE IF NOT EXISTS agent_evidence_snapshots (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES agent_cases(id) ON DELETE CASCADE,
  mode varchar(24) NOT NULL,
  source_text text NOT NULL CHECK (octet_length(source_text) <= 250000),
  structured_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_evidence_case_created_idx ON agent_evidence_snapshots(case_id,created_at DESC);

CREATE TABLE IF NOT EXISTS agent_decision_tree_versions (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES agent_cases(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  root_json jsonb NOT NULL,
  generated_from_turn_id uuid REFERENCES agent_interview_turns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id,version)
);

CREATE TABLE IF NOT EXISTS agent_decision_branches (
  id uuid PRIMARY KEY,
  tree_version_id uuid NOT NULL REFERENCES agent_decision_tree_versions(id) ON DELETE CASCADE,
  branch_key varchar(64) NOT NULL,
  title varchar(160) NOT NULL,
  assumptions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_action text NOT NULL DEFAULT '',
  cost text NOT NULL DEFAULT '',
  risks_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_date timestamptz,
  stop_condition text NOT NULL DEFAULT '',
  selected_at timestamptz,
  UNIQUE(tree_version_id,branch_key)
);

CREATE TABLE IF NOT EXISTS agent_reviews (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES agent_cases(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES agent_decision_branches(id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (char_length(outcome) <= 6000),
  facts text NOT NULL DEFAULT '',
  what_changed text NOT NULL DEFAULT '',
  next_adjustment text NOT NULL DEFAULT '',
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_reviews_case_date_idx ON agent_reviews(case_id,reviewed_at DESC);

COMMIT;
