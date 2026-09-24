"use client";
import type { AgentAnalysisAngle, AgentConversationMessage, AgentConversationMode, AgentStreamEvent, AgentToolEvent, AgentChartUpdate } from "@/lib/agent/chat";
import type { Position } from "3meta";
import type { WorkbenchMode } from "@/lib/workbench/types";
import { AgentConversation } from "./agent-conversation";
export type InspectorPanelProps = {
  agentTitle?: string;
  agentAngles: readonly AgentAnalysisAngle[];
  mode: WorkbenchMode;
  structuredText: string;
  jsonPayload: string;
  agentQuestion: string;
  defaultAgentQuestion: string;
  agentResult: string;
  agentResultCopied: boolean;
  agentModel: string | null;
  agentLoading: boolean;
  agentError: string | null;
  agentConversation: readonly AgentConversationMessage[];
  agentFollowUps: readonly string[];
  agentUsageAvailable: number;
  agentUsageConsumed: number;
  isInterviewZeroState?: boolean;
  agentPurchaseLabel?: string;
  platformStatus?: "checking" | "guest" | "authenticated" | "error";
  literatureContext: string;
  copyState: "idle" | "text" | "json";
  onAgentQuestionChange: (value: string) => void;
  onAgentAnalyze: (question?: string) => void;
  onCopyResult: () => Promise<void>;
  onCopyText: () => Promise<void>;
  onCopyJson: () => Promise<void>;
  selectedPalace?: Position | null;
  onRecalculate?: (datetime: string) => void;
  agentStreamConfig?: {
    chatId: string;
    requestBody: Record<string, unknown>;
    requestHeaders: () => Promise<Record<string, string>>;
    onStart: () => void;
    onFinish: (messages: AgentConversationMessage[], completed?: boolean) => void;
    onError: (message: string) => void;
    onToolEvent?: (event: AgentStreamEvent) => void;
    onChartContextUpdate?: (event: Extract<AgentStreamEvent, { type: "chart_update" }>) => void;
    onRestoreChartContext?: () => void;
  };
  conversationMode?: AgentConversationMode;
  onConversationModeChange?: (mode: AgentConversationMode) => void;
  toolEvents?: readonly AgentToolEvent[];
  activeAgentCaseId?: string | null;
  onToolEvent?: (event: AgentToolEvent) => void;
  onChartContextUpdate?: (event: AgentChartUpdate) => void;
};


export function InspectorPanel(props: InspectorPanelProps) {
  return <AgentConversation key={props.mode} {...props} />;
}
