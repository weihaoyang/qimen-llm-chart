BEGIN;

-- A DNA record is a user-confirmed reflection, not an arbitrary module blob.
-- Keep one durable row per battle/record so account-wide profile reads can be
-- indexed and an interrupted review retry cannot create a second record.
CREATE TABLE IF NOT EXISTS battle_decision_dna_records (
  -- The client creates a deterministic, human-readable id (for example
  -- `dna-…`) so the same review can be safely retried after a lost response.
  id varchar(160) PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  battlefield_title varchar(240) NOT NULL,
  decided_at timestamptz NOT NULL,
  selected_strategy text NOT NULL DEFAULT '' CHECK (char_length(selected_strategy) <= 12000),
  survival_outcome varchar(32) NOT NULL CHECK (survival_outcome IN ('SURVIVED','PARTIAL_SUCCESS','LESSON_LEARNED')),
  fatal_question text NOT NULL DEFAULT '' CHECK (char_length(fatal_question) <= 12000),
  user_reflection text NOT NULL DEFAULT '' CHECK (char_length(user_reflection) <= 12000),
  extracted_dna_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_review_id uuid REFERENCES battle_reviews(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, id)
);

CREATE INDEX IF NOT EXISTS battle_decision_dna_subject_idx
  ON battle_decision_dna_records(platform_subject_type, platform_subject_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS battle_decision_dna_battle_idx
  ON battle_decision_dna_records(battle_id, decided_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS battle_decision_dna_review_idx
  ON battle_decision_dna_records(source_review_id)
  WHERE source_review_id IS NOT NULL;

COMMIT;
