"use client";

import { useMemo, useState } from "react";
import { buildChart } from "@/lib/qimen/chart";
import {
  serializeChartToCompactJson,
  serializeChartToStructuredText,
} from "@/lib/qimen/serializer";
import type { Position } from "3meta";
import type { NormalizedQimenChart, UserChartInput } from "@/lib/qimen/types";
import { ChartForm } from "./chart-form";
import { MetadataPanel } from "./metadata-panel";
import { InspectorPanel } from "./inspector-panel";
import { PalaceGrid } from "./palace-grid";
import { SummaryStrip } from "./summary-strip";

const DEFAULT_INPUT: UserChartInput = {
  datetime: "2026-07-01T21:30",
  timeZone: "Asia/Shanghai",
};

const getInitialState = () => {
  try {
    const chart = buildChart(DEFAULT_INPUT);
    return {
      chart,
      error: null as string | null,
    };
  } catch (nextError) {
    return {
      chart: null,
      error: nextError instanceof Error ? nextError.message : "生成排盘失败。",
    };
  }
};

export function AppShell() {
  const [formState, setFormState] = useState<UserChartInput>(DEFAULT_INPUT);
  const [initialState] = useState(getInitialState);
  const [chart, setChart] = useState<NormalizedQimenChart | null>(initialState.chart);
  const [error, setError] = useState<string | null>(initialState.error);
  const [selectedPalace, setSelectedPalace] = useState<Position | null>(
    initialState.chart?.raw.palaces[0]?.position ?? null,
  );
  const [copyState, setCopyState] = useState<"idle" | "text" | "json">("idle");

  const structuredText = useMemo(() => {
    if (!chart) {
      return "";
    }

    return serializeChartToStructuredText(chart);
  }, [chart]);

  const handleGenerate = (nextInput: UserChartInput) => {
    setFormState(nextInput);
    setCopyState("idle");

    try {
      const nextChart = buildChart(nextInput);
      setChart(nextChart);
      setSelectedPalace(nextChart.raw.palaces[0]?.position ?? null);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "生成排盘失败。");
      setChart(null);
    }
  };

  const handleCopyText = async () => {
    if (!structuredText) {
      return;
    }

    await navigator.clipboard.writeText(structuredText);
    setCopyState("text");
  };

  const handleCopyJson = async () => {
    if (!chart) {
      return;
    }

    await navigator.clipboard.writeText(serializeChartToCompactJson(chart));
    setCopyState("json");
  };

  return (
    <div className="page-shell">
      <header className="workspace-header">
        <div className="workspace-title">
          <div>
            <p className="workspace-kicker">Qimen Research Workbench</p>
            <h1>奇门遁甲盘面工作台</h1>
          </div>
        </div>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      {chart ? <SummaryStrip chart={chart} /> : null}

      <main className="analysis-layout">
        <section className="canvas-panel">
          {chart ? (
            <PalaceGrid
              chart={chart}
              selectedPalace={selectedPalace}
              onSelectPalace={setSelectedPalace}
            />
          ) : (
            <div className="empty-panel">等待生成盘面。</div>
          )}
        </section>

        <aside className="sidebar-panel">
          <ChartForm
            defaultValue={formState}
            onSubmit={handleGenerate}
            onCopyJson={handleCopyJson}
            onCopyText={handleCopyText}
            copyState={copyState}
            layout="sidebar"
          />
          <MetadataPanel chart={chart} />
          <InspectorPanel chart={chart} />
        </aside>
      </main>
    </div>
  );
}
