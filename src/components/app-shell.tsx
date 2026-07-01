"use client";

import { useMemo, useState } from "react";
import { buildChart } from "@/lib/qimen/chart";
import {
  serializeChartToCompactJson,
  serializeSequenceToCompactJson,
  serializeChartToStructuredText,
} from "@/lib/qimen/serializer";
import {
  buildChartSequence,
  type ChartSequenceInput,
  type ChartSequenceItem,
} from "@/lib/qimen/sequence";
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

const DEFAULT_SEQUENCE_INPUT: ChartSequenceInput = {
  startDatetime: "2026-07-01T21:30",
  endDatetime: "2026-07-02T21:30",
  timeZone: "Asia/Shanghai",
  step: "double-hour",
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
  const [singleChart, setSingleChart] = useState<NormalizedQimenChart | null>(
    initialState.chart,
  );
  const [sequence, setSequence] = useState<ChartSequenceItem[]>([]);
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState(0);
  const [error, setError] = useState<string | null>(initialState.error);
  const [selectedPalace, setSelectedPalace] = useState<Position | null>(
    initialState.chart?.raw.palaces[0]?.position ?? null,
  );
  const [copyState, setCopyState] = useState<"idle" | "text" | "json">("idle");

  const chart = sequence[selectedSequenceIndex]?.chart ?? singleChart;

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
      setSingleChart(nextChart);
      setSequence([]);
      setSelectedSequenceIndex(0);
      setSelectedPalace(nextChart.raw.palaces[0]?.position ?? null);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "生成排盘失败。");
      setSingleChart(null);
      setSequence([]);
      setSelectedSequenceIndex(0);
    }
  };

  const handleGenerateSequence = (nextInput: ChartSequenceInput) => {
    setCopyState("idle");

    try {
      const nextSequence = buildChartSequence(nextInput);
      const firstChart = nextSequence[0]?.chart ?? null;
      setSequence(nextSequence);
      setSelectedSequenceIndex(0);
      setSingleChart(firstChart);
      setFormState({
        datetime: nextInput.startDatetime,
        timeZone: nextInput.timeZone,
      });
      setSelectedPalace(firstChart?.raw.palaces[0]?.position ?? null);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "生成序列失败。");
      setSequence([]);
      setSelectedSequenceIndex(0);
    }
  };

  const handleSelectSequenceItem = (index: number) => {
    const nextChart = sequence[index]?.chart;
    setSelectedSequenceIndex(index);
    setSelectedPalace(nextChart?.raw.palaces[0]?.position ?? null);
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

    await navigator.clipboard.writeText(
      sequence.length > 0
        ? serializeSequenceToCompactJson(sequence)
        : serializeChartToCompactJson(chart),
    );
    setCopyState("json");
  };

  return (
    <div className="page-shell">
      {error ? <p className="error-banner">{error}</p> : null}

      {chart ? <SummaryStrip chart={chart} /> : null}

      <main className="analysis-layout">
        <section
          className={sequence.length > 0 ? "canvas-panel has-sequence" : "canvas-panel"}
        >
          {sequence.length > 0 ? (
            <div className="sequence-rail" aria-label="事件序列">
              {sequence.map((item) => (
                <button
                  className={
                    item.index === selectedSequenceIndex
                      ? "sequence-rail__item is-active"
                      : "sequence-rail__item"
                  }
                  key={`${item.input.datetime}-${item.index}`}
                  type="button"
                  onClick={() => handleSelectSequenceItem(item.index)}
                >
                  <span>{String(item.index + 1).padStart(2, "0")}</span>
                  <strong>{item.input.datetime}</strong>
                </button>
              ))}
            </div>
          ) : null}

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
            defaultSequenceValue={DEFAULT_SEQUENCE_INPUT}
            onSubmit={handleGenerate}
            onSequenceSubmit={handleGenerateSequence}
            onCopyJson={handleCopyJson}
            onCopyText={handleCopyText}
            copyState={copyState}
            layout="sidebar"
          />
          <MetadataPanel chart={chart} />
          <InspectorPanel chart={chart} sequence={sequence} />
        </aside>
      </main>
    </div>
  );
}
