"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Position } from "3meta";
import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaziPanel } from "@/components/bazi-panel";
import { DEFAULT_AGENT_QUESTIONS } from "@/lib/agent/chat";
import { serializeBaziToCompactJson, serializeBaziToStructuredText } from "@/lib/bazi/serializer";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import {
  serializeCombinedToCompactJson,
  serializeCombinedToStructuredText,
} from "@/lib/combined/serializer";
import {
  getDefaultProfileInput,
  normalizeProfileInput,
  type NormalizedProfileInput,
  type ProfileInput,
} from "@/lib/profile";
import { getDefaultSequenceInput } from "@/lib/qimen/defaults";
import { buildQimenChartFromProfile } from "@/lib/qimen/chart";
import { DEFAULT_QIMEN_SETTINGS, type QimenSettings } from "@/lib/qimen/settings";
import {
  serializeChartToCompactJson,
  serializeSequenceToCompactJson,
  serializeChartToStructuredText,
} from "@/lib/qimen/serializer";
import {
  buildChartSequence,
  type ChartSequenceInput,
  type ChartSequenceItem,
  type SequenceStep,
} from "@/lib/qimen/sequence";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import type { WorkbenchMode } from "@/lib/workbench/types";
import { buildZiweiChartFromProfile } from "@/lib/ziwei/chart";
import {
  serializeZiweiToCompactJson,
  serializeZiweiToStructuredText,
} from "@/lib/ziwei/serializer";
import { resolvePlatformClientConfig } from "@/lib/platform/config";
import {
  createGuestCheckout,
  createGuestPaymentAttempt,
} from "@/lib/platform/browser";
import { popCompletedPaidAnalysis, savePendingPaidAnalysis } from "@/lib/platform/pending-analysis";
import type { NormalizedZiweiChart } from "@/lib/ziwei/types";
import { ChartForm } from "./chart-form";
import { CombinedPanel } from "./combined-panel";
import { InspectorPanel } from "./inspector-panel";
import { MetadataPanel } from "./metadata-panel";
import { PalaceGrid } from "./palace-grid";
import { SummaryStrip } from "./summary-strip";
import { ModeTabs } from "./workbench/mode-tabs";

const ZiweiPanel = dynamic(
  () => import("./ziwei-panel").then((module) => module.ZiweiPanel),
  {
    ssr: false,
    loading: () => <div className="empty-panel">紫微盘加载中。</div>,
  },
);

type AgentModeState = {
  question: string;
  content: string;
  model: string | null;
  error: string | null;
  loading: boolean;
};

const createInitialAgentState = (): Record<WorkbenchMode, AgentModeState> => ({
  qimen: {
    question: DEFAULT_AGENT_QUESTIONS.qimen,
    content: "",
    model: null,
    error: null,
    loading: false,
  },
  bazi: {
    question: DEFAULT_AGENT_QUESTIONS.bazi,
    content: "",
    model: null,
    error: null,
    loading: false,
  },
  ziwei: {
    question: DEFAULT_AGENT_QUESTIONS.ziwei,
    content: "",
    model: null,
    error: null,
    loading: false,
  },
  combined: {
    question: DEFAULT_AGENT_QUESTIONS.combined,
    content: "",
    model: null,
    error: null,
    loading: false,
  },
});

type GeneratedWorkbenchCharts = {
  normalizedProfile: NormalizedProfileInput;
  qimenChart: NormalizedQimenChart;
  baziChart: NormalizedBaziChart;
  ziweiChart: NormalizedZiweiChart;
};

const MODE_META: Record<
  WorkbenchMode,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  qimen: {
    label: "奇门排盘与序列",
    title: "奇门主盘",
    description: "九宫 / 序列 / 输出",
  },
  bazi: {
    label: "八字传统排盘",
    title: "八字排盘",
    description: "四柱 / 藏干 / 起运",
  },
  ziwei: {
    label: "紫微斗数盘面",
    title: "紫微盘面",
    description: "十二宫 / 星曜 / 四化",
  },
  combined: {
    label: "三盘联合聚合",
    title: "三盘联合",
    description: "统一输入 / 材料聚合 / JSON",
  },
};

