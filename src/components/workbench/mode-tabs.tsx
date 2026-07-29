"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkbenchMode } from "@/lib/workbench/types";

type ModeTabsProps = {
  mode: WorkbenchMode;
  onChange: (mode: WorkbenchMode) => void;
};

const MODE_OPTIONS: Array<{
  value: WorkbenchMode;
  label: string;
  kicker: string;
}> = [
  { value: "qimen", label: "奇门", kicker: "九宫" },
  { value: "bazi", label: "八字", kicker: "四柱" },
  { value: "ziwei", label: "紫微", kicker: "十二宫" },
  { value: "combined", label: "三盘联合", kicker: "合参" },
];

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <Tabs
      className="workbench-tabs"
      value={mode}
      onValueChange={(value) => onChange(value as WorkbenchMode)}
    >
      <TabsList className="workbench-tabs__list" variant="line">
        {MODE_OPTIONS.map((item) => (
          <TabsTrigger
            className="workbench-tabs__trigger"
            data-mode={item.value}
            key={item.value}
            value={item.value}
          >
            <span className="workbench-tabs__kicker">{item.kicker}</span>
            <strong>{item.label}</strong>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
