import { BATTLE_STATUSES, CONSTRAINT_KINDS, FACT_KINDS, INVENTORY_CATEGORIES, MOVE_KINDS } from "./types";
import { isIn } from "@/lib/type-narrowing";

// `isIn` moved to a domain-neutral module so platform repositories can narrow
// columns with the same predicate. Re-exported here because the battle routes
// import it from this module.
export { isIn };

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const isBattleStatus = (value: unknown) => isIn(value, BATTLE_STATUSES);
export const isFactKind = (value: unknown) => isIn(value, FACT_KINDS);
export const isConstraintKind = (value: unknown) => isIn(value, CONSTRAINT_KINDS);
export const isInventoryCategory = (value: unknown) => isIn(value, INVENTORY_CATEGORIES);
export const isMoveKind = (value: unknown) => isIn(value, MOVE_KINDS);
export const asText = (value: unknown, max: number, required = true) => typeof value === "string" && value.trim().length >= (required ? 1 : 0) && value.length <= max ? value.trim() : null;
export const asOptionalText = (value: unknown, max: number) => value === undefined || value === null ? "" : asText(value, max, false);
export const asDate = (value: unknown) => value === null || value === undefined ? null : typeof value === "string" && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : undefined;
export const asRecord = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const isStorageReference = (value: unknown): value is string => typeof value === "string" && value.length <= 512 && (value.startsWith("https://") || value.startsWith("s3://") || value.startsWith("gs://") || value.startsWith("azure://"));

/**
 * `_idempotencyKey` is server-reserved bookkeeping that lives inside the review
 * diagnosis JSON for backward compatibility (see migration 011's partial unique
 * index). Client input must never supply it:
 *
 * - The pre-check only runs when the caller passes an explicit key, so a
 *   payload-supplied value would be written verbatim and a second request with
 *   the same injected value would trip the unique index as an uncaught 23505.
 * - A client could pre-occupy the slot a later server-generated key (for
 *   example `ai-job:<uuid>`) needs, silently suppressing that review.
 */
export const stripReservedReviewKeys = (value: unknown): Record<string, unknown> => {
  const source = asRecord(value);
  if (!source || !("_idempotencyKey" in source)) return source ?? {};
  const copy: Record<string, unknown> = { ...source };
  delete copy._idempotencyKey;
  return copy;
};

/**
 * `jobId` inside a client-writable JSON blob is server-reserved bookkeeping, not
 * user data. It marks "this row was produced by AI job X" and it is what the
 * AI-retry dedupe keys on:
 *
 * - `battle_advice.source_json->>'jobId'` — `createAdvice` returns the existing
 *   row for that job, and migration 013's unique index is keyed on it **without
 *   the author** (`battle_advice (battle_id, (source_json->>'jobId'))`).
 * - `battle_inventory_items.evidence_json->>'jobId'` — `appendInventory` skips
 *   the cards of a job it believes was already applied.
 *
 * Client input must never supply it, on either column:
 *
 * - A caller who read or guessed a job id could pre-occupy its slot, so the real
 *   job's rows are silently dropped (`ON CONFLICT DO NOTHING` for advice, the
 *   `applied` bucket for inventory) with no error anywhere.
 * - The dedupe returns what it finds, so a client posting an arbitrary `jobId`
 *   could get back rows it never wrote and have its own data discarded.
 * - It forges AI provenance: a manual edit would read as AI output.
 *
 * Cross-path is the reason both columns go through one helper: a row written by
 * the *client* inventory editor is read back by the *AI* job's dedupe, so
 * stripping on only one of the two paths leaves the hole open.
 *
 * The AI paths supply the id as a trusted argument instead (`createAdvice`'s
 * `trustedJobId`; `appendInventory` is called only from the AI handler, which
 * builds `evidence` itself).
 */
export const stripReservedJobId = (value: unknown): Record<string, unknown> => {
  const source = asRecord(value);
  if (!source || !("jobId" in source)) return source ?? {};
  const copy: Record<string, unknown> = { ...source };
  delete copy.jobId;
  return copy;
};
