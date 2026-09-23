"use client";

import Tabs from "@douyinfe/semi-ui/lib/es/tabs";
import type { WorkbenchMode } from "@/lib/workbench/types";

type ModeTabsProps = {
  mode: WorkbenchMode;
  onChange: (mode: WorkbenchMode) => void;
  classicActive?: "daliuren" | "taiyi" | null;
  onClassicSelect?: (kind: "daliuren" | "taiyi") => void;
};

const MODE_OPTIONS: Array<{
  value: WorkbenchMode;
  label: string;
}> = [
  { value: "qimen", label: "奇门" },
  { value: "bazi", label: "八字" },
  { value: "ziwei", label: "紫微" },
  { value: "combined", label: "三盘联合" },
  { value: "research", label: "人生 K 线" },
];

export function ModeTabs({ mode, onChange, classicActive = null, onClassicSelect }: ModeTabsProps) {
  return (
    <Tabs
      className="workbench-tabs"
      activeKey={classicActive ?? mode}
      onChange={(value) => {
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
      <Tabs.TabPane itemKey="daliuren" tab={<strong>大六壬</strong>} />
      <Tabs.TabPane itemKey="taiyi" tab={<strong>太乙</strong>} />
    </Tabs>
  );
}
