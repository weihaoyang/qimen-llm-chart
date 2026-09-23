import { createHash } from "node:crypto";
import { query, withTransaction } from "@/lib/db/pool";
import { SCENARIOS, SCENARIO_CATALOG_VERSION, type ScenarioSeed } from "@/lib/scenarios/catalog";
import {
  DEEP_ARCHIVES_CATALOG,
  DEEP_ARCHIVES_CATALOG_VERSION,
  WORLD_PULSE_CATALOG,
  WORLD_PULSE_CATALOG_VERSION,
  WORLD_PULSE_TICKER,
} from "@/lib/scenarios/ecosystem";
import { OFFICIAL_TEMPLATE_CATALOG } from "@/lib/scenarios/marketplace";
import { AI_PERSONA_CONFIGS } from "@/lib/catalog/personas";
import { reportSwallowedError } from "@/lib/internal-log";

export const OFFICIAL_CATALOG_TYPES = {
  scenario: "scenario",
  persona: "persona",
  worldPulse: "world_pulse",
  worldPulseTicker: "world_pulse_ticker",
  deepArchive: "deep_archive",
  skillTemplate: "skill_template",
} as const;

type CatalogType = (typeof OFFICIAL_CATALOG_TYPES)[keyof typeof OFFICIAL_CATALOG_TYPES];
type SeedEntry = { catalogType: CatalogType; entryId: string; version: number; payload: unknown };
type CatalogRow = { entry_id: string; version: number; payload_json: unknown };

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const hashPayload = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");

const builtInEntries = (): SeedEntry[] => [
  ...SCENARIOS.map((scenario) => ({ catalogType:OFFICIAL_CATALOG_TYPES.scenario, entryId:scenario.id, version:scenario.version, payload:scenario })),
  ...Object.values(AI_PERSONA_CONFIGS).map((persona) => ({ catalogType:OFFICIAL_CATALOG_TYPES.persona, entryId:persona.id, version:1, payload:persona })),
  ...WORLD_PULSE_CATALOG.map((event) => ({ catalogType:OFFICIAL_CATALOG_TYPES.worldPulse, entryId:event.id, version:WORLD_PULSE_CATALOG_VERSION, payload:event })),
  { catalogType:OFFICIAL_CATALOG_TYPES.worldPulseTicker, entryId:"default", version:WORLD_PULSE_CATALOG_VERSION, payload:WORLD_PULSE_TICKER },
  ...DEEP_ARCHIVES_CATALOG.map((archive) => ({ catalogType:OFFICIAL_CATALOG_TYPES.deepArchive, entryId:archive.id, version:DEEP_ARCHIVES_CATALOG_VERSION, payload:archive })),
  ...OFFICIAL_TEMPLATE_CATALOG.map((template) => ({ catalogType:OFFICIAL_CATALOG_TYPES.skillTemplate, entryId:template.id, version:1, payload:template })),
];

/**
 * The in-flight or completed seed attempt.
 *
 * A boolean "already seeded" flag would let every concurrent cold-start request
 * start its own seed transaction. They would queue on the advisory lock and each
 * re-issue every `INSERT ... ON CONFLICT DO NOTHING`, while every read path —
 * which awaits this function — sat blocked behind that queue. Memoizing the
 * *promise* collapses the whole burst into one transaction.
 *
 * It is cleared on failure, so a process that booted against an unreachable
 * database retries on the next request instead of staying unseeded forever.
 */
let seedAttempt: Promise<void> | null = null;

/**
 * Copy the versioned built-in release bundle into PostgreSQL once per server
 * process. Existing versions are immutable: changing official content requires
 * a version bump, which prevents an application deploy from silently rewriting
 * what an existing user cloned.
 */
export async function ensureOfficialCatalogSeeded(): Promise<void> {
  if (!seedAttempt) {
    seedAttempt = (async () => {
      await withTransaction(async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock(hashtextextended('official-catalog-seed', 0))`);
        for (const entry of builtInEntries()) {
          await client.query(
            `INSERT INTO official_catalog_entries(catalog_type,entry_id,version,payload_json,content_hash)
             VALUES($1,$2,$3,$4::jsonb,$5)
             ON CONFLICT (catalog_type,entry_id,version) DO NOTHING`,
            [entry.catalogType, entry.entryId, entry.version, JSON.stringify(entry.payload), hashPayload(entry.payload)],
          );
        }
      });
    })();
  }

  const attempt = seedAttempt;
  try {
    await attempt;
  } catch (error) {
    // Only clear our own attempt. A later caller may already have started a fresh
    // one, and clobbering that would drop an in-flight transaction.
    if (seedAttempt === attempt) seedAttempt = null;
    throw error;
  }
}

/**
 * `payload_json` is `jsonb`, and a `jsonb` column can hold a scalar
 * (`"text"`, `3`, `null`). The `as T` cast this replaces compiled for every
 * shape, so a scalar payload reached the callers typed as a catalog entry and
 * surfaced as a property access on a string rather than as a readable failure.
 *
 * A payload that is not a container is corruption, not user data: the catalog is
 * written only by `ensureOfficialCatalogSeeded`. Throwing keeps it fail-closed,
 * and every read path already handles it — the two public reference routes fall
 * back to the bundled catalog, and the authenticated catalog routes answer with
 * a controlled 500.
 */
const catalogPayload = <T>(value: unknown, context: string): T => {
  if (value === null || typeof value !== "object") {
    reportSwallowedError("catalog", `官方目录 payload_json 不是对象或数组（${context}）。`, value);
    throw new Error("官方目录数据损坏。");
  }
  return value as T;
};

export async function listOfficialCatalog<T>(catalogType: CatalogType): Promise<Array<{ id:string; version:number; payload:T }>> {
  await ensureOfficialCatalogSeeded();
  const result = await query<CatalogRow>(
    `SELECT entry_id,version,payload_json
       FROM official_catalog_entries
      WHERE catalog_type=$1 AND status='published'
      ORDER BY entry_id`,
    [catalogType],
  );
  return result.rows.map((row) => ({ id:row.entry_id, version:row.version, payload:catalogPayload<T>(row.payload_json, `${catalogType}/${row.entry_id}`) }));
}

export async function getOfficialCatalogEntry<T>(catalogType: CatalogType, entryId: string): Promise<{ id:string; version:number; payload:T } | null> {
  await ensureOfficialCatalogSeeded();
  const result = await query<CatalogRow>(
    `SELECT entry_id,version,payload_json
       FROM official_catalog_entries
      WHERE catalog_type=$1 AND entry_id=$2 AND status='published'
      LIMIT 1`,
    [catalogType, entryId],
  );
  const row = result.rows[0];
  return row ? { id:row.entry_id, version:row.version, payload:catalogPayload<T>(row.payload_json, `${catalogType}/${row.entry_id}`) } : null;
}

export async function listOfficialScenarios(): Promise<ScenarioSeed[]> {
  return (await listOfficialCatalog<ScenarioSeed>(OFFICIAL_CATALOG_TYPES.scenario)).map((entry) => entry.payload);
}

export async function getOfficialScenario(id: string): Promise<ScenarioSeed | null> {
  return (await getOfficialCatalogEntry<ScenarioSeed>(OFFICIAL_CATALOG_TYPES.scenario, id))?.payload ?? null;
}

export const catalogVersions = {
  scenarios: SCENARIO_CATALOG_VERSION,
  personas: 1,
  worldPulse: WORLD_PULSE_CATALOG_VERSION,
  deepArchives: DEEP_ARCHIVES_CATALOG_VERSION,
  skillTemplates: 1,
};

export const __catalogTestables = { stableJson, hashPayload };
