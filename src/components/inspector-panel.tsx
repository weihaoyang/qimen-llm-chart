"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { NormalizedQimenChart } from "@/lib/qimen/types";

type InspectorPanelProps = {
  chart: NormalizedQimenChart | null;
};

export function InspectorPanel({
  chart,
}: InspectorPanelProps) {
  const jsonPayload = chart ? JSON.stringify(chart.raw, null, 2) : "";

  return (
    <ScrollArea className="inspector-scroll inspector-scroll-plain">
      {chart ? (
        <pre className="json-block" suppressHydrationWarning>
          {jsonPayload}
        </pre>
      ) : (
        <div className="empty-panel">等待生成 JSON。</div>
      )}
    </ScrollArea>
  );
}
