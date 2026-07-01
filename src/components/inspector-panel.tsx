"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  serializeChartToCompactJson,
  serializeSequenceToCompactJson,
} from "@/lib/qimen/serializer";
import type { ChartSequenceItem } from "@/lib/qimen/sequence";
import type { NormalizedQimenChart } from "@/lib/qimen/types";

type InspectorPanelProps = {
  chart: NormalizedQimenChart | null;
  sequence?: ChartSequenceItem[];
};

export function InspectorPanel({
  chart,
  sequence = [],
}: InspectorPanelProps) {
  const jsonPayload =
    sequence.length > 0
      ? serializeSequenceToCompactJson(sequence)
      : chart
        ? serializeChartToCompactJson(chart)
        : "";

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
