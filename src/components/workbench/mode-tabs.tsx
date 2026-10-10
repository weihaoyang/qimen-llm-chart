"use client";

import { useEffect } from "react";
import Tabs from "@douyinfe/semi-ui/lib/es/tabs";
import type { WorkbenchMode } from "@/lib/workbench/types";

type ModeTabsProps = {
  mode: WorkbenchMode;
  onChange: (mode: WorkbenchMode) => void;
  classicActive?: "daliuren" | null;
  onClassicSelect?: (kind: "daliuren") => void;
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
  { value: "astro", label: "星盘" },
  { value: "human-design", label: "人类图" },
  { value: "tarot", label: "塔罗牌" },
  { value: "fourth-way", label: "第四道" },
  { value: "harmonic", label: "泛音星盘" },
  { value: "huangji", label: "皇极经世" },
  { value: "qizheng", label: "七政四余" },
  { value: "sacred-geometry", label: "神圣几何" },
  { value: "runes", label: "卢恩符文" },
  { value: "uranian", label: "汉堡学派" },
  { value: "maya", label: "玛雅历法" },
  { value: "vedic", label: "吠陀分盘" },
  { value: "qabalah", label: "赫尔墨斯卡巴拉" },
  { value: "taiyi-shenshu", label: "太乙神数" },
  { value: "akasha", label: "阿卡西 · 全息" },
  { value: "ziwei-flying", label: "紫微飞星" },
];

export function ModeTabs({ mode, onChange, classicActive = null, onClassicSelect }: ModeTabsProps) {
  const activeKey = classicActive ?? mode;

  // The tab strip scrolls horizontally once the modes outgrow one row, so keep
  // the active tab in view after a mode change (deep links, restores, resets).
  // `scrollIntoView` is absent in jsdom and in some embedded webviews.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.querySelectorAll<HTMLElement>(".workbench-tabs").forEach((host) => {
      const active = host.querySelector<HTMLElement>(".semi-tabs-tab-active");
      if (typeof active?.scrollIntoView === "function") active.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }, [activeKey]);

  return (
    <Tabs
      className="workbench-tabs"
      activeKey={activeKey}
      onChange={(value) => {
        if (value === "daliuren") {
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
    </Tabs>
  );
}
