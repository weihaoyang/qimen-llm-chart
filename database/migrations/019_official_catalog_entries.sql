BEGIN;

-- Versioned, server-owned source of truth for all official content rendered by
-- the reference product.  User progress never belongs here: cloning a
-- scenario still creates an immutable battle_scenario_snapshots row plus the
-- user's battle-domain records.
CREATE TABLE IF NOT EXISTS official_catalog_entries (
  catalog_type varchar(40) NOT NULL,
  entry_id varchar(160) NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  payload_json jsonb NOT NULL,
  content_hash varchar(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  status varchar(16) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','retired')),
  published_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (catalog_type, entry_id, version),
  CHECK ((status = 'retired') = (retired_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS official_catalog_entries_listing_idx
  ON official_catalog_entries (catalog_type, status, version DESC, entry_id);

-- There may be many historical versions, but only one published version of a
-- catalog entry can be presented to users at a time.
CREATE UNIQUE INDEX IF NOT EXISTS official_catalog_entries_one_published_idx
  ON official_catalog_entries (catalog_type, entry_id)
  WHERE status = 'published';

COMMIT;
