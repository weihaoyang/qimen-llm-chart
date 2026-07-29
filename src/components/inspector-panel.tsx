"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { StructuredOutput } from "@/components/structured-output";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Position } from "3meta";
import type { WorkbenchMode } from "@/lib/workbench/types";

type InspectorPanelProps = {
  mode: WorkbenchMode;
  structuredText: string;
  jsonPayload: string;
  agentQuestion: string;
  agentResult: string;
  agentModel: string | null;
  agentLoading: boolean;
  agentError: string | null;
  onAgentQuestionChange: (value: string) => void;
  onAgentAnalyze: () => void;
  selectedPalace?: Position | null;
};

export function InspectorPanel({
  mode,
  structuredText,
  jsonPayload,
  agentQuestion,
  agentResult,
  agentModel,
  agentLoading,
  agentError,
  onAgentQuestionChange,
  onAgentAnalyze,
  selectedPalace = null,
}: InspectorPanelProps) {
  const modeLabel: Record<WorkbenchMode, string> = {
    qimen: "奇门",
    bazi: "八字",
    ziwei: "紫微",
    combined: "三盘联合",
  };

  return (
    <Tabs className="inspector-tabs" defaultValue="agent">
      <div className="inspector-panel__header">
        <div>
          <span className="inspector-panel__eyebrow">Agent</span>
          <h2>{modeLabel[mode]}分析</h2>
        </div>
        <span className="inspector-panel__mode-tag">¥10 / 次</span>
      </div>

      <TabsList className="inspector-tabs__list" variant="line">
        <TabsTrigger value="agent">分析</TabsTrigger>
        <TabsTrigger value="text">盘面文本</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>

      <TabsContent className="inspector-tabs__content" value="text">
        <ScrollArea className="inspector-scroll inspector-scroll-plain">
          <StructuredOutput selectedPalace={selectedPalace} structuredText={structuredText} />
        </ScrollArea>
      </TabsContent>

      <TabsContent className="inspector-tabs__content" value="json">
        <ScrollArea className="inspector-scroll inspector-scroll-plain">
          {jsonPayload ? (
            <pre className="json-block" suppressHydrationWarning>
              {jsonPayload}
            </pre>
          ) : (
            <div className="empty-panel">等待生成 JSON。</div>
          )}
        </ScrollArea>
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
            </div>
            <label className="agent-panel__question" htmlFor="agent-question">
              <textarea
                id="agent-question"
                className="agent-panel__textarea"
                value={agentQuestion}
                onChange={(event) => onAgentQuestionChange(event.target.value)}
              />
            </label>
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
              {agentModel ? <span>{agentModel}</span> : null}
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
