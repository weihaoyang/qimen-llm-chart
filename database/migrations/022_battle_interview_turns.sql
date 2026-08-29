BEGIN;

-- Interview transcript is a first-class battle artifact.  The battlefield
-- module snapshot still carries UI-only flags, but the canonical conversation
-- lives here so it can be restored independently, audited, and paginated.
CREATE TABLE IF NOT EXISTS battle_interview_turns (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  actor_subject_type varchar(32) NOT NULL,
  actor_subject_id varchar(128) NOT NULL,
  role varchar(16) NOT NULL CHECK (role IN ('user','assistant')),
  client_message_id varchar(160),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  structured_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_status varchar(16) NOT NULL DEFAULT 'none'
    CHECK (extraction_status IN ('none','pending','accepted')),
  idempotency_key varchar(200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, sequence_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS battle_interview_turns_idempotency_idx
  ON battle_interview_turns (battle_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS battle_interview_turns_client_message_idx
  ON battle_interview_turns (battle_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS battle_interview_turns_case_created_idx
  ON battle_interview_turns (battle_id, sequence_no);

COMMIT;
