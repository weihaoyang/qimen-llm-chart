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
  structuredText,
  jsonPayload,
  agentQuestion,
  agentResult,
  agentLoading,
  agentError,
  onAgentQuestionChange,
  onAgentAnalyze,
  selectedPalace = null,
}: InspectorPanelProps) {
  return (
    <Tabs className="inspector-tabs" defaultValue="agent">
      <div className="inspector-panel__header">
        <div>
          <span className="inspector-panel__eyebrow">Agent 分析</span>
          <h2>基于当前盘面推演</h2>
        </div>
        <span className="inspector-panel__mode-tag">单次 ¥10</span>
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
          <section className="agent-panel__section agent-panel__section--question">
            <div className="agent-panel__section-head">
              <strong>分析问题</strong>
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
              <strong>分析结果</strong>
            </div>
            <ScrollArea className="inspector-scroll inspector-scroll-plain">
              {agentResult ? (
                <pre className="agent-result" suppressHydrationWarning>
                  {agentResult}
                </pre>
              ) : (
                <div className="agent-result-empty">
                  <Sparkles />
                  <span>分析完成后，结论会显示在这里。</span>
                </div>
              )}
            </ScrollArea>
          </section>
        </div>
      </TabsContent>
    </Tabs>
  );
}
