import type { WorkbenchMode } from "@/lib/workbench/types";
import type { AgentConversationMessage } from "@/lib/agent/chat";
import type { KlineKind, KlineSeries } from "@/lib/qimen/kline";

const ACTIVE_KEY = "qmdj.account-agent-session.v2";
const KLINE_RESULT_KEY = "qmdj.account-kline-result.v2";
export const AGENT_SESSION_TURNS = 10;

export type ActiveAgentSession = {
  mode: WorkbenchMode;
  focus: string;
  structuredText: string;
  jsonPayload: string;
  messages: AgentConversationMessage[];
  usageAvailable: number;
  usageConsumed: number;
  totalTurns: number;
  updatedAt: number;
};

export type KlineAiResult = {
  content: string;
  model: string | null;
  klineKind?: KlineKind;
  klineSeries?: KlineSeries;
};

const storage = () => (typeof window === "undefined" ? null : window.localStorage);

const read = <T,>(key: string): T | null => {
  try {
    const value = storage()?.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    storage()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const saveActiveAgentSession = (value: ActiveAgentSession) => write(ACTIVE_KEY, value);

export const loadActiveAgentSession = (): ActiveAgentSession | null => {
  const value = read<Partial<ActiveAgentSession>>(ACTIVE_KEY);
  if (
    !value ||
    typeof value.mode !== "string" ||
    typeof value.focus !== "string" ||
    typeof value.structuredText !== "string" ||
    typeof value.jsonPayload !== "string" ||
    !Array.isArray(value.messages) ||
    typeof value.usageAvailable !== "number" ||
    typeof value.usageConsumed !== "number" ||
    typeof value.totalTurns !== "number" ||
    typeof value.updatedAt !== "number"
  ) return null;
  return value as ActiveAgentSession;
};

export const clearActiveAgentSession = () => {
  try {
    storage()?.removeItem(ACTIVE_KEY);
  } catch {
    // Best effort cleanup on logout.
  }
};

export const saveKlineAiResult = (value: KlineAiResult) => write(KLINE_RESULT_KEY, value);

export const loadKlineAiResult = (): KlineAiResult | null => {
  const value = read<Partial<KlineAiResult>>(KLINE_RESULT_KEY);
  if (!value || typeof value.content !== "string") return null;
  return value as KlineAiResult;
};
