import { randomUUID } from "node:crypto";
import { settledCommit, type SettledUsage } from "./settled-commit";
import type { PlatformUsage } from "./server";

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

type ProviderUsageShape = {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  total_tokens?: unknown;
  inputTokens?: unknown;
  outputTokens?: unknown;
  totalTokens?: unknown;
};

const positiveInteger = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;

/** Normalize OpenAI-compatible and AI SDK usage fields into audit fields. */
export const readProviderUsage = (value: unknown): AiUsage | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as ProviderUsageShape;
  const inputTokens = positiveInteger(source.inputTokens) ?? positiveInteger(source.prompt_tokens);
  const outputTokens = positiveInteger(source.outputTokens) ?? positiveInteger(source.completion_tokens);
  const totalTokens = positiveInteger(source.totalTokens) ?? positiveInteger(source.total_tokens) ?? (inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined);
  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) return undefined;
  return { inputTokens, outputTokens, totalTokens };
};

export type AiAuditEvent = {
  requestId: string;
  productCode: string;
  accessScope: string;
  capability: string;
  planCode: string;
  subjectMode: "account" | "guest";
  status: "reserved" | "succeeded" | "released" | "reconciled" | "failed";
  reservationId?: string;
  usage?: AiUsage;
  reasonCode?: string;
};

export type AiUsageReservation = { reservationId: string; requestId: string };

export type AiBillingAdapter = {
  reserve: (input: { planCode: string; requestId: string }) => Promise<{ reservation_id: string }>;
  commit: (reservationId: string, planCode: string) => Promise<PlatformUsage | SettledUsage>;
  release: (reservationId: string, planCode: string) => Promise<PlatformUsage>;
  audit?: (event: AiAuditEvent) => void;
};

/**
 * Product-side AI billing contract. Payment and entitlement truth stay in the
 * Consumer Platform; this adapter only owns one model invocation lifecycle.
 * A reserve response is never retried because an ambiguous POST can create a
 * second reservation. Commit uses the platform's terminal-settlement rule.
 */
export const runBilledAi = async <T>(
  adapter: AiBillingAdapter,
  input: { productCode: string; accessScope: string; capability: string; planCode: string; subjectMode?: "account" | "guest"; requestId?: string },
  invoke: (context: { requestId: string; reservationId: string }) => Promise<{ result: T; usage?: AiUsage }>,
): Promise<{ result: T; usage: PlatformUsage | SettledUsage; requestId: string }> => {
  const requestId = input.requestId?.trim() || randomUUID();
  const subjectMode = input.subjectMode ?? "account";
  let reserved: { reservation_id: string };
  try {
    reserved = await adapter.reserve({ planCode: input.planCode, requestId });
  } catch (error) {
    adapter.audit?.({ requestId, productCode: input.productCode, accessScope: input.accessScope, capability: input.capability, planCode: input.planCode, subjectMode, status: "failed", reasonCode: error instanceof Error ? error.name : "reserve_failed" });
    throw error;
  }
  if (!reserved.reservation_id) throw new Error("平台未返回 AI usage reservation。");
  const reservationId = reserved.reservation_id;
  adapter.audit?.({ requestId, productCode: input.productCode, accessScope: input.accessScope, capability: input.capability, planCode: input.planCode, subjectMode, status: "reserved", reservationId });
  let execution: { result: T; usage?: AiUsage };
  try {
    execution = await invoke({ requestId, reservationId });
  } catch (error) {
    try {
      await adapter.release(reservationId, input.planCode);
      adapter.audit?.({ requestId, productCode: input.productCode, accessScope: input.accessScope, capability: input.capability, planCode: input.planCode, subjectMode, status: "released", reservationId });
    } catch (releaseError) {
      adapter.audit?.({ requestId, productCode: input.productCode, accessScope: input.accessScope, capability: input.capability, planCode: input.planCode, subjectMode, status: "failed", reservationId, reasonCode: releaseError instanceof Error ? releaseError.name : "release_failed" });
    }
    throw error;
  }
  // A provider result has been delivered. A commit failure is ambiguous and
  // must remain recoverable; releasing here could refund an already-consumed
  // reservation and create a free result.
  const usage = await settledCommit("ai-billing", `reservation ${reservationId}`, () => adapter.commit(reservationId, input.planCode));
  adapter.audit?.({ requestId, productCode: input.productCode, accessScope: input.accessScope, capability: input.capability, planCode: input.planCode, subjectMode, status: "reconciled" in usage ? "reconciled" : "succeeded", reservationId, usage: execution.usage, reasonCode: "reconciled" in usage ? usage.reason_code : undefined });
  return { result: execution.result, usage, requestId };
};
