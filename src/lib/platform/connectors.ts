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
