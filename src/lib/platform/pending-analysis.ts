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
  /** Guest tokens are only present for the guest checkout path. Account purchases recover via the platform session. */
  checkoutToken: string;
  checkoutMode?: "account" | "guest";
  mode: WorkbenchMode;
  question: string;
  focus: string;
  structuredText: string;
  jsonPayload: string;
  analysisProduct?: "agent" | "kline";
  klineKind?: KlineKind;
  klineSeries?: KlineSeries;
  createdAt: number;
};

export type CompletedPaidAnalysis = {
  orderId: string;
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

const storage = () => (typeof window === "undefined" ? null : window.sessionStorage);

export const savePendingPaidAnalysis = (value: PendingPaidAnalysis) =>
  storage()?.setItem(PENDING_KEY, JSON.stringify(value));

export const loadPendingPaidAnalysis = (): PendingPaidAnalysis | null => {
  try {
    const raw = storage()?.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingPaidAnalysis) : null;
  } catch {
    return null;
  }
};

export const clearPendingPaidAnalysis = () => storage()?.removeItem(PENDING_KEY);

export const saveCompletedPaidAnalysis = (value: CompletedPaidAnalysis) =>
  storage()?.setItem(COMPLETED_KEY, JSON.stringify(value));

export const popCompletedPaidAnalysis = (): CompletedPaidAnalysis | null => {
  try {
    const raw = storage()?.getItem(COMPLETED_KEY);
    storage()?.removeItem(COMPLETED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CompletedPaidAnalysis>;
    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.checkoutToken !== "string" ||
      !Array.isArray(parsed.messages) ||
      typeof parsed.mode !== "string"
    ) {
      return null;
    }
    return parsed as CompletedPaidAnalysis;
  } catch {
    return null;
  }
};

export const saveActiveAgentSession = (value: ActiveAgentSession) =>
  storage()?.setItem(ACTIVE_KEY, JSON.stringify(value));

export const loadActiveAgentSession = (): ActiveAgentSession | null => {
  try {
    const raw = storage()?.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveAgentSession>;
    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.checkoutToken !== "string" ||
      !Array.isArray(parsed.messages) ||
      typeof parsed.mode !== "string"
    ) {
      return null;
    }
    return parsed as ActiveAgentSession;
  } catch {
    return null;
  }
};

export const clearActiveAgentSession = () => storage()?.removeItem(ACTIVE_KEY);

export const saveKlineAiResult = (value: Pick<CompletedPaidAnalysis, "content" | "model" | "klineKind" | "klineSeries">) =>
  storage()?.setItem(KLINE_RESULT_KEY, JSON.stringify(value));

export const loadKlineAiResult = (): Pick<CompletedPaidAnalysis, "content" | "model" | "klineKind" | "klineSeries"> | null => {
  try {
    const raw = storage()?.getItem(KLINE_RESULT_KEY);
    return raw ? JSON.parse(raw) as Pick<CompletedPaidAnalysis, "content" | "model" | "klineKind" | "klineSeries"> : null;
  } catch { return null; }
};
