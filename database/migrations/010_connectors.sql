BEGIN;

-- Internal connector consent/status only. This does not imply an external OAuth
-- grant or contain provider tokens; a real provider integration can extend it.
CREATE TABLE IF NOT EXISTS account_connectors (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  provider varchar(24) NOT NULL CHECK (provider IN ('calendar','email','project_board')),
  status varchar(24) NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected','pending_authorization','authorized','revoked')),
  scopes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_sync_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform_subject_type, platform_subject_id, provider)
);
CREATE INDEX IF NOT EXISTS account_connectors_subject_idx ON account_connectors(platform_subject_type, platform_subject_id);

COMMIT;
