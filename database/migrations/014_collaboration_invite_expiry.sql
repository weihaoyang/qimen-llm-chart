BEGIN;
ALTER TABLE battle_collaborators ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE battle_collaborators SET expires_at=COALESCE(expires_at,created_at+interval '7 days') WHERE status='invited';
CREATE INDEX IF NOT EXISTS battle_collaborators_pending_expiry_idx ON battle_collaborators(subject_type,subject_id,expires_at) WHERE status='invited';
COMMIT;
