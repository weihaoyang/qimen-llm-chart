"use client";

import Tabs from "@douyinfe/semi-ui/lib/es/tabs";
import type { WorkbenchMode } from "@/lib/workbench/types";

type ModeTabsProps = {
  mode: WorkbenchMode;
  onChange: (mode: WorkbenchMode) => void;
  product?: "shengtian" | "chart";
  klineActive?: boolean;
  onKlineSelect?: () => void;
  classicActive?: "daliuren" | "taiyi" | null;
  onClassicSelect?: (kind: "daliuren" | "taiyi") => void;
  decisionActive?: boolean;
  onDecisionSelect?: () => void;
  agentActive?: boolean;
  onAgentSelect?: () => void;
};

const MODE_OPTIONS: Array<{
  value: WorkbenchMode;
  label: string;
}> = [
  { value: "qimen", label: "奇门" },
  { value: "bazi", label: "八字" },
  { value: "ziwei", label: "紫微" },
  { value: "combined", label: "三盘联合" },
  { value: "research", label: "术数研究" },
];

export function ModeTabs({ mode, onChange, product = "shengtian", klineActive = false, onKlineSelect, classicActive = null, onClassicSelect, decisionActive = false, onDecisionSelect, agentActive = false, onAgentSelect }: ModeTabsProps) {
  return (
    <Tabs
      className="workbench-tabs"
      activeKey={product === "shengtian" && agentActive ? "agent" : product === "shengtian" && decisionActive ? "decision" : product === "shengtian" && klineActive ? "kline" : classicActive ?? mode}
      onChange={(value) => {
        if (value === "kline") {
          onKlineSelect?.();
          return;
        }
        if (value === "decision") {
          onDecisionSelect?.();
          return;
        }
        if (value === "agent") {
          onAgentSelect?.();
          return;
        }
        if (value === "daliuren" || value === "taiyi") {
          onClassicSelect?.(value);
          return;
        }
        onChange(value as WorkbenchMode);
      }}
      type="card"
    >
      {MODE_OPTIONS.map((item) => (
        <Tabs.TabPane
          itemKey={item.value}
          key={item.value}
          tab={<strong>{item.label}</strong>}
        />
      ))}
      {product === "shengtian" ? <Tabs.TabPane itemKey="kline" tab={<strong>K 线</strong>} /> : null}
      {product === "shengtian" ? <Tabs.TabPane itemKey="decision" tab={<strong>决策树</strong>} /> : null}
      {product === "shengtian" ? <Tabs.TabPane itemKey="agent" tab={<strong>Agent</strong>} /> : null}
      <Tabs.TabPane itemKey="daliuren" tab={<strong>大六壬</strong>} />
      <Tabs.TabPane itemKey="taiyi" tab={<strong>太乙</strong>} />
    </Tabs>
  );
}
