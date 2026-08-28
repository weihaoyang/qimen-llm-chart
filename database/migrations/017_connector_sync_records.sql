BEGIN;

-- Internal, auditable connector observations for Silent Observer.  This table
-- stores records produced by a trusted qmdj connector worker; it does not
-- contain OAuth tokens and does not claim that an external provider is live.
CREATE TABLE IF NOT EXISTS account_connector_sync_records (
  id uuid PRIMARY KEY,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  provider varchar(24) NOT NULL CHECK (provider IN ('calendar','email','project_board')),
  idempotency_key varchar(160) NOT NULL,
  connector_id uuid REFERENCES account_connectors(id) ON DELETE SET NULL,
  source_title varchar(200) NOT NULL,
  detected_anomaly text NOT NULL CHECK (char_length(detected_anomaly) <= 12000),
  severity varchar(16) NOT NULL CHECK (severity IN ('CRITICAL','WARNING','INFO')),
  observed_at timestamptz NOT NULL,
  suggested_battlefield_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  dismissed_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_connector_sync_records_subject_idx
  ON account_connector_sync_records(platform_subject_type, platform_subject_id, observed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS account_connector_sync_records_idempotency_idx
  ON account_connector_sync_records(platform_subject_type, platform_subject_id, provider, idempotency_key);
CREATE INDEX IF NOT EXISTS account_connector_sync_records_active_idx
  ON account_connector_sync_records(platform_subject_type, platform_subject_id, observed_at DESC)
  WHERE dismissed_at IS NULL;

COMMIT;