const buildWorkbenchCharts = (
  input: ProfileInput,
  qimenSettings: QimenSettings,
): GeneratedWorkbenchCharts => {
  const inputWithQimenSettings = {
    ...input,
    qimenSettings,
  };
  const normalizedProfile = normalizeProfileInput(inputWithQimenSettings);

  return {
    normalizedProfile,
    qimenChart: buildQimenChartFromProfile(normalizedProfile),
    baziChart: buildBaziChartFromProfile(normalizedProfile),
    ziweiChart: buildZiweiChartFromProfile(normalizedProfile),
  };
};

const getInitialState = () => {
  const now = new Date();
  const defaultInput = getDefaultProfileInput(now);
  const defaultQimenSettings = defaultInput.qimenSettings ?? DEFAULT_QIMEN_SETTINGS;
  const defaultSequenceInput = getDefaultSequenceInput(now, defaultInput.timeZone);

  try {
    const charts = buildWorkbenchCharts(defaultInput, defaultQimenSettings);
    return {
      defaultInput,
      defaultQimenSettings,
      defaultSequenceInput,
      ...charts,
      error: null as string | null,
    };
  } catch (nextError) {
    return {
      defaultInput,
      defaultQimenSettings,
      defaultSequenceInput,
      normalizedProfile: normalizeProfileInput({
        ...defaultInput,
        qimenSettings: defaultQimenSettings,
      }),
      qimenChart: null,
      baziChart: null,
      ziweiChart: null,
      error: nextError instanceof Error ? nextError.message : "生成排盘失败。",
    };
  }
};

const toProfileFromSequenceInput = (
  source: ProfileInput,
  nextInput: ChartSequenceInput,
): ProfileInput => ({
  calendarMode: "solar",
  datetime: nextInput.startDatetime,
  timeZone: nextInput.timeZone,
  gender: source.gender,
  timeBasis: source.timeBasis,
  location: source.location,
  solar: {
    year: Number(nextInput.startDatetime.slice(0, 4)),
    month: Number(nextInput.startDatetime.slice(5, 7)),
    day: Number(nextInput.startDatetime.slice(8, 10)),
    hour: Number(nextInput.startDatetime.slice(11, 13)),
    minute: Number(nextInput.startDatetime.slice(14, 16)),
  },
});

const hasValidTrueSolarLongitude = (input: ProfileInput) =>
  input.timeBasis !== "true-solar" ||
  (typeof input.location?.longitude === "number" &&
    Number.isFinite(input.location.longitude) &&
    input.location.longitude >= -180 &&
    input.location.longitude <= 180);

