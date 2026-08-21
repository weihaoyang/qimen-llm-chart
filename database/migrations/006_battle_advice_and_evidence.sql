BEGIN;

-- Advisor opinions are never facts or AI conclusions. They require an
-- explicit owner adoption event before becoming a fact or a projected action.
CREATE TABLE IF NOT EXISTS battle_advice (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  author_subject_type varchar(32) NOT NULL,
  author_subject_id varchar(128) NOT NULL,
  target_type varchar(24) NOT NULL DEFAULT 'battle' CHECK (target_type IN ('battle','fact','junction','move','commitment','review')),
  target_id uuid,
  opinion text NOT NULL CHECK (char_length(opinion) BETWEEN 1 AND 12000),
  rationale text NOT NULL DEFAULT '' CHECK (char_length(rationale) <= 12000),
  uncertainty text NOT NULL DEFAULT '' CHECK (char_length(uncertainty) <= 6000),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(16) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','rejected','withdrawn')),
  adopted_as varchar(16) CHECK (adopted_as IN ('fact','action','reference')),
  adopted_record_id uuid,
  adopted_by_type varchar(32),
  adopted_by_id varchar(128),
  adopted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_advice_case_status_idx ON battle_advice(battle_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS battle_advice_author_idx ON battle_advice(author_subject_type,author_subject_id,status);

-- Evidence is metadata-only until an object-storage adapter is configured.
-- storage_key must be an externally controlled HTTPS URL or an adapter key;
-- binary payloads must never be stored in PostgreSQL.
CREATE INDEX IF NOT EXISTS battle_attachments_case_created_idx ON battle_attachments(battle_id,created_at DESC);

COMMIT;
