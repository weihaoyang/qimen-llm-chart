"use client";

import { Clipboard, FileJson2, LoaderCircle, Sparkles } from "lucide-react";
import { StructuredOutput } from "@/components/structured-output";
import { AgentMarkdown } from "@/components/agent-markdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentAnalysisAngle, AgentConversationMessage } from "@/lib/agent/chat";
import type { Position } from "3meta";
import type { WorkbenchMode } from "@/lib/workbench/types";
import { AgentChatThread } from "@/components/agent-chat-thread";

type InspectorPanelProps = {
  surface?: "chart" | "shengtian";
  /** Product Agent view hides engineering inputs; the model still receives them. */
  hideTechnicalTabs?: boolean;
  /** Agent-first product shell owns the interview framing and hides the internal research-room header. */
  hideObservatoryHeader?: boolean;
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
  onAgentAnalyze: () => void;
  onCopyResult: () => Promise<void>;
  onCopyText: () => Promise<void>;
  onCopyJson: () => Promise<void>;
  selectedPalace?: Position | null;
  agentStreamConfig?: {
    chatId: string;
    requestBody: Record<string, unknown>;
    requestHeaders: () => Promise<Record<string, string>>;
    submitNonce: number;
    onStart: () => void;
    onFinish: (messages: AgentConversationMessage[]) => void;
    onError: (message: string) => void;
  };
};

