BEGIN;

-- P1/P2 extensions. All records remain owned through battle_cases or the
-- platform subject; public/anonymized material is opt-in and never implicit.
CREATE TABLE IF NOT EXISTS battle_attachments (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  target_type varchar(24) NOT NULL CHECK (target_type IN ('battle','fact','node','move','action','review')),
  target_id uuid,
  filename varchar(255) NOT NULL,
  media_type varchar(128) NOT NULL DEFAULT 'application/octet-stream',
  storage_key varchar(512) NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  checksum varchar(128),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_attachments_target_idx ON battle_attachments(battle_id,target_type,target_id);

CREATE TABLE IF NOT EXISTS battle_collaborators (
  id uuid PRIMARY KEY,
  battle_id uuid NOT NULL REFERENCES battle_cases(id) ON DELETE CASCADE,
  subject_type varchar(32) NOT NULL,
  subject_id varchar(128) NOT NULL,
  role varchar(24) NOT NULL CHECK (role IN ('viewer','contributor','advisor','owner')),
  status varchar(16) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','revoked')),
  permissions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_by_type varchar(32) NOT NULL,
  invited_by_id varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(battle_id,subject_type,subject_id)
);
CREATE INDEX IF NOT EXISTS battle_collaborators_subject_idx ON battle_collaborators(subject_type,subject_id,status);

CREATE TABLE IF NOT EXISTS battle_resource_allocations (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  battle_id uuid REFERENCES battle_cases(id) ON DELETE CASCADE,
  label varchar(200) NOT NULL,
  resource_kind varchar(16) NOT NULL CHECK (resource_kind IN ('cash','hours','energy','credit')),
  amount numeric NOT NULL CHECK (amount >= 0),
  unit varchar(32) NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status varchar(16) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','committed','released','cancelled')),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_resource_allocations_owner_window_idx ON battle_resource_allocations(platform_subject_type,platform_subject_id,resource_kind,starts_at,ends_at,status);

CREATE TABLE IF NOT EXISTS battle_playbook_entries (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  battle_id uuid REFERENCES battle_cases(id) ON DELETE SET NULL,
  visibility varchar(16) NOT NULL CHECK (visibility IN ('private','anonymous_pool')),
  category varchar(32) NOT NULL,
  pattern text NOT NULL CHECK (char_length(pattern) <= 6000),
  adjustment text NOT NULL DEFAULT '' CHECK (char_length(adjustment) <= 6000),
  evidence_count integer NOT NULL DEFAULT 1 CHECK (evidence_count >= 1),
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_playbook_visibility_idx ON battle_playbook_entries(visibility,category,created_at DESC);

CREATE TABLE IF NOT EXISTS battle_calibration_events (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  battle_id uuid REFERENCES battle_cases(id) ON DELETE SET NULL,
  commitment_id uuid REFERENCES battle_commitments(id) ON DELETE SET NULL,
  dimension varchar(32) NOT NULL CHECK (dimension IN ('information','reasoning','resource','time','risk','execution','relationship')),
  expected numeric,
  actual numeric,
  error numeric,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_calibration_owner_dimension_idx ON battle_calibration_events(platform_subject_type,platform_subject_id,dimension,created_at DESC);

COMMIT;
