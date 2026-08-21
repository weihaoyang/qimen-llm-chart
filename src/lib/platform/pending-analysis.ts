import type { WorkbenchMode } from "@/lib/workbench/types";
import type { AgentConversationMessage } from "@/lib/agent/chat";
import type { KlineKind, KlineSeries } from "@/lib/qimen/kline";

const PENDING_KEY = "qmdj.pending-paid-analysis.v1";
const COMPLETED_KEY = "qmdj.completed-paid-analysis.v1";
const ACTIVE_KEY = "qmdj.active-agent-session.v1";
const KLINE_RESULT_KEY = "qmdj.kline-ai-result.v1";
export const AGENT_SESSION_TURNS = 10;

export type PendingPaidAnalysis = {
  orderId: string;
  productCode?: string;
  /** Guest tokens are only present for the guest checkout path. Account purchases recover via the platform session. */
  checkoutToken: string;
  checkoutMode?: "account" | "guest";
  mode: WorkbenchMode;
  /** User-facing label for the turn. May differ from an internal orchestration prompt. */
  displayQuestion?: string;
  question: string;
  focus: string;
  structuredText: string;
  jsonPayload: string;
  analysisProduct?: "agent" | "kline";
  klineKind?: KlineKind;
  klineSeries?: KlineSeries;
  /** Keep payment recovery in the product that initiated the analysis. */
  returnPath?: "/" | "/paipan";
  createdAt: number;
};

export type CompletedPaidAnalysis = {
  orderId: string;
  productCode?: string;
  checkoutToken: string;
  checkoutMode?: "account" | "guest";
  mode: WorkbenchMode;
  focus: string;
  structuredText: string;
  jsonPayload: string;
  messages: AgentConversationMessage[];
  usageAvailable: number;
  usageConsumed: number;
  totalTurns: number;
  model: string | null;
  content: string;
  analysisProduct?: "agent" | "kline";
  klineKind?: KlineKind;
  klineSeries?: KlineSeries;
};

export type ActiveAgentSession = Omit<CompletedPaidAnalysis, "content" | "model"> & {
  updatedAt: number;
};

type CheckoutMode = "account" | "guest";

const sessionStorageFor = () => (typeof window === "undefined" ? null : window.sessionStorage);
const accountStorageFor = () => (typeof window === "undefined" ? null : window.localStorage);

/**
 * Account recovery contains no bearer or guest credential and may survive a
 * payment-provider tab switch. Guest recovery must remain session-only because
 * its checkout token is a scoped credential and must never enter long-lived
 * localStorage.
 */
const storageFor = (mode: CheckoutMode = "guest") => mode === "account" ? accountStorageFor() : sessionStorageFor();

const readFrom = <T>(key: string, mode: CheckoutMode): T | null => {
  try {
    const raw = storageFor(mode)?.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
};

const writeTo = (key: string, value: unknown, mode: CheckoutMode) => {
  try {
    storageFor(mode)?.setItem(key, JSON.stringify(value));
  } catch {
    // An account recovery contains no guest credential, so a same-tab session
    // fallback is safe when localStorage is unavailable (private mode/quota).
    if (mode === "account") {
      try {
        sessionStorageFor()?.setItem(key, JSON.stringify(value));
      } catch {
        // There is no safe durable fallback for browser storage being disabled.
      }
    }
  }
};

const removeFrom = (key: string, mode: CheckoutMode) => {
  try {
    storageFor(mode)?.removeItem(key);
  } catch {
    // Best effort cleanup only.
  }
};

export const savePendingPaidAnalysis = (value: PendingPaidAnalysis) =>
  writeTo(PENDING_KEY, value, value.checkoutMode === "account" ? "account" : "guest");

export const loadPendingPaidAnalysis = (): PendingPaidAnalysis | null => {
  return readFrom<PendingPaidAnalysis>(PENDING_KEY, "guest") ?? readFrom<PendingPaidAnalysis>(PENDING_KEY, "account");
};

export const clearPendingPaidAnalysis = () => {
  removeFrom(PENDING_KEY, "guest");
  removeFrom(PENDING_KEY, "account");
};

export const saveCompletedPaidAnalysis = (value: CompletedPaidAnalysis) =>
  writeTo(COMPLETED_KEY, value, value.checkoutMode === "account" ? "account" : "guest");

export const popCompletedPaidAnalysis = (): CompletedPaidAnalysis | null => {
  for (const mode of ["guest", "account"] as const) {
    const parsed = readFrom<Partial<CompletedPaidAnalysis>>(COMPLETED_KEY, mode);
    removeFrom(COMPLETED_KEY, mode);
    if (!parsed) continue;
    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.checkoutToken !== "string" ||
      !Array.isArray(parsed.messages) ||
      typeof parsed.mode !== "string"
    ) {
      continue;
    }
    return parsed as CompletedPaidAnalysis;
  }
  return null;
};

export const saveActiveAgentSession = (value: ActiveAgentSession) =>
  writeTo(ACTIVE_KEY, value, value.checkoutMode === "account" ? "account" : "guest");

export const loadActiveAgentSession = (): ActiveAgentSession | null => {
  for (const mode of ["guest", "account"] as const) {
    const parsed = readFrom<Partial<ActiveAgentSession>>(ACTIVE_KEY, mode);
    if (!parsed) continue;
    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.checkoutToken !== "string" ||
      !Array.isArray(parsed.messages) ||
      typeof parsed.mode !== "string"
    ) {
      continue;
    }
    return parsed as ActiveAgentSession;
  }
  return null;
};

export const clearActiveAgentSession = () => {
  removeFrom(ACTIVE_KEY, "guest");
  removeFrom(ACTIVE_KEY, "account");
};

export const saveKlineAiResult = (value: Pick<CompletedPaidAnalysis, "content" | "model" | "klineKind" | "klineSeries">) =>
  writeTo(KLINE_RESULT_KEY, value, "guest");

export const loadKlineAiResult = (): Pick<CompletedPaidAnalysis, "content" | "model" | "klineKind" | "klineSeries"> | null => {
  return readFrom<Pick<CompletedPaidAnalysis, "content" | "model" | "klineKind" | "klineSeries">>(KLINE_RESULT_KEY, "guest");
};
