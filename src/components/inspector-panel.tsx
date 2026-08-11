"use client";

import { Clipboard, FileJson2, LoaderCircle, Sparkles } from "lucide-react";
import { StructuredOutput } from "@/components/structured-output";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentAnalysisAngle, AgentConversationMessage } from "@/lib/agent/chat";
import type { Position } from "3meta";
import type { WorkbenchMode } from "@/lib/workbench/types";

type InspectorPanelProps = {
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
  agentPurchaseLabel?: string;
  platformStatus?: "checking" | "guest" | "authenticated" | "error";
  literatureContext: string;
  copyState: "idle" | "text" | "json";
  onAgentQuestionChange: (value: string) => void;
  onAgentAnalyze: () => void;
  onCopyResult: () => Promise<void>;
  onCopyText: () => Promise<void>;
  onCopyJson: () => Promise<void>;
  selectedPalace?: Position | null;
};

export function InspectorPanel({
  agentAngles,
  mode,
  structuredText,
  jsonPayload,
  agentQuestion,
  defaultAgentQuestion,
  agentResult,
  agentResultCopied,
  agentModel,
  agentLoading,
  agentError,
  agentConversation,
  agentFollowUps,
  agentUsageAvailable,
  agentUsageConsumed,
  agentPurchaseLabel = "购买 10 轮研究对话 · ¥9.9",
  platformStatus = "guest",
  literatureContext,
  copyState,
  onAgentQuestionChange,
  onAgentAnalyze,
  onCopyResult,
  onCopyText,
  onCopyJson,
  selectedPalace = null,
}: InspectorPanelProps) {
  const modeLabel: Record<WorkbenchMode, string> = {
    qimen: "奇门",
    bazi: "八字",
    ziwei: "紫微",
    combined: "三盘联合",
    research: "术数研究",
  };
  const literatureTitle = mode === "combined" ? "联合模式 · 八字原始文献" : "八字原始文献上下文";
  const literatureEmptyMessage =
    mode === "combined"
      ? "当前联合模式还没有可匹配的八字文献摘录。"
      : "切换到八字或三盘联合后，这里会显示按问题匹配的原文摘录。";
  return (
    <Tabs className="inspector-tabs" defaultValue="agent">
      <TabsList className="inspector-tabs__list" aria-label="Agent 工作区" variant="line">
        <TabsTrigger value="agent"><Sparkles data-icon="inline-start" />Agent</TabsTrigger>
        {mode !== "combined" ? (
          <>
            <TabsTrigger value="text"><Clipboard data-icon="inline-start" />结构化文本</TabsTrigger>
            <TabsTrigger value="json"><FileJson2 data-icon="inline-start" />JSON</TabsTrigger>
            <TabsTrigger value="literature">文献</TabsTrigger>
          </>
        ) : null}
      </TabsList>

      <TabsContent className="inspector-tabs__content" value="text">
        <div className="inspector-output">
          <div className="inspector-output__toolbar">
            <span>结构化盘面文本</span>
            <Button
              className="command-button"
              variant="outline"
              type="button"
              onClick={() => {
                void onCopyText();
              }}
              disabled={!structuredText}
            >
              <Clipboard data-icon="inline-start" />
              {copyState === "text" ? "已复制文本" : "复制结构化文本"}
            </Button>
          </div>
          <ScrollArea className="inspector-scroll inspector-scroll-plain">
            <StructuredOutput selectedPalace={selectedPalace} structuredText={structuredText} />
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent className="inspector-tabs__content" value="json">
        <div className="inspector-output">
          <div className="inspector-output__toolbar">
            <span>LLM JSON 输入</span>
            <Button
              className="command-button"
              variant="outline"
              type="button"
              onClick={() => {
                void onCopyJson();
              }}
              disabled={!jsonPayload}
            >
              <FileJson2 data-icon="inline-start" />
              {copyState === "json" ? "已复制 JSON" : "复制 JSON"}
            </Button>
          </div>
          <ScrollArea className="inspector-scroll inspector-scroll-plain">
            {jsonPayload ? (
              <pre className="json-block" suppressHydrationWarning>
                {jsonPayload}
              </pre>
            ) : (
              <div className="empty-panel">等待生成 JSON。</div>
            )}
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent className="inspector-tabs__content" value="literature">
        <div className="inspector-output">
          <div className="inspector-output__toolbar">
            <span>{literatureTitle}</span>
          </div>
          <ScrollArea className="inspector-scroll inspector-scroll-plain">
            {literatureContext ? (
              <pre className="literature-block" suppressHydrationWarning>
                {literatureContext}
              </pre>
            ) : (
              <div className="empty-panel">{literatureEmptyMessage}</div>
            )}
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent className="inspector-tabs__content" value="agent">
        <div className="agent-panel">
          <section className="agent-panel__section agent-panel__section--question">
            <div className="agent-panel__section-head">
              <strong>分析角度</strong>
              <span>{modeLabel[mode]} · 选择一个角度或直接改写问题</span>
            </div>
            <div className="agent-panel__angles" aria-label="分析角度">
              {agentAngles.map((angle) => (
                <button
                  className={
                    agentQuestion === angle.question
                      ? "agent-panel__angle is-active"
                      : "agent-panel__angle"
                  }
                  aria-pressed={agentQuestion === angle.question}
                  disabled={agentLoading}
                  key={angle.label}
                  type="button"
                  onClick={() => onAgentQuestionChange(angle.question)}
                >
                  {angle.label}
                </button>
              ))}
            </div>
            <label className="agent-panel__question" htmlFor="agent-question">
              <textarea
                id="agent-question"
                className="agent-panel__textarea"
                value={agentQuestion}
                maxLength={300}
                disabled={agentLoading}
                placeholder="例如：只看事业，列出盘面依据和现实中的验证方式。"
                onChange={(event) => onAgentQuestionChange(event.target.value)}
              />
            </label>
            <div className="agent-panel__question-meta">
              <span>{agentQuestion.length}/300</span>
              <button
                type="button"
                disabled={agentLoading || agentQuestion === defaultAgentQuestion}
                onClick={() => onAgentQuestionChange(defaultAgentQuestion)}
              >
                恢复默认问法
              </button>
            </div>
            <details className="agent-panel__followups" aria-label="推荐问题">
              <summary>推荐问题</summary>
              <div>
                {agentFollowUps.map((followUp) => (
                  <button
                    key={followUp}
                    type="button"
                    disabled={agentLoading}
                    onClick={() => onAgentQuestionChange(followUp)}
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </details>
          </section>

          <div className="agent-panel__toolbar">
            <div className="agent-panel__entitlement" role="status">
              <span>{platformStatus === "authenticated" ? "平台账户权益" : platformStatus === "checking" ? "正在读取平台权益" : "游客一次性权益"}</span>
              <strong>{agentUsageAvailable > 0 ? `剩余 ${agentUsageAvailable} 轮` : "尚未开通"}</strong>
            </div>
            <Button
              className="command-button command-button-primary"
              type="button"
              onClick={onAgentAnalyze}
              disabled={
                agentLoading ||
                !structuredText ||
                !jsonPayload
              }
            >
              {agentLoading ? <LoaderCircle className="agent-spin" /> : <Sparkles />}
              {agentLoading
                ? "正在处理"
                : agentUsageConsumed > 0
                  ? agentUsageAvailable > 0
                    ? "发送问题 · 消耗 1 轮"
                    : `${agentPurchaseLabel.replace("购买", "再购买")}`
                  : agentPurchaseLabel}
            </Button>
          </div>

          {agentError ? <p className="agent-panel__error">{agentError}</p> : null}

          <section className="agent-panel__section agent-panel__section--result">
            <div className="agent-panel__section-head">
              <strong>结果</strong>
              <div className="agent-panel__result-actions">
                {agentModel ? <span>{agentModel}</span> : null}
                {agentResult ? (
                  <Button
                    className="agent-result-copy"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      void onCopyResult();
                    }}
                  >
                    <Clipboard data-icon="inline-start" />
                    {agentResultCopied ? "已复制结果" : "复制结果"}
                  </Button>
                ) : null}
              </div>
            </div>
            <ScrollArea className="inspector-scroll inspector-scroll-plain">
              {agentConversation.length > 0 ? (
                <div className="agent-thread">
                  {agentConversation.map((message, index) => (
                    <article className={`agent-thread__message agent-thread__message--${message.role}`} key={`${message.role}-${index}`}>
                      <span>{message.role === "user" ? "你的问题" : "研究回答"}</span>
                      <pre className="agent-result" suppressHydrationWarning>{message.content}</pre>
                    </article>
                  ))}
                </div>
              ) : agentResult ? (
                <pre className="agent-result" suppressHydrationWarning>{agentResult}</pre>
              ) : (
                <div className="agent-result-empty">
                  <Sparkles />
                  <strong>世界线观测待启动</strong>
                  <span>提交一个问题，在命运收束之前重构选择。</span>
                </div>
              )}
            </ScrollArea>
          </section>
        </div>
      </TabsContent>
    </Tabs>
  );
}