export function AppShell() {
  const [initialState] = useState(getInitialState);
  const [mode, setMode] = useState<WorkbenchMode>("qimen");
  const [formState, setFormState] = useState<ProfileInput>(initialState.defaultInput);
  const [qimenSettings, setQimenSettings] = useState<QimenSettings>(
    initialState.defaultQimenSettings,
  );
  const [sequenceFormState, setSequenceFormState] = useState<ChartSequenceInput>(
    initialState.defaultSequenceInput,
  );
  const [normalizedProfile, setNormalizedProfile] = useState<NormalizedProfileInput>(
    initialState.normalizedProfile,
  );
  const [qimenChart, setQimenChart] = useState<NormalizedQimenChart | null>(
    initialState.qimenChart,
  );
  const [baziChart, setBaziChart] = useState<NormalizedBaziChart | null>(
    initialState.baziChart,
  );
  const [ziweiChart, setZiweiChart] = useState<NormalizedZiweiChart | null>(
    initialState.ziweiChart,
  );
  const [sequence, setSequence] = useState<ChartSequenceItem[]>([]);
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState(0);
  const [error, setError] = useState<string | null>(initialState.error);
  const [selectedPalace, setSelectedPalace] = useState<Position | null>(
    initialState.qimenChart?.raw.palaces[0]?.position ?? null,
  );
  const [copyState, setCopyState] = useState<"idle" | "text" | "json">("idle");
  const [agentState, setAgentState] = useState(createInitialAgentState);
  const [agentOpen, setAgentOpen] = useState(false);
  const [quickChartMode, setQuickChartMode] = useState<"single" | "series">("single");
  const [platformCheckoutLoading, setPlatformCheckoutLoading] = useState<string | null>(null);
  const [isNarrowLayout, setIsNarrowLayout] = useState(false);
  const [resizablePanelsReady, setResizablePanelsReady] = useState(false);
  const platformSelectedChannel = "alipay";

  const activeQimenChart = sequence[selectedSequenceIndex]?.chart ?? qimenChart;
  const activeModeMeta = MODE_META[mode];
  const platformConfig = useMemo(() => resolvePlatformClientConfig(), []);

  const qimenStructuredText = useMemo(() => {
    if (!activeQimenChart) {
      return "";
    }

    return serializeChartToStructuredText(activeQimenChart, selectedPalace);
  }, [activeQimenChart, selectedPalace]);

  const baziStructuredText = useMemo(
    () => (baziChart ? serializeBaziToStructuredText(baziChart) : ""),
    [baziChart],
  );
  const ziweiStructuredText = useMemo(
    () => (ziweiChart ? serializeZiweiToStructuredText(ziweiChart) : ""),
    [ziweiChart],
  );

  const structuredText = useMemo(() => {
    switch (mode) {
      case "qimen":
        return qimenStructuredText;
      case "bazi":
        return baziStructuredText;
      case "ziwei":
        return ziweiStructuredText;
      case "combined":
        return serializeCombinedToStructuredText({
          input: normalizedProfile,
          qimen: qimenChart
            ? {
                format: "qmdj-llm-compact-v1",
                payload: JSON.parse(serializeChartToCompactJson(qimenChart)),
                structuredText: serializeChartToStructuredText(qimenChart),
              }
            : undefined,
          bazi: baziChart
            ? {
                format: "bazi-llm-compact-v1",
                payload: JSON.parse(serializeBaziToCompactJson(baziChart)),
                structuredText: baziStructuredText,
              }
            : undefined,
          ziwei: ziweiChart
            ? {
                format: "ziwei-llm-compact-v1",
                payload: JSON.parse(serializeZiweiToCompactJson(ziweiChart)),
                structuredText: ziweiStructuredText,
              }
            : undefined,
        });
    }
  }, [
    mode,
    normalizedProfile,
    qimenChart,
    baziChart,
    ziweiChart,
    qimenStructuredText,
    baziStructuredText,
    ziweiStructuredText,
  ]);

  const jsonPayload = useMemo(() => {
    switch (mode) {
      case "qimen":
        if (sequence.length > 0) {
          return serializeSequenceToCompactJson(sequence);
        }

        return activeQimenChart ? serializeChartToCompactJson(activeQimenChart) : "";
      case "bazi":
        return baziChart ? serializeBaziToCompactJson(baziChart) : "";
      case "ziwei":
        return ziweiChart ? serializeZiweiToCompactJson(ziweiChart) : "";
      case "combined":
        return serializeCombinedToCompactJson({
          input: normalizedProfile,
          qimen: qimenChart
            ? {
                format: "qmdj-llm-compact-v1",
                payload: JSON.parse(serializeChartToCompactJson(qimenChart)),
              }
            : undefined,
          bazi: baziChart
            ? {
                format: "bazi-llm-compact-v1",
                payload: JSON.parse(serializeBaziToCompactJson(baziChart)),
              }
            : undefined,
          ziwei: ziweiChart
            ? {
                format: "ziwei-llm-compact-v1",
                payload: JSON.parse(serializeZiweiToCompactJson(ziweiChart)),
              }
            : undefined,
        });
    }
  }, [mode, sequence, activeQimenChart, normalizedProfile, qimenChart, baziChart, ziweiChart]);

  const applyWorkbenchCharts = (
    nextInput: ProfileInput,
    nextSettings: QimenSettings,
    options?: {
      nextSequence?: ChartSequenceItem[];
      nextSelectedSequenceIndex?: number;
    },
  ) => {
    const nextCharts = buildWorkbenchCharts(nextInput, nextSettings);
    const resolvedSequence = options?.nextSequence ?? [];
    const resolvedSequenceIndex =
      options?.nextSelectedSequenceIndex !== undefined
        ? Math.min(options.nextSelectedSequenceIndex, Math.max(resolvedSequence.length - 1, 0))
        : 0;
    const nextActiveChart =
      resolvedSequence[resolvedSequenceIndex]?.chart ?? nextCharts.qimenChart;

    setNormalizedProfile(nextCharts.normalizedProfile);
    setQimenChart(nextCharts.qimenChart);
    setBaziChart(nextCharts.baziChart);
    setZiweiChart(nextCharts.ziweiChart);
    setSequence(resolvedSequence);
    setSelectedSequenceIndex(resolvedSequence.length > 0 ? resolvedSequenceIndex : 0);
    setSelectedPalace((current) =>
      current && nextActiveChart.palaceMap[current]
        ? current
        : nextActiveChart.raw.palaces[0]?.position ?? null,
    );
    setAgentState((current) => ({
      qimen: { ...current.qimen, content: "", model: null, error: null, loading: false },
      bazi: { ...current.bazi, content: "", model: null, error: null, loading: false },
      ziwei: { ...current.ziwei, content: "", model: null, error: null, loading: false },
      combined: { ...current.combined, content: "", model: null, error: null, loading: false },
    }));
    setError(null);
  };

  const handleGenerate = (nextInput: ProfileInput) => {
    setFormState(nextInput);
    setCopyState("idle");

    if (!hasValidTrueSolarLongitude(nextInput)) {
      setError("真太阳时需要填写有效的出生地经度（-180° 至 180°）。");
      return;
    }

    try {
      applyWorkbenchCharts(nextInput, qimenSettings);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "生成排盘失败。");
      setQimenChart(null);
      setBaziChart(null);
      setZiweiChart(null);
      setSequence([]);
      setSelectedSequenceIndex(0);
    }
  };

  const handleGenerateSequence = (nextInput: ChartSequenceInput) => {
    setCopyState("idle");

    if (!hasValidTrueSolarLongitude(formState)) {
      setError("真太阳时需要填写有效的出生地经度（-180° 至 180°）。");
      return;
    }

    try {
      const nextProfile = toProfileFromSequenceInput(formState, nextInput);
      const nextSequence = buildChartSequence(nextInput, qimenSettings);
      setMode("qimen");
      setSequenceFormState(nextInput);
      setFormState(nextProfile);
      applyWorkbenchCharts(nextProfile, qimenSettings, {
        nextSequence,
        nextSelectedSequenceIndex: 0,
      });
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

  const handleQimenSettingsChange = (nextSettings: QimenSettings) => {
    setQimenSettings(nextSettings);
    setCopyState("idle");

    try {
      const nextSequence =
        sequence.length > 0 ? buildChartSequence(sequenceFormState, nextSettings) : [];

      applyWorkbenchCharts(formState, nextSettings, {
        nextSequence,
        nextSelectedSequenceIndex: selectedSequenceIndex,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "更新排盘口径失败。");
      setSequence([]);
      setSelectedSequenceIndex(0);
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
    if (!jsonPayload) {
      return;
    }

    await navigator.clipboard.writeText(jsonPayload);
    setCopyState("json");
  };

  const handleAgentQuestionChange = (value: string) => {
    setAgentState((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        question: value,
      },
    }));
  };

  const handleAgentAnalyze = async () => {
    if (!structuredText || !jsonPayload) {
      return;
    }

    const currentQuestion = agentState[mode].question;
    const planCode = "shengtian-banzi-analysis-1";
    if (!platformConfig || typeof window === "undefined") {
      setAgentState((current) => ({ ...current, [mode]: { ...current[mode], error: "支付暂不可用。" } }));
      return;
    }
    setAgentState((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        loading: true,
        error: null,
      },
    }));

    try {
      setPlatformCheckoutLoading(planCode);
      const checkout = await createGuestCheckout(planCode, platformSelectedChannel);
      savePendingPaidAnalysis({
        orderId: checkout.order.order_id,
        checkoutToken: checkout.checkout_token,
        mode,
        question: currentQuestion,
        structuredText,
        jsonPayload,
        createdAt: Date.now(),
      });
      const payment = await createGuestPaymentAttempt(
        checkout,
        platformSelectedChannel,
        `${window.location.origin}/billing/result?order_id=${encodeURIComponent(checkout.order.order_id)}&product_code=${encodeURIComponent(platformConfig.productCode)}`,
      );
      if (!payment.provider_checkout_url) throw new Error("无法打开支付页面。");
      window.location.assign(payment.provider_checkout_url);
    } catch (nextError) {
      setAgentState((current) => ({
        ...current,
        [mode]: {
          ...current[mode],
          error: nextError instanceof Error ? nextError.message : "AI 分析失败。",
          loading: false,
        },
      }));
    } finally {
      setPlatformCheckoutLoading(null);
    }
  };

  useEffect(() => {
    const completed = popCompletedPaidAnalysis();
    if (!completed) return;
    setMode(completed.mode);
    setAgentState((current) => ({
      ...current,
      [completed.mode]: {
        ...current[completed.mode],
        content: completed.content,
        model: completed.model,
        error: null,
        loading: false,
      },
    }));
  }, []);

  useEffect(() => {
    setResizablePanelsReady(typeof ResizeObserver !== "undefined");

    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1180px)");
    const syncLayout = () => setIsNarrowLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  const workbenchCanvas = (
    <section className="canvas-panel" data-mode={mode}>
      {mode === "qimen" && activeQimenChart ? <SummaryStrip chart={activeQimenChart} /> : null}

      <div
        className={
          mode === "qimen" && sequence.length > 0
            ? "canvas-panel__content has-sequence"
            : "canvas-panel__content"
        }
      >
        {mode === "qimen" ? (
          <>
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

            {activeQimenChart ? (
              <PalaceGrid
                chart={activeQimenChart}
                selectedPalace={selectedPalace}
                onSelectPalace={setSelectedPalace}
              />
            ) : (
              <div className="empty-panel">等待生成盘面。</div>
            )}
          </>
        ) : null}

        {mode === "bazi" ? <BaziPanel chart={baziChart} /> : null}

        {mode === "ziwei" ? <ZiweiPanel value={formState} /> : null}

        {mode === "combined" ? (
          <CombinedPanel
            baziChart={baziChart}
            input={normalizedProfile}
            qimenChart={qimenChart}
            ziweiChart={ziweiChart}
          />
        ) : null}
      </div>
    </section>
  );

  const workbenchSidebar = (
    <aside className="sidebar-panel" data-mode={mode}>
      {mode === "qimen" ? (
        <section className="sidebar-quick-controls" aria-label="快速排盘">
          <div className="sidebar-quick-controls__heading">
            <div>
              <span>快速排盘</span>
              <small>单张 / 序列</small>
            </div>
            <div className="quick-chart-toggle" role="tablist" aria-label="排盘类型">
              <button
                type="button"
                className={quickChartMode === "single" ? "is-active" : ""}
                role="tab"
                aria-selected={quickChartMode === "single"}
                onClick={() => setQuickChartMode("single")}
              >
                单张
              </button>
              <button
                type="button"
                className={quickChartMode === "series" ? "is-active" : ""}
                role="tab"
                aria-selected={quickChartMode === "series"}
                onClick={() => setQuickChartMode("series")}
              >
                序列
              </button>
            </div>
          </div>
          {quickChartMode === "single" ? (
            <>
              <label className="sidebar-quick-controls__field sidebar-quick-controls__field--wide">
                <span>自选时间</span>
                <Input
                  aria-label="自选时间"
                  type="datetime-local"
                  value={formState.datetime}
                  onChange={(event) => setFormState({ ...formState, datetime: event.target.value })}
                />
              </label>
              <div className="sidebar-quick-controls__actions">
                <Button
                  className="command-button command-button-primary"
                  type="button"
                  onClick={() => handleGenerate(formState)}
                >
                  生成单张盘
                </Button>
              </div>
            </>
          ) : (
            <>
              <label className="sidebar-quick-controls__field">
                <span>序列开始</span>
                <Input
                  aria-label="序列开始"
                  type="datetime-local"
                  value={sequenceFormState.startDatetime}
                  onChange={(event) =>
                    setSequenceFormState({ ...sequenceFormState, startDatetime: event.target.value })
                  }
                />
              </label>
              <label className="sidebar-quick-controls__field">
                <span>序列结束</span>
                <Input
                  aria-label="序列结束"
                  type="datetime-local"
                  value={sequenceFormState.endDatetime}
                  onChange={(event) =>
                    setSequenceFormState({ ...sequenceFormState, endDatetime: event.target.value })
                  }
                />
              </label>
              <label className="sidebar-quick-controls__field sidebar-quick-controls__field--wide">
                <span>指定间隔</span>
                <select
                  className="control-select sidebar-quick-controls__select"
                  value={sequenceFormState.step}
                  onChange={(event) =>
                    setSequenceFormState({
                      ...sequenceFormState,
                      step: event.target.value as SequenceStep,
                    })
                  }
                >
                  <option value="double-hour">时辰 / 2小时</option>
                  <option value="day">天 / 1天</option>
                </select>
              </label>
              <div className="sidebar-quick-controls__actions">
                <Button
                  className="command-button command-button-primary"
                  type="button"
                  onClick={() => handleGenerateSequence(sequenceFormState)}
                >
                  生成系列盘
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      <details className="workspace-disclosure workspace-disclosure--compact" open>
        <summary>
          <span>调整盘面</span>
          <small>时间、历法与排盘口径</small>
        </summary>
        <ChartForm
          copyState={copyState}
          layout="sidebar"
          mode={mode}
          onCopyJson={handleCopyJson}
          onCopyText={handleCopyText}
          onQimenSettingsChange={handleQimenSettingsChange}
          onSequenceSubmit={handleGenerateSequence}
          onSequenceValueChange={setSequenceFormState}
          onSubmit={handleGenerate}
          onValueChange={setFormState}
          qimenSettings={qimenSettings}
          sequenceValue={sequenceFormState}
          showCopyActions={false}
          showSequenceControls={false}
          value={formState}
        />
      </details>

      {mode === "qimen" ? (
        <details className="workspace-disclosure">
          <summary>
            <span>核验资料</span>
            <small>历法、四柱与排盘依据</small>
          </summary>
          <MetadataPanel chart={activeQimenChart} />
        </details>
      ) : null}
    </aside>
  );

  return (
    <div className="page-shell" data-mode={mode}>
      <header className="observatory-hero">
        <div className="observatory-hero__copy">
          <span className="workspace-kicker">胜天半子</span>
          <h1>{activeModeMeta.title}</h1>
        </div>

        <ModeTabs mode={mode} onChange={setMode} />

      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      {isNarrowLayout || !resizablePanelsReady ? (
        <main className="analysis-layout analysis-layout--stacked">
          {workbenchCanvas}
          {workbenchSidebar}
        </main>
      ) : (
        <Group
          id="qimen-workbench-layout"
          orientation="horizontal"
          className="analysis-layout analysis-panel-group"
          aria-label="主盘与智能分析分栏"
        >
          <Panel id="qimen-chart" defaultSize="68%" minSize="54%" className="analysis-panel">
            {workbenchCanvas}
          </Panel>
          <Separator id="qimen-workbench-separator" className="analysis-panel-divider">
            <span className="analysis-panel-divider__grip" aria-hidden="true">
              <GripVertical size={17} strokeWidth={1.8} />
            </span>
          </Separator>
          <Panel id="qimen-agent" defaultSize="32%" minSize="360px" className="analysis-panel">
            {workbenchSidebar}
          </Panel>
        </Group>
      )}

      <footer className="qmdj-footer">
        <div className="qmdj-footer__brand">
          <span>胜天半子</span>
          <p>围绕真实工作做长期可用的命理工作台。</p>
        </div>
        <div className="qmdj-footer__meta">
          <span>© 2026 胜天半子</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            鄂ICP备2026026686号-1
          </a>
        </div>
      </footer>

      <button
        type="button"
        className="agent-launcher"
        onClick={() => setAgentOpen(true)}
        aria-label="打开 Agent 分析"
      >
        <span className="agent-launcher__dot" aria-hidden="true" />
        <span>Agent</span>
      </button>

      {agentOpen ? (
        <div className="agent-popover" role="dialog" aria-modal="true" aria-label="Agent 分析">
          <div className="agent-popover__chrome">
            <div>
              <span className="agent-popover__eyebrow">智能分析</span>
              <strong>Agent 分析</strong>
            </div>
            <button
              type="button"
              className="agent-popover__close"
              onClick={() => setAgentOpen(false)}
              aria-label="关闭 Agent 分析"
            >
              ×
            </button>
          </div>
          <InspectorPanel
            agentError={agentState[mode].error}
            agentLoading={agentState[mode].loading || Boolean(platformCheckoutLoading)}
            agentModel={agentState[mode].model}
            agentQuestion={agentState[mode].question}
            agentResult={agentState[mode].content}
            copyState={copyState}
            jsonPayload={jsonPayload}
            mode={mode}
            onAgentAnalyze={handleAgentAnalyze}
            onCopyJson={handleCopyJson}
            onCopyText={handleCopyText}
            onAgentQuestionChange={handleAgentQuestionChange}
            selectedPalace={mode === "qimen" ? selectedPalace : null}
            structuredText={structuredText}
          />
        </div>
      ) : null}

    </div>
  );
}
