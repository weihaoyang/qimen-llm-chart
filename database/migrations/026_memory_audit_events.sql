BEGIN;

-- AI 共生体记忆属于用户明确授权的数据。保留追加式事件日志，
-- 让编辑、暂停、撤销和删除都可追溯，而不是只覆盖当前快照。
CREATE TABLE IF NOT EXISTS battle_memory_record_events (
  id uuid PRIMARY KEY,
  memory_id uuid NOT NULL,
  platform_subject_type varchar(32) NOT NULL,
  platform_subject_id varchar(128) NOT NULL,
  event_type varchar(16) NOT NULL CHECK (event_type IN ('created','updated','paused','resumed','revoked','deleted')),
  title varchar(200) NOT NULL,
  memory_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_status varchar(16) NOT NULL CHECK (consent_status IN ('active','paused','revoked','deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS battle_memory_record_events_memory_idx
  ON battle_memory_record_events(memory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS battle_memory_record_events_subject_idx
  ON battle_memory_record_events(platform_subject_type, platform_subject_id, created_at DESC);

COMMIT;
