"use client";

import { Clipboard, FileJson2, LoaderCircle, Sparkles } from "lucide-react";
import { StructuredOutput } from "@/components/structured-output";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentAnalysisAngle } from "@/lib/agent/chat";
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
  };
  const literatureTitle = mode === "combined" ? "联合模式 · 八字原始文献" : "八字原始文献上下文";
  const literatureEmptyMessage =
    mode === "combined"
      ? "当前联合模式还没有可匹配的八字文献摘录。"
      : "切换到八字或三盘联合后，这里会显示按问题匹配的原文摘录。";
  const selectedAngle = agentAngles.find((angle) => angle.question === agentQuestion);

  return (
    <Tabs className="inspector-tabs" defaultValue="agent">
      <div className="inspector-panel__header">
        <div>
          <span className="inspector-panel__eyebrow">Agent</span>
          <h2>{modeLabel[mode]}分析</h2>
        </div>
      </div>

      <TabsList className="inspector-tabs__list" variant="line">
        <TabsTrigger value="agent">分析</TabsTrigger>
        <TabsTrigger value="text">盘面文本</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="literature">文献</TabsTrigger>
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
          <section className="agent-panel__hero">
            <div className="agent-panel__hero-main">
              <span>当前模式</span>
              <strong>{modeLabel[mode]}</strong>
            </div>
            <div className="agent-panel__hero-side">
              <div>
                <span>购买方式</span>
                <strong>无需登录</strong>
              </div>
              <div>
                <span>执行方式</span>
                <strong>支付后自动分析一次</strong>
              </div>
            </div>
          </section>

          <section className="agent-panel__section agent-panel__section--question">
            <div className="agent-panel__section-head">
              <strong>问题</strong>
              <span>先选角度，再补充你的具体问题</span>
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
            {selectedAngle ? (
              <div className="agent-panel__angle-detail" aria-label="当前分析依据">
                <div className="agent-panel__angle-detail-head">
                  <span>本次分析会优先核对</span>
                  <strong>{selectedAngle.label}</strong>
                </div>
                <p>{selectedAngle.description}</p>
                <div className="agent-panel__evidence">
                  {selectedAngle.evidence.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="agent-panel__angle-detail agent-panel__angle-detail--custom" aria-label="自定义分析说明">
                <div className="agent-panel__angle-detail-head">
                  <span>自定义问题</span>
                  <strong>按证据链回答</strong>
                </div>
                <p>模型会先核对问题对应的盘面字段，再区分事实、传统推断和待验证假设；缺少字段时会明确标出材料不足。</p>
              </div>
            )}
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
          </section>

          <div className="agent-panel__toolbar">
            <Button
              className="command-button command-button-primary"
              type="button"
              onClick={onAgentAnalyze}
              disabled={agentLoading || !structuredText || !jsonPayload}
            >
              {agentLoading ? <LoaderCircle className="agent-spin" /> : <Sparkles />}
              {agentLoading ? "正在打开支付" : "支付 ¥10 并分析"}
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
              {agentResult ? (
                <pre className="agent-result" suppressHydrationWarning>
                  {agentResult}
                </pre>
              ) : (
                <div className="agent-result-empty">
                  <Sparkles />
                  <span>等待分析结果</span>
                </div>
              )}
            </ScrollArea>
          </section>
        </div>
      </TabsContent>
    </Tabs>
  );
}
