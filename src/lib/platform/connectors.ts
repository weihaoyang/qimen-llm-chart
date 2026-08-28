import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/pool";
import type { AccountSubject } from "@/lib/agent/account-subject";

export const CONNECTOR_PROVIDERS = ["calendar", "email", "project_board"] as const;
export type ConnectorProvider = typeof CONNECTOR_PROVIDERS[number];
export type ConnectorStatus = "not_connected" | "pending_authorization" | "authorized" | "revoked";
const owner = (subject: AccountSubject) => [subject.subjectType, subject.subjectId];
const parseArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
type ConnectorRow = { id: string; provider: string; status: string; scopes_json: unknown; last_sync_at: Date | string | null; metadata_json: unknown; updated_at: Date | string };
const map = (row: ConnectorRow) => ({ id: row.id, provider: row.provider as ConnectorProvider, status: row.status as ConnectorStatus, scopes: parseArray(row.scopes_json), lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null, metadata: row.metadata_json && typeof row.metadata_json === "object" ? row.metadata_json : {}, updatedAt: new Date(row.updated_at).toISOString() });

export async function listConnectors(subject: AccountSubject) {
  const result = await query<ConnectorRow>(`SELECT id,provider,status,scopes_json,last_sync_at,metadata_json,updated_at FROM account_connectors WHERE platform_subject_type=$1 AND platform_subject_id=$2 ORDER BY provider`, owner(subject));
  const byProvider = new Map(result.rows.map(map).map((item) => [item.provider, item]));
  return CONNECTOR_PROVIDERS.map((provider) => byProvider.get(provider) ?? ({ id: null, provider, status: "not_connected" as const, scopes: [], lastSyncAt: null, metadata: {}, updatedAt: null }));
}

export async function setConnectorStatus(subject: AccountSubject, provider: ConnectorProvider, status: Exclude<ConnectorStatus, "not_connected">, scopes: string[] = []) {
  const result = await query<ConnectorRow>(`INSERT INTO account_connectors(id,platform_subject_type,platform_subject_id,provider,status,scopes_json,metadata_json) VALUES($1,$2,$3,$4,$5,$6::jsonb,'{}'::jsonb) ON CONFLICT(platform_subject_type,platform_subject_id,provider) DO UPDATE SET status=EXCLUDED.status,scopes_json=EXCLUDED.scopes_json,updated_at=now() RETURNING id,provider,status,scopes_json,last_sync_at,metadata_json,updated_at`, [randomUUID(), ...owner(subject), provider, status, JSON.stringify(scopes)]);
  return result.rows[0] ? map(result.rows[0]) : null;
}

export type ConnectorAlert = {
  id: string;
  provider: ConnectorProvider;
  idempotencyKey: string;
  sourceTitle: string;
  detectedAnomaly: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  timestamp: string;
  suggestedBattlefieldDraft: {
    title: string;
    dilemma: string;
    deadlineDays: number;
    initialConfidence: number;
  };
  isDismissed: boolean;
};

const mapAlert = (row: {
  id:string; provider:string; source_title:string; detected_anomaly:string;
  severity:string; observed_at:Date|string; suggested_battlefield_draft:unknown;
  dismissed_at:Date|string|null;
}): ConnectorAlert => {
  const draft = row.suggested_battlefield_draft && typeof row.suggested_battlefield_draft === "object" && !Array.isArray(row.suggested_battlefield_draft)
    ? row.suggested_battlefield_draft as Record<string, unknown> : {};
  return {
    id: row.id,
    provider: row.provider as ConnectorProvider,
    sourceTitle: row.source_title,
    detectedAnomaly: row.detected_anomaly,
    severity: row.severity as ConnectorAlert["severity"],
    timestamp: new Date(row.observed_at).toISOString(),
    suggestedBattlefieldDraft: {
      title: typeof draft.title === "string" ? draft.title : "连接器异常信号战局",
      dilemma: typeof draft.dilemma === "string" ? draft.dilemma : row.detected_anomaly,
      deadlineDays: typeof draft.deadlineDays === "number" && Number.isFinite(draft.deadlineDays) ? Math.max(1, Math.min(3650, draft.deadlineDays)) : 14,
      initialConfidence: typeof draft.initialConfidence === "number" && Number.isFinite(draft.initialConfidence) ? Math.max(0, Math.min(100, draft.initialConfidence)) : 50,
    },
    isDismissed: Boolean(row.dismissed_at),
  };
};

export async function listConnectorAlerts(subject: AccountSubject) {
  const result = await query(`SELECT id,provider,source_title,detected_anomaly,severity,observed_at,suggested_battlefield_draft,dismissed_at
    FROM account_connector_sync_records
    WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND dismissed_at IS NULL
    ORDER BY observed_at DESC LIMIT 100`, owner(subject));
  return result.rows.map(mapAlert);
}

export async function dismissConnectorAlert(subject: AccountSubject, id: string) {
  const result = await query(`UPDATE account_connector_sync_records SET dismissed_at=now()
    WHERE id=$1 AND platform_subject_type=$2 AND platform_subject_id=$3 AND dismissed_at IS NULL`, [id, ...owner(subject)]);
  return Boolean(result.rowCount);
}

export async function recordConnectorSync(input: {
  subject: AccountSubject;
  provider: ConnectorProvider;
  connectorId?: string | null;
  sourceTitle: string;
  detectedAnomaly: string;
  severity: ConnectorAlert["severity"];
  observedAt: string;
  suggestedBattlefieldDraft: ConnectorAlert["suggestedBattlefieldDraft"];
  metadata?: Record<string, unknown>;
}) {
  const result = await query<{ id:string }>(`INSERT INTO account_connector_sync_records
    (id,platform_subject_type,platform_subject_id,provider,idempotency_key,connector_id,source_title,detected_anomaly,severity,observed_at,suggested_battlefield_draft,metadata_json)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb
    WHERE EXISTS (SELECT 1 FROM account_connectors c WHERE c.platform_subject_type=$2 AND c.platform_subject_id=$3 AND c.provider=$4 AND c.status='authorized')
    ON CONFLICT (platform_subject_type,platform_subject_id,provider,idempotency_key) DO NOTHING
    RETURNING id`, [randomUUID(), input.subject.subjectType, input.subject.subjectId, input.provider, input.idempotencyKey, input.connectorId ?? null, input.sourceTitle, input.detectedAnomaly, input.severity, input.observedAt, JSON.stringify(input.suggestedBattlefieldDraft), JSON.stringify(input.metadata ?? {})]);
  if (result.rowCount) {
    await query(`UPDATE account_connectors SET last_sync_at=$4,updated_at=now() WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND provider=$3`, [input.subject.subjectType, input.subject.subjectId, input.provider, input.observedAt]);
  }
  return Boolean(result.rowCount);
}