export function InspectorPanel({
  surface = "shengtian",
  hideTechnicalTabs = false,
  hideObservatoryHeader = false,
  agentTitle = "AI 分析",
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
  isInterviewZeroState = false,
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
  agentStreamConfig,
}: InspectorPanelProps) {
  const isChartSurface = surface === "chart";
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
  const interviewStep = Math.min(5, agentConversation.filter((message) => message.role === "assistant").length);
  const interviewSteps = ["议题", "事实", "约束", "选项", "代价", "行动"];
  const interviewPrompt = "我正在处理一个现实人生议题。请进入访谈模式：先不要给结论，只问我一个最关键的问题；依次确认议题、已知事实、不可改变的约束、可选路径、愿意承担的代价和下一步行动。每次只问一个问题，等我回答后再继续。";
  return (
    <Tabs className={isChartSurface ? "inspector-tabs inspector-tabs--chart agent-surface--chart" : "inspector-tabs"} defaultValue="agent">
      {!isChartSurface && !hideObservatoryHeader ? <section className="agent-observatory-head" aria-label="AI 议题访谈状态">
        <div className="agent-observatory-head__title"><span>AI RESEARCH ROOM · {modeLabel[mode]}</span><h2>把人生问题问到可以选择。</h2><p>AI 不替你宣布结局；它会逐个追问事实、限制与代价，再把答案整理成可复盘的选择结构。</p></div>
        <div className="agent-observatory-head__action"><span>访谈进度</span><strong>{interviewStep} / 5</strong><button type="button" disabled={agentLoading} onClick={() => onAgentQuestionChange(interviewPrompt)}>开始人生议题访谈</button></div>
        <div className="agent-observatory-head__steps" aria-label="访谈步骤">{interviewSteps.map((step, index) => <span className={index <= interviewStep ? "is-done" : ""} key={step}><b>{index + 1}</b>{step}</span>)}</div>
      </section> : null}
      <TabsList className="inspector-tabs__list" aria-label="Agent 工作区" variant="line">
        <TabsTrigger value="agent"><Sparkles data-icon="inline-start" />{hideTechnicalTabs ? "对话" : "Agent"}</TabsTrigger>
        {!hideTechnicalTabs && mode !== "combined" ? (
          <>
            <TabsTrigger value="text"><Clipboard data-icon="inline-start" />结构化文本</TabsTrigger>
            <TabsTrigger value="json"><FileJson2 data-icon="inline-start" />JSON</TabsTrigger>
            <TabsTrigger value="literature">文献</TabsTrigger>
          </>
        ) : null}
      </TabsList>

      {!hideTechnicalTabs ? <TabsContent className="inspector-tabs__content" value="text">
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
      </TabsContent> : null}

      {!hideTechnicalTabs ? <TabsContent className="inspector-tabs__content" value="json">
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
      </TabsContent> : null}

      {!hideTechnicalTabs ? <TabsContent className="inspector-tabs__content" value="literature">
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
      </TabsContent> : null}

      <TabsContent className="inspector-tabs__content" value="agent">
        <div className={isChartSurface ? "agent-panel agent-panel--chart" : "agent-panel"}>
          {isChartSurface ? (
            <header className="chart-inspector-head"><strong>{agentTitle}</strong></header>
          ) : null}
          <section className="agent-panel__section agent-panel__section--question">
            <div className="agent-panel__section-head">
              <strong>{isChartSurface ? "所问事项" : surface === "shengtian" ? "你的问题" : "分析角度"}</strong>
              <span>{isChartSurface ? "选择切入点，或直接写下要问的事" : surface === "shengtian" ? "可以继续追问，Agent 会沿用本次盘面与依据" : `${modeLabel[mode]} · 选择一个角度或直接改写问题`}</span>
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
                placeholder={surface === "shengtian" ? "例如：这次机会值得我在本月推进吗？请给出盘面依据、时间窗和三条可能路径。" : "例如：只看事业，列出盘面依据和现实中的验证方式。"}
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
                : !isChartSurface && isInterviewZeroState
                  ? agentUsageAvailable > 0
                    ? "发起分析 · 消耗 1 轮"
                    : "开通后发起分析"
                  : isChartSurface
                    ? agentUsageAvailable > 0
                      ? agentUsageConsumed > 0 ? "继续分析 · 消耗 1 次" : "发起盘面分析 · 消耗 1 次"
                      : "开通 AI 分析"
                  : agentUsageConsumed > 0
                    ? agentUsageAvailable > 0
                      ? "发送问题 · 消耗 1 轮"
                      : `${agentPurchaseLabel.replace("购买", "再购买")}`
                    : agentPurchaseLabel}
            </Button>
          </div>

          {platformStatus === "guest" ? (
            <p className="agent-panel__guest-recovery-note" role="note">
              未登录购买提示：支付后的恢复信息只保存在当前浏览器标签页；关闭页面或换设备可能无法继续对话。登录后可跨设备恢复。
            </p>
          ) : null}

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
              {agentStreamConfig ? (
                <AgentChatThread
                  chatId={agentStreamConfig.chatId}
                  initialMessages={agentConversation}
                  requestBody={agentStreamConfig.requestBody}
                  requestHeaders={agentStreamConfig.requestHeaders}
                  submitNonce={agentStreamConfig.submitNonce}
                  question={agentQuestion}
                  disabled={agentLoading}
                  onStart={agentStreamConfig.onStart}
                  onFinish={agentStreamConfig.onFinish}
                  onError={agentStreamConfig.onError}
                />
              ) : agentConversation.length > 0 ? (
                <div className="agent-thread">
                  {agentConversation.map((message, index) => (
                    <article className={`agent-thread__message agent-thread__message--${message.role}`} key={`${message.role}-${index}`}>
                      <span>{message.role === "user" ? "你的问题" : "研究回答"}</span>
                      <div className="agent-result"><AgentMarkdown content={message.content} /></div>
                    </article>
                  ))}
                </div>
              ) : agentResult ? (
                <div className="agent-result"><AgentMarkdown content={agentResult} /></div>
              ) : (
                isChartSurface ? (
                  <div className="agent-result-empty agent-result-empty--chart">
                    <div className="agent-result-empty__stamp"><Sparkles /><span>ANALYSIS / READY</span></div>
                    <div className="agent-result-empty__lead">
                      <strong>等待一次可复核的解读</strong>
                      <p>所问事项确定后，Agent 会只围绕当前盘面提取依据与行动提示。</p>
                    </div>
                    <div className="agent-result-empty__protocol" aria-label="分析流程">
                      <span><b>01</b>输入所问</span>
                      <span><b>02</b>盘面核验</span>
                      <span><b>03</b>结构化交付</span>
                    </div>
                    <small>输出包含：盘面依据 · 现实映射 · 可执行建议</small>
                  </div>
                ) : (
                  <div className="agent-result-empty">
                    <Sparkles />
                    <strong>{surface === "shengtian" ? "等待发起本次分析" : "访谈尚未开始"}</strong>
                    <span>{surface === "shengtian" ? "选择一个主题或写下具体问题后，Agent 会按对应盘面组织分析。" : "先回答一个问题：你现在最想改变的现实选择是什么？"}</span>
                  </div>
                )
              )}
            </ScrollArea>
          </section>
        </div>
      </TabsContent>
    </Tabs>
  );
}
