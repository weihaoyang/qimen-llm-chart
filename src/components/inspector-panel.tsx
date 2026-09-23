"use client";
import type { AgentAnalysisAngle, AgentConversationMessage } from "@/lib/agent/chat";
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
  agentStreamConfig?: {
    chatId: string;
    requestBody: Record<string, unknown>;
    requestHeaders: () => Promise<Record<string, string>>;
    onStart: () => void;
    onFinish: (messages: AgentConversationMessage[], completed?: boolean) => void;
    onError: (message: string) => void;
  };
};


export function InspectorPanel(props: InspectorPanelProps) {
  return <AgentConversation key={props.mode} {...props} />;
}
