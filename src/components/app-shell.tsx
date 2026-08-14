"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Position } from "3meta";
import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaziPanel } from "@/components/bazi-panel";
import {
  AGENT_ANALYSIS_ANGLES,
  AGENT_FOLLOW_UP_QUESTIONS,
  AGENT_INTERVIEW_START_LABEL,
  AGENT_INTERVIEW_START_QUESTION,
  DEFAULT_AGENT_QUESTIONS,
  type AgentConversationMessage,
} from "@/lib/agent/chat";
import { selectBaziClassicsContext } from "@/lib/agent/bazi-classics";
import { serializeBaziToCompactJson, serializeBaziToStructuredText } from "@/lib/bazi/serializer";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { buildBaziCompatibility } from "@/lib/bazi/compatibility";
import {
  serializeCombinedToCompactJson,
  serializeCombinedToStructuredText,
} from "@/lib/combined/serializer";
import {
  getDefaultProfileInput,
  normalizeProfileInput,
  shiftDateTimeInput,
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
  buildChartSequenceByCount,
  type ChartSequenceInput,
  type ChartSequenceItem,
  type SequenceStep,
} from "@/lib/qimen/sequence";
import { buildQimenKline, type KlineKind, type KlineScale } from "@/lib/qimen/kline";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import type { WorkbenchMode } from "@/lib/workbench/types";
import { DateTimeStepper } from "@/components/datetime-stepper";
import { buildZiweiChartFromProfile } from "@/lib/ziwei/chart";
import {
  serializeZiweiToCompactJson,
  serializeZiweiToStructuredText,
} from "@/lib/ziwei/serializer";
import { buildPlatformOAuthLoginUrl, resolvePlatformClientConfig } from "@/lib/platform/config";
import {
  createAccountCheckout,
  createGuestCheckout,
  createGuestPaymentAttempt,
  fetchPlatformUsage,
  listPlatformPlans,
  redeemInvitationCode,
  restorePlatformAccessState,
  createPlatformOAuthRequest,
  savePlatformOAuthRequest,
} from "@/lib/platform/browser";
import { createPlatformClient } from "@/lib/platform/client";
import { loadPlatformSession, clearPlatformSession } from "@/lib/platform/session";
import { AGENT_PLAN_CODE, KLINE_PLAN_CODE } from "@/lib/platform/contracts";
import type { PlanCatalogItem, PlatformProfile, PlatformSession } from "@singularity-sequence/web-sdk";
import {
  AGENT_SESSION_TURNS,
  loadActiveAgentSession,
  loadKlineAiResult,
  popCompletedPaidAnalysis,
  clearActiveAgentSession,
  saveKlineAiResult,
  saveActiveAgentSession,
  savePendingPaidAnalysis,
} from "@/lib/platform/pending-analysis";
import type { NormalizedZiweiChart } from "@/lib/ziwei/types";
import { buildLifeTrendData, lifeTrendToKlineSeries } from "@/lib/research/trend";
import { buildDaliurenResearch, buildTaiyiResearch } from "@/lib/research/extensions";
import { buildQimenReferenceVerification, buildVerificationData } from "@/lib/research/verification";
import type { ResearchTool, ResearchWorkspaceData, VerificationRow } from "@/lib/research/types";
import { ChartForm } from "./chart-form";
import { InspectorPanel } from "./inspector-panel";
import { PalaceGrid } from "./palace-grid";
import { SummaryStrip } from "./summary-strip";
import { ResearchPanel } from "./research-panel";
import { KlinePanel } from "./kline-panel";
import { ObservationJournal } from "./observation-journal";
import { ClassicObservatoryPanel } from "./classic-observatory-panel";
import { DecisionTreePanel } from "./decision-tree-panel";
import { AgentCommandCenter } from "./agent-command-center";
import { BaziCompatibilityPanel } from "./bazi-compatibility-panel";
import { AdminInvitationPanel } from "./admin-invitation-panel";
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
  focus: string;
  content: string;
  model: string | null;
  error: string | null;
  loading: boolean;
  conversation: AgentConversationMessage[];
  orderId: string;
  checkoutToken: string;
  usageAvailable: number;
  usageConsumed: number;
  totalTurns: number;
  sessionStructuredText: string;
  sessionJsonPayload: string;
  authMode: "account" | "guest";
};

type PlatformWorkspaceState = {
  status: "checking" | "guest" | "authenticated" | "error";
  /** The catalog is separate from identity: a transient catalog failure must
   * never masquerade as a genuinely unavailable payment provider. */
  catalogStatus: "loading" | "ready" | "error";
  session: PlatformSession | null;
  profile: PlatformProfile | null;
  gate: { allowed: boolean; mode: string; reason_code: string; message: string } | null;
  usage: { available: number; reserved: number; consumed: number } | null;
  plans: PlanCatalogItem[];
  channels: Array<{ channel: string; ready: boolean; reason_code: string; message: string }>;
  error: string | null;
};

const createInitialAgentState = (): Record<WorkbenchMode, AgentModeState> => ({
  qimen: {
    question: "",
    focus: "人生议题访谈",
    content: "",
    model: null,
    error: null,
    loading: false,
    conversation: [],
    orderId: "",
    checkoutToken: "",
    usageAvailable: 0,
    usageConsumed: 0,
    totalTurns: AGENT_SESSION_TURNS,
    sessionStructuredText: "",
    sessionJsonPayload: "",
    authMode: "guest",
  },
  bazi: {
    question: DEFAULT_AGENT_QUESTIONS.bazi,
    focus: "按问题综合取证",
    content: "",
    model: null,
    error: null,
    loading: false,
    conversation: [],
    orderId: "",
    checkoutToken: "",
    usageAvailable: 0,
    usageConsumed: 0,
    totalTurns: AGENT_SESSION_TURNS,
    sessionStructuredText: "",
    sessionJsonPayload: "",
    authMode: "guest",
  },
  ziwei: {
    question: DEFAULT_AGENT_QUESTIONS.ziwei,
    focus: "按问题综合取证",
    content: "",
    model: null,
    error: null,
    loading: false,
    conversation: [],
    orderId: "",
    checkoutToken: "",
    usageAvailable: 0,
    usageConsumed: 0,
    totalTurns: AGENT_SESSION_TURNS,
    sessionStructuredText: "",
    sessionJsonPayload: "",
    authMode: "guest",
  },
  combined: {
    question: DEFAULT_AGENT_QUESTIONS.combined,
    focus: "按问题综合取证",
    content: "",
    model: null,
    error: null,
    loading: false,
    conversation: [],
    orderId: "",
    checkoutToken: "",
    usageAvailable: 0,
    usageConsumed: 0,
    totalTurns: AGENT_SESSION_TURNS,
    sessionStructuredText: "",
    sessionJsonPayload: "",
    authMode: "guest",
  },
  research: {
    question: DEFAULT_AGENT_QUESTIONS.research,
    focus: "按问题综合取证",
    content: "",
    model: null,
    error: null,
    loading: false,
    conversation: [],
    orderId: "",
    checkoutToken: "",
    usageAvailable: 0,
    usageConsumed: 0,
    totalTurns: AGENT_SESSION_TURNS,
    sessionStructuredText: "",
    sessionJsonPayload: "",
    authMode: "guest",
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
  research: {
    label: "术数研究工具",
    title: "术数研究",
    description: "趋势 / 核验 / 六壬 / 太乙",
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

const HYDRATION_SAFE_DATE = new Date("2000-01-01T12:00:00.000Z");
const HYDRATION_SAFE_TIME_ZONE = "Asia/Shanghai";

const getInitialState = (now = HYDRATION_SAFE_DATE, timeZone = HYDRATION_SAFE_TIME_ZONE) => {
  const defaultInput = getDefaultProfileInput(now, timeZone);
  const defaultQimenSettings = defaultInput.qimenSettings ?? DEFAULT_QIMEN_SETTINGS;
  const defaultSequenceInput = getDefaultSequenceInput(now, timeZone);

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

const formatSequenceDateTime = (value: Date) => {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}T${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
};

const syncSequenceWindowToStart = (sequence: ChartSequenceInput, startDatetime: string): ChartSequenceInput => {
  const oldStart = Date.parse(`${sequence.startDatetime}:00Z`);
  const oldEnd = Date.parse(`${sequence.endDatetime}:00Z`);
  const duration = Number.isFinite(oldStart) && Number.isFinite(oldEnd) && oldEnd >= oldStart
    ? oldEnd - oldStart
    : 24 * 60 * 60 * 1000;
  const nextStart = Date.parse(`${startDatetime}:00Z`);
  const nextEnd = Number.isFinite(nextStart) ? formatSequenceDateTime(new Date(nextStart + duration)) : startDatetime;
  return { ...sequence, startDatetime, endDatetime: nextEnd };
};

type ProductSurface = "shengtian" | "chart";

type AppShellProps = {
  product?: ProductSurface;
};

export function AppShell({ product = "shengtian" }: AppShellProps) {
  const [initialState] = useState(() => getInitialState());
  const [mode, setMode] = useState<WorkbenchMode>("qimen");
  const [klineWorkspaceOpen, setKlineWorkspaceOpen] = useState(false);
  const [classicWorkspace, setClassicWorkspace] = useState<"daliuren" | "taiyi" | null>(null);
  const [decisionWorkspaceOpen, setDecisionWorkspaceOpen] = useState(false);
  const [agentWorkspaceOpen, setAgentWorkspaceOpen] = useState(product === "shengtian");
  const [formState, setFormState] = useState<ProfileInput>(initialState.defaultInput);
  const [partnerFormState, setPartnerFormState] = useState<ProfileInput>(() => ({
    ...initialState.defaultInput,
    datetime: initialState.defaultInput.datetime,
    gender: initialState.defaultInput.gender === "male" ? "female" : "male",
  }));
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
  const [agentResultCopied, setAgentResultCopied] = useState(false);
  const [quickChartMode, setQuickChartMode] = useState<"single" | "series">("single");
  const [parametersOpen, setParametersOpen] = useState(false);
  const parametersPopoverRef = useRef<HTMLDivElement | null>(null);
  const [researchTool, setResearchTool] = useState<ResearchTool>("trend");
  const [qimenVerificationRows, setQimenVerificationRows] = useState<VerificationRow[]>([]);
  const [platformCheckoutLoading, setPlatformCheckoutLoading] = useState<string | null>(null);
  const checkoutInFlightRef = useRef(false);
  const [invitationCodeOpen, setInvitationCodeOpen] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationCodeLoading, setInvitationCodeLoading] = useState(false);
  const [invitationCodeMessage, setInvitationCodeMessage] = useState<string | null>(null);
  const [invitationCodeError, setInvitationCodeError] = useState<string | null>(null);
  const [platformWorkspace, setPlatformWorkspace] = useState<PlatformWorkspaceState>({
    status: "checking",
    catalogStatus: "loading",
    session: null,
    profile: null,
    gate: null,
    usage: null,
    plans: [],
    channels: [],
    error: null,
  });
  const [klineAiContent, setKlineAiContent] = useState("");
  const [klineAiError, setKlineAiError] = useState<string | null>(null);
  const [klineAiLoading, setKlineAiLoading] = useState(false);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [isNarrowLayout, setIsNarrowLayout] = useState(false);
  // The server and supported browsers render the final split surface from the
  // first paint. Test/legacy runtimes without ResizeObserver still use the
  // stacked fallback and never attempt to mount resizable panels.
  const [resizablePanelsReady, setResizablePanelsReady] = useState(() =>
    typeof window === "undefined" || typeof ResizeObserver !== "undefined",
  );
  const platformSelectedChannel = platformWorkspace.channels.find((channel) => channel.ready)?.channel ?? "";

  useEffect(() => {
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentState = getInitialState(new Date(), resolvedTimeZone);
    setFormState(currentState.defaultInput);
    setPartnerFormState({
      ...currentState.defaultInput,
      gender: currentState.defaultInput.gender === "male" ? "female" : "male",
    });
    setQimenSettings(currentState.defaultQimenSettings);
    setSequenceFormState(currentState.defaultSequenceInput);
    setNormalizedProfile(currentState.normalizedProfile);
    setQimenChart(currentState.qimenChart);
    setBaziChart(currentState.baziChart);
    setZiweiChart(currentState.ziweiChart);
    setError(currentState.error);
    setSelectedPalace(currentState.qimenChart?.raw.palaces[0]?.position ?? null);
  }, []);

  const partnerNormalizedProfile = useMemo(() => {
    try { return normalizeProfileInput(partnerFormState); } catch { return null; }
  }, [partnerFormState]);
  const partnerBaziChart = useMemo(() => partnerNormalizedProfile ? buildBaziChartFromProfile(partnerNormalizedProfile) : null, [partnerNormalizedProfile]);
  const compatibility = useMemo(() => baziChart && partnerBaziChart ? buildBaziCompatibility(baziChart, partnerBaziChart) : null, [baziChart, partnerBaziChart]);

  const activeQimenChart = sequence[selectedSequenceIndex]?.chart ?? qimenChart;
  const relationshipKlines = useMemo(() => {
    const start = formState.datetime;
    const zone = formState.timeZone;
    try {
      return {
        "double-hour": buildQimenKline(buildChartSequenceByCount(start, zone, "double-hour", 20, qimenSettings), "relationship"),
        day: buildQimenKline(buildChartSequenceByCount(start, zone, "day", 20, qimenSettings), "relationship"),
        month: buildQimenKline(buildChartSequenceByCount(start, zone, "month", 20, qimenSettings), "relationship"),
        year: buildQimenKline(buildChartSequenceByCount(start, zone, "year", 20, qimenSettings), "relationship"),
      };
    } catch {
      return {
        "double-hour": buildQimenKline([], "relationship"),
        day: buildQimenKline([], "relationship"),
        month: buildQimenKline([], "relationship"),
        year: buildQimenKline([], "relationship"),
      };
    }
  }, [formState.datetime, formState.timeZone, qimenSettings]);
  const relationshipKline = relationshipKlines["double-hour"];
  const activeModeMeta = MODE_META[mode];
  const platformConfig = useMemo(() => resolvePlatformClientConfig(), []);

  useEffect(() => {
    let cancelled = false;
    const loadPlatformWorkspace = async () => {
      if (!platformConfig) {
        setPlatformWorkspace((current) => ({ ...current, status: "error", error: "平台接入配置缺失，暂时无法登录或使用 AI 分析。" }));
        return;
      }

      const plansPromise = listPlatformPlans(platformConfig.productCode);
      const session = loadPlatformSession();
      if (!session) {
        try {
          const plans = await plansPromise;
          if (cancelled) return;
          setPlatformWorkspace({ status: "guest", catalogStatus: "ready", session: null, profile: null, gate: null, usage: null, plans: plans.items, channels: plans.channels, error: null });
        } catch (nextError) {
          if (cancelled) return;
          setPlatformWorkspace({
            status: "guest",
            catalogStatus: "error",
            session: null,
            profile: null,
            gate: null,
            usage: null,
            plans: [],
            channels: [],
            error: nextError instanceof Error ? `无法读取支付方式：${nextError.message}` : "无法读取支付方式，请稍后重试。",
          });
        }
        return;
      }

      try {
        const access = await restorePlatformAccessState(session);
        const client = createPlatformClient({ accessToken: access.session.access_token, csrfToken: access.session.csrf_token });
        const [gate, usage, plans] = await Promise.all([
          client.getCurrentGate(platformConfig.productCode, platformConfig.accessScope),
          fetchPlatformUsage(access.session.access_token, access.session.csrf_token),
          plansPromise,
        ]);
        if (cancelled) return;
        setPlatformWorkspace({ status: "authenticated", catalogStatus: "ready", session: access.session, profile: access.profile, gate, usage, plans: plans.items, channels: plans.channels, error: null });
        setAgentState((current) => Object.fromEntries(Object.entries(current).map(([key, state]) => [
          key,
          { ...state, authMode: "account", usageAvailable: usage.available, usageConsumed: usage.consumed },
        ])) as Record<WorkbenchMode, AgentModeState>);
      } catch (nextError) {
        if (cancelled) return;
        clearPlatformSession();
        try {
          const plans = await plansPromise;
          setPlatformWorkspace({ status: "guest", catalogStatus: "ready", session: null, profile: null, gate: null, usage: null, plans: plans.items, channels: plans.channels, error: nextError instanceof Error ? nextError.message : "平台登录状态已失效。" });
        } catch (catalogError) {
          setPlatformWorkspace({
            status: "guest",
            catalogStatus: "error",
            session: null,
            profile: null,
            gate: null,
            usage: null,
            plans: [],
            channels: [],
            error: catalogError instanceof Error ? `无法读取支付方式：${catalogError.message}` : "无法读取支付方式，请稍后重试。",
          });
        }
      }
    };

    void loadPlatformWorkspace();
    return () => {
      cancelled = true;
    };
  }, [platformConfig]);

  const handlePlatformLogin = async () => {
    if (!platformConfig || typeof window === "undefined") return;
    const returnUrl = `${window.location.origin}/auth/platform-callback`;
    const oauthRequest = await createPlatformOAuthRequest();
    savePlatformOAuthRequest(oauthRequest);
    window.location.assign(buildPlatformOAuthLoginUrl({
      baseUrl: platformConfig.baseUrl,
      loginUrl: platformConfig.loginUrl,
      clientId: platformConfig.productCode,
      productCode: platformConfig.productCode,
      accessScope: platformConfig.accessScope,
      redirectUri: returnUrl,
      codeChallenge: oauthRequest.challenge,
      state: oauthRequest.state,
    }));
  };

  const handlePlatformLogout = async () => {
    const session = platformWorkspace.session;
    try {
      if (session) await createPlatformClient({ accessToken: session.access_token, csrfToken: session.csrf_token }).logout();
    } catch {
      // The local session is cleared even if the platform logout request has expired.
    }
    clearPlatformSession();
    clearActiveAgentSession();
    setPlatformWorkspace((current) => ({ ...current, status: "guest", session: null, profile: null, gate: null, usage: null }));
    setAgentState((current) => Object.fromEntries(Object.entries(current).map(([key, state]) => [
      key,
      { ...state, authMode: "guest", usageAvailable: 0, usageConsumed: 0 },
    ])) as Record<WorkbenchMode, AgentModeState>);
  };

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

  const researchData = useMemo<ResearchWorkspaceData | null>(() => {
    try {
      const verification = buildVerificationData({
        profile: normalizedProfile,
        qimen: qimenChart,
        bazi: baziChart,
        ziwei: ziweiChart,
      });
      verification.rows = [
        ...verification.rows.filter((item) => item.system !== "奇门" || item.field !== "参考引擎"),
        ...qimenVerificationRows,
      ];
      if (qimenChart && qimenVerificationRows.length === 0) {
        verification.rows.push({
          system: "奇门",
          field: "参考引擎",
          primary: qimenChart.engine,
          reference: "taibu-core/qimen",
          status: "unavailable",
          note: qimenChart.input.qimenSettings?.method === "default" ? "参考盘正在计算。" : "拆补与茅山口径暂不强行对齐默认转盘参考引擎。",
        });
      }
      return {
        trend: buildLifeTrendData(normalizedProfile),
        verification,
        daliuren: buildDaliurenResearch(normalizedProfile),
        taiyi: buildTaiyiResearch(normalizedProfile),
      };
    } catch (nextError) {
      console.error("research workspace generation failed", nextError);
      return null;
    }
  }, [normalizedProfile, qimenChart, baziChart, ziweiChart, qimenVerificationRows]);

  const lifeKline = useMemo(
    () => researchData ? lifeTrendToKlineSeries(researchData.trend) : buildQimenKline([], "life"),
    [researchData],
  );

  useEffect(() => {
    let cancelled = false;
    setQimenVerificationRows([]);
    if (!qimenChart || qimenChart.input.qimenSettings?.method !== "default") return () => undefined;
    void buildQimenReferenceVerification(normalizedProfile, qimenChart)
      .then((rows) => {
        if (!cancelled) setQimenVerificationRows(rows);
      })
      .catch(() => {
        if (!cancelled) setQimenVerificationRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedProfile, qimenChart]);

  const researchContext = useMemo(() => {
    if (!researchData) return { text: "", json: "" };
    const value = researchData[researchTool];
    if (researchTool === "trend") {
      const trend = researchData.trend;
      return {
        text: [
          "研究工具：人生趋势",
          `起运：${trend.startAgeDetail}`,
          `方向：${trend.direction === "forward" ? "顺排" : "逆排"}`,
          trend.disclaimer,
          ...trend.points.map((point) => `${point.year}（${point.age}岁） ${point.ganZhi} / 大运${point.dayunGanZhi} O${point.open} H${point.high} L${point.low} C${point.close}；${point.signals.map((signal) => `${signal.kind === "support" ? "支持" : "待核"}:${signal.text}`).join("；")}`),
        ].join("\n"),
        json: JSON.stringify(value),
      };
    }
    if (researchTool === "verification") {
      return {
        text: ["研究工具：算法核验", researchData.verification.disclaimer, ...researchData.verification.rows.map((item) => `${item.system}/${item.field}：主引擎=${item.primary}；参考引擎=${item.reference}；状态=${item.status}；${item.note}`)].join("\n"),
        json: JSON.stringify(value),
      };
    }
    return {
      text: researchTool === "daliuren" ? researchData.daliuren?.text ?? "" : researchData.taiyi?.text ?? "",
      json: JSON.stringify(researchTool === "daliuren" ? researchData.daliuren?.json ?? {} : researchData.taiyi?.json ?? {}),
    };
  }, [researchData, researchTool]);

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
      case "research":
        return researchContext.text;
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
    researchContext.text,
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
      case "research":
        return researchContext.json;
    }
  }, [mode, sequence, activeQimenChart, normalizedProfile, qimenChart, baziChart, ziweiChart, researchContext.json]);

  const agentLiteratureContext = useMemo(() => {
    if ((mode !== "bazi" && mode !== "combined") || !structuredText || !jsonPayload) {
      return "";
    }

    return selectBaziClassicsContext({
      question: agentState[mode].question,
      structuredText,
      jsonPayload,
      limit: 3,
    });
  }, [agentState, jsonPayload, mode, structuredText]);

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
      research: { ...current.research, content: "", model: null, error: null, loading: false },
    }));
    setError(null);
  };

  const handleGenerate = (nextInput: ProfileInput) => {
    setFormState(nextInput);
    setSequenceFormState((current) => syncSequenceWindowToStart(current, nextInput.datetime));
    setCopyState("idle");

    if (!hasValidTrueSolarLongitude(nextInput)) {
      setError("真太阳时需要填写有效的出生地经度（-180° 至 180°）。");
      return;
    }

    try {
      applyWorkbenchCharts(nextInput, qimenSettings);
      setParametersOpen(false);
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
      setParametersOpen(false);
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

  const handleModeChange = (nextMode: WorkbenchMode) => {
    setMode(nextMode);
    setKlineWorkspaceOpen(false);
    setClassicWorkspace(null);
    setDecisionWorkspaceOpen(false);
    setAgentWorkspaceOpen(false);
    setParametersOpen(false);
  };

  const handleKlineWorkspaceOpen = () => {
    setKlineWorkspaceOpen(true);
    setClassicWorkspace(null);
    setDecisionWorkspaceOpen(false);
    setAgentWorkspaceOpen(false);
    setParametersOpen(false);
  };

  const handleDecisionWorkspaceOpen = () => {
    setDecisionWorkspaceOpen(true);
    setKlineWorkspaceOpen(false);
    setClassicWorkspace(null);
    setAgentWorkspaceOpen(false);
    setParametersOpen(false);
  };

  const handleAgentWorkspaceOpen = () => {
    setAgentWorkspaceOpen(true);
    setDecisionWorkspaceOpen(false);
    setKlineWorkspaceOpen(false);
    setClassicWorkspace(null);
    setParametersOpen(false);
    setAgentState((current) => {
      const currentMode = current[mode];
      if (currentMode.conversation.length > 0 || (currentMode.question.trim() && currentMode.question !== DEFAULT_AGENT_QUESTIONS[mode])) return current;
      return { ...current, [mode]: { ...currentMode, question: "", focus: "人生议题访谈" } };
    });
  };

  const handleAgentEvidenceModeChange = (nextMode: WorkbenchMode) => {
    setMode(nextMode);
    setParametersOpen(false);
  };

  const handleClassicWorkspaceOpen = (kind: "daliuren" | "taiyi") => {
    setClassicWorkspace(kind);
    setKlineWorkspaceOpen(false);
    setDecisionWorkspaceOpen(false);
    setAgentWorkspaceOpen(false);
    setParametersOpen(false);
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
        focus: AGENT_ANALYSIS_ANGLES[mode].find((angle) => angle.question === value)?.label ?? "自定义问题",
        error: null,
      },
    }));
    setAgentResultCopied(false);
  };

  const handleCopyAgentResult = async () => {
    const content = agentState[mode].content;
    if (!content) {
      return;
    }

    await navigator.clipboard.writeText(content);
    setAgentResultCopied(true);
    window.setTimeout(() => setAgentResultCopied(false), 1800);
  };

  const canUseAgentState = (state: AgentModeState) =>
    state.usageAvailable > 0 && (
      state.authMode === "account"
        ? platformWorkspace.status === "authenticated" && Boolean(platformWorkspace.session)
        : Boolean(state.checkoutToken)
    );

  const refreshPlatformAccount = async () => {
    if (platformWorkspace.status !== "authenticated" || !platformWorkspace.session) {
      throw new Error("请先登录平台账户。");
    }
    try {
      const access = await restorePlatformAccessState(platformWorkspace.session);
      setPlatformWorkspace((current) => ({
        ...current,
        status: "authenticated",
        session: access.session,
        profile: access.profile,
        error: null,
      }));
      return access;
    } catch (error) {
      clearPlatformSession();
      setPlatformWorkspace((current) => ({
        ...current,
        status: "guest",
        session: null,
        profile: null,
        gate: null,
        usage: null,
        error: error instanceof Error ? error.message : "平台登录状态已失效。",
      }));
      throw error;
    }
  };

  const handleInvitationRedeem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = invitationCode.trim();
    if (!code) {
      setInvitationCodeError("请输入邀请码。");
      setInvitationCodeMessage(null);
      return;
    }
    if (platformWorkspace.status !== "authenticated" || !platformWorkspace.session || !platformConfig) {
      setInvitationCodeError("请先登录平台账户，再兑换邀请码。");
      setInvitationCodeMessage(null);
      return;
    }

    setInvitationCodeLoading(true);
    setInvitationCodeError(null);
    setInvitationCodeMessage(null);
    try {
      const access = await refreshPlatformAccount();
      const redemption = await redeemInvitationCode(access.session.access_token, code, { csrfToken: access.session.csrf_token });
      let gate = platformWorkspace.gate;
      let usage = platformWorkspace.usage;
      let refreshWarning = "";
      try {
        const client = createPlatformClient({ accessToken: access.session.access_token, csrfToken: access.session.csrf_token });
        [gate, usage] = await Promise.all([
          client.getCurrentGate(platformConfig.productCode, platformConfig.accessScope),
          fetchPlatformUsage(access.session.access_token, access.session.csrf_token),
        ]);
      } catch {
        // The redemption has already been committed by the platform. Keep the
        // success state visible even if the follow-up read is temporarily down;
        // use the platform's redemption result until the next refresh.
        usage = {
          available: redemption.available,
          reserved: usage?.reserved ?? 0,
          consumed: usage?.consumed ?? 0,
        };
        refreshWarning = "（账户余额将在下次刷新时重新核对）";
      }
      const nextUsage = usage ?? {
        available: redemption.available,
        reserved: 0,
        consumed: 0,
      };
      setPlatformWorkspace((current) => ({
        ...current,
        status: "authenticated",
        session: access.session,
        profile: access.profile,
        gate,
        usage: nextUsage,
        error: null,
      }));
      setAgentState((current) => Object.fromEntries(Object.entries(current).map(([key, state]) => [
        key,
        { ...state, authMode: "account", usageAvailable: nextUsage.available, usageConsumed: nextUsage.consumed },
      ])) as Record<WorkbenchMode, AgentModeState>);
      setInvitationCode("");
      setInvitationCodeMessage(`兑换成功：${redemption.plan_title}，获得 ${redemption.credits_granted} 次；当前可用 ${redemption.available} 次。${refreshWarning}`);
    } catch (error) {
      setInvitationCodeError(error instanceof Error ? error.message : "邀请码兑换失败，请稍后重试。");
    } finally {
      setInvitationCodeLoading(false);
    }
  };

  const buildAgentRequestHeaders = (state: AgentModeState, accountAccessToken = platformWorkspace.session?.access_token) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (state.authMode === "account" && accountAccessToken) {
      headers.Authorization = `Bearer ${accountAccessToken}`;
    } else if (state.checkoutToken) {
      headers["X-Guest-Checkout-Token"] = state.checkoutToken;
    }
    return headers;
  };

  const beginPaidCheckout = async (
    planCode: string,
    pending: Omit<Parameters<typeof savePendingPaidAnalysis>[0], "orderId" | "checkoutToken" | "checkoutMode">,
  ) => {
    if (!platformConfig || typeof window === "undefined") {
      throw new Error("平台支付暂不可用，请稍后重试。");
    }
    if (checkoutInFlightRef.current) {
      throw new Error("已有支付流程正在处理中，请勿重复点击。");
    }
    if (platformWorkspace.status === "checking") {
      throw new Error("正在读取登录和权益状态，请稍候再发起支付。");
    }
    if (platformWorkspace.status !== "authenticated" && platformWorkspace.status !== "guest") {
      throw new Error(platformWorkspace.error || "平台状态异常，请刷新后重试。");
    }
    let paymentChannel = platformSelectedChannel;
    if (!paymentChannel) {
      if (platformWorkspace.catalogStatus === "loading") {
        throw new Error("正在读取支付方式，请稍候再发起支付。");
      }
      try {
        const catalog = await listPlatformPlans(platformConfig.productCode);
        paymentChannel = catalog.channels.find((channel) => channel.ready)?.channel ?? "";
        setPlatformWorkspace((current) => ({
          ...current,
          catalogStatus: "ready",
          plans: catalog.items,
          channels: catalog.channels,
          error: current.status === "error" ? null : current.error,
        }));
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "未知网络错误";
        setPlatformWorkspace((current) => ({ ...current, catalogStatus: "error", error: `无法读取支付方式：${message}` }));
        throw new Error(`无法读取支付方式，请检查网络后重试。${message}`);
      }
      if (!paymentChannel) {
        throw new Error("当前支付方式暂不可用，请稍后重试。");
      }
    }
    const returnUrl = (orderId: string) => `${window.location.origin}/billing/result?order_id=${encodeURIComponent(orderId)}&product_code=${encodeURIComponent(platformConfig.productCode)}`;
    checkoutInFlightRef.current = true;
    setPlatformCheckoutLoading(planCode);
    try {
      if (platformWorkspace.status === "authenticated" && platformWorkspace.session) {
        // The workspace may have been open long enough for the short-lived
        // access token to expire. Refresh/revalidate immediately before
        // creating the order so a valid logged-in user never falls through to
        // guest checkout or loses the pending analysis.
        const access = await refreshPlatformAccount();
        const checkout = await createAccountCheckout(
          access.session.access_token,
          planCode,
          paymentChannel,
          returnUrl,
          { csrfToken: access.session.csrf_token },
        );
        savePendingPaidAnalysis({
          ...pending,
          orderId: checkout.orderId,
          checkoutToken: "",
          checkoutMode: "account",
        });
        window.location.assign(checkout.providerCheckoutUrl);
        return;
      }

      const checkout = await createGuestCheckout(planCode, paymentChannel);
      const payment = await createGuestPaymentAttempt(
        checkout,
        paymentChannel,
        returnUrl(checkout.order.order_id),
      );
      savePendingPaidAnalysis({
        ...pending,
        orderId: checkout.order.order_id,
        checkoutToken: checkout.checkout_token,
        checkoutMode: "guest",
      });
      if (!payment.provider_checkout_url) throw new Error("平台没有返回收银台地址，未继续发起支付。");
      window.location.assign(`${payment.provider_checkout_url}`);
    } finally {
      checkoutInFlightRef.current = false;
      setPlatformCheckoutLoading(null);
    }
  };

  const handleCompatibilityPurchase = async () => {
    if (!compatibility || !baziChart || !partnerBaziChart || !platformConfig || typeof window === "undefined") return;
    setCompatibilityLoading(true);
    try {
      const pairText = [
        "研究工具：八字双人合盘",
        "第一人八字结构化文本：",
        serializeBaziToStructuredText(baziChart),
        "第二人八字结构化文本：",
        serializeBaziToStructuredText(partnerBaziChart),
        "规则版合盘结果：",
        compatibility.headline,
        ...compatibility.evidence,
      ].join("\n");
      const pairJson = JSON.stringify({ format: "qmdj-bazi-compatibility-v1", left: JSON.parse(serializeBaziToCompactJson(baziChart)), right: JSON.parse(serializeBaziToCompactJson(partnerBaziChart)), ruleSummary: compatibility });
      const existing = Object.values(agentState).find((state) => canUseAgentState(state)) ?? agentState.bazi;
      if (canUseAgentState(existing)) {
        const accessToken = existing.authMode === "account" ? (await refreshPlatformAccount()).session.access_token : undefined;
        const response = await fetch("/api/agent", { method: "POST", headers: buildAgentRequestHeaders(existing, accessToken), body: JSON.stringify({ mode: "bazi", question: "请做八字双人合盘的 AI 详细分析：分别列出两人的盘面事实，再分析互动协同、冲突、现实验证与具体建议；不要替任何一方断言想法或结果。", focus: "双人合盘", history: existing.conversation, structuredText: pairText, jsonPayload: pairJson }) });
        const result = await response.json() as { content?: string; model?: string; error?: string; usage?: { available?: number; consumed?: number } };
        if (!response.ok || !result.content) throw new Error(result.error ?? "合盘分析失败，请重试。");
        const nextConversation = [...existing.conversation, { role: "user" as const, content: "双人合盘" }, { role: "assistant" as const, content: result.content ?? "" }];
        const nextAvailable = Number(result.usage?.available ?? Math.max(existing.usageAvailable - 1, 0));
        const nextConsumed = Number(result.usage?.consumed ?? existing.usageConsumed + 1);
        if (existing.authMode === "account") {
          setPlatformWorkspace((current) => ({
            ...current,
            usage: current.usage ? { ...current.usage, available: nextAvailable, consumed: nextConsumed } : current.usage,
          }));
        }
        setAgentState((current) => ({ ...current, bazi: { ...existing, content: result.content ?? "", model: result.model ?? null, question: "", error: null, loading: false, conversation: nextConversation, sessionStructuredText: pairText, sessionJsonPayload: pairJson, usageAvailable: nextAvailable, usageConsumed: nextConsumed } }));
        saveActiveAgentSession({ orderId: existing.orderId, checkoutToken: existing.checkoutToken, checkoutMode: existing.authMode, mode: "bazi", focus: "双人合盘", structuredText: pairText, jsonPayload: pairJson, messages: nextConversation, usageAvailable: nextAvailable, usageConsumed: nextConsumed, totalTurns: existing.totalTurns, updatedAt: Date.now() });
        setCompatibilityLoading(false);
        return;
      }
      await beginPaidCheckout(AGENT_PLAN_CODE, {
        mode: "bazi",
        question: "请做八字双人合盘的 AI 详细分析：分别列出两人的盘面事实，再分析互动协同、冲突、现实验证与具体建议；不要替任何一方断言想法或结果。",
        focus: "双人合盘",
        structuredText: pairText,
        jsonPayload: pairJson,
        analysisProduct: "agent",
        createdAt: Date.now(),
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "双人合盘支付失败。");
      setCompatibilityLoading(false);
    }
  };

  const handleKlineAnalyze = async (kind: KlineKind, scale?: KlineScale) => {
    const series = kind === "life" ? lifeKline : relationshipKlines[scale ?? "double-hour"];
    if (series.points.length < 2 || !platformConfig || typeof window === "undefined") return;
    setKlineAiError(null);
    setKlineAiLoading(true);
    try {
      const relationshipSequence = kind === "relationship"
        ? buildChartSequenceByCount(formState.datetime, formState.timeZone, scale ?? "double-hour", 20, qimenSettings)
        : [];
      const sourceText = kind === "life"
        ? ["原始来源：八字盘", baziStructuredText].join("\n")
        : ["原始来源：奇门序列盘", serializeSequenceToCompactJson(relationshipSequence)].join("\n");
      const sourceJson = kind === "life"
        ? { type: "bazi", payload: baziChart ? JSON.parse(serializeBaziToCompactJson(baziChart)) : {} }
        : { type: "qimen-sequence", payload: JSON.parse(serializeSequenceToCompactJson(relationshipSequence)) };
      const context = {
        text: [
          `研究工具：${series.title}`,
          series.methodology,
          series.disclaimer,
          sourceText,
          "K线点：",
          ...series.points.map((point) => `${point.index + 1}. ${point.datetime} score=${point.score} delta=${point.delta} phase=${point.phase} key=${point.keyPoint || "常规点"} prediction=${point.prediction} evidence=${point.evidence.join("；")}`),
        ].join("\n"),
        json: JSON.stringify({ format: "qmdj-kline-precise-v2", kind, scale: scale ?? null, series, source: sourceJson }),
      };
      await beginPaidCheckout(KLINE_PLAN_CODE, {
        mode: "qimen",
        question: kind === "life"
          ? "请对这组基于八字大运与流年的‘人生 K 线’做精确 AI 深度分析，逐点说明趋势、预测窗口、现实建议和复盘条件。"
          : "请对这组奇门序列盘的感情 K 线做精确的 AI 深度分析，逐点说明互动条件、预测窗口、现实建议和关系边界。",
        focus: kind === "life" ? "人生 K 线" : "感情 K 线",
        structuredText: context.text,
        jsonPayload: context.json,
        analysisProduct: "kline",
        klineKind: kind,
        klineSeries: series,
        createdAt: Date.now(),
      });
    } catch (nextError) {
      setKlineAiError(nextError instanceof Error ? nextError.message : "K线 AI 请求失败。");
      setKlineAiLoading(false);
    }
  };

  const handleAgentAnalyze = async () => {
    if (!structuredText || !jsonPayload) {
      return;
    }

    const currentState = agentState[mode];
    const sharedState = canUseAgentState(currentState)
      ? currentState
      : Object.values(agentState).find((state) => canUseAgentState(state)) ?? currentState;
    const enteredQuestion = currentState.question.trim();
    const isInterviewStart = !enteredQuestion && currentState.focus === "人生议题访谈" && currentState.conversation.length === 0;
    if (!enteredQuestion && !isInterviewStart) {
      setAgentState((current) => ({
        ...current,
        [mode]: { ...current[mode], error: "先写下你想核对的具体问题。" },
      }));
      return;
    }

    const currentQuestion = enteredQuestion || AGENT_INTERVIEW_START_QUESTION;
    const conversationQuestion = enteredQuestion || AGENT_INTERVIEW_START_LABEL;
    const selectedAngle = AGENT_ANALYSIS_ANGLES[mode].find((angle) => angle.question === enteredQuestion);
    const focus = selectedAngle?.label ?? (isInterviewStart ? "人生议题访谈" : "自定义问题");
    const planCode = AGENT_PLAN_CODE;
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
    setAgentResultCopied(false);

    try {
      if (canUseAgentState(sharedState)) {
        const sessionStructuredText = currentState.sessionStructuredText || structuredText;
        const sessionJsonPayload = currentState.sessionJsonPayload || jsonPayload;
        const accessToken = sharedState.authMode === "account" ? (await refreshPlatformAccount()).session.access_token : undefined;
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: buildAgentRequestHeaders(sharedState, accessToken),
          body: JSON.stringify({
            mode,
            researchTool: mode === "research" ? researchTool : undefined,
            question: currentQuestion,
            focus,
            history: currentState.conversation,
            structuredText: sessionStructuredText,
            jsonPayload: sessionJsonPayload,
          }),
        });
        const result = (await response.json()) as {
          content?: string;
          model?: string;
          error?: string;
          usage?: { available?: number; consumed?: number };
        };
        if (!response.ok || !result.content) {
          throw new Error(result.error ?? "分析失败，请重试。");
        }

        const nextConversation: AgentConversationMessage[] = [
          ...currentState.conversation,
          { role: "user", content: conversationQuestion },
          { role: "assistant", content: result.content },
        ];
        const nextState = {
          ...currentState,
          checkoutToken: sharedState.checkoutToken,
          orderId: sharedState.orderId,
          authMode: sharedState.authMode,
          question: "",
          focus,
          content: result.content,
          model: result.model ?? null,
          error: null,
          loading: false,
          conversation: nextConversation,
          sessionStructuredText,
          sessionJsonPayload,
          usageAvailable: Number(result.usage?.available ?? Math.max(sharedState.usageAvailable - 1, 0)),
          usageConsumed: Number(result.usage?.consumed ?? sharedState.usageConsumed + 1),
        };
        if (sharedState.authMode === "account") {
          setPlatformWorkspace((current) => ({
            ...current,
            usage: current.usage ? { ...current.usage, available: nextState.usageAvailable, consumed: nextState.usageConsumed } : current.usage,
          }));
        }
        setAgentState((current) => Object.fromEntries(Object.entries(current).map(([key, state]) => [
          key,
          key === mode
            ? nextState
            : state.authMode === sharedState.authMode && (sharedState.authMode === "account" || state.checkoutToken === sharedState.checkoutToken)
              ? { ...state, checkoutToken: sharedState.checkoutToken, orderId: sharedState.orderId, authMode: sharedState.authMode, usageAvailable: nextState.usageAvailable, usageConsumed: nextState.usageConsumed }
              : state,
        ])) as Record<WorkbenchMode, AgentModeState>);
        saveActiveAgentSession({
          orderId: nextState.orderId,
          checkoutToken: nextState.checkoutToken,
          checkoutMode: nextState.authMode,
          mode,
          focus,
          structuredText: sessionStructuredText,
          jsonPayload: sessionJsonPayload,
          messages: nextConversation,
          usageAvailable: nextState.usageAvailable,
          usageConsumed: nextState.usageConsumed,
          totalTurns: nextState.totalTurns,
          updatedAt: Date.now(),
        });
        return;
      }

      await beginPaidCheckout(planCode, {
        mode,
        question: currentQuestion,
        displayQuestion: conversationQuestion,
        focus,
        structuredText,
        jsonPayload,
        createdAt: Date.now(),
      });
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
    const savedKline = loadKlineAiResult();
    if (savedKline?.content) setKlineAiContent(savedKline.content);
    const completed = popCompletedPaidAnalysis();
    const active = completed ?? loadActiveAgentSession();
    if (!active) return;
    if (completed?.analysisProduct === "kline") {
      setKlineAiContent(completed.content);
      saveKlineAiResult({ content: completed.content, model: completed.model, klineKind: completed.klineKind, klineSeries: completed.klineSeries });
      setKlineAiLoading(false);
      return;
    }
    setMode(active.mode);
    const nextState: AgentModeState = {
      ...createInitialAgentState()[active.mode],
      question: "",
      focus: active.focus,
      content: "content" in active ? active.content : active.messages.at(-1)?.content ?? "",
      model: "model" in active ? active.model : null,
      error: null,
      loading: false,
      conversation: active.messages,
      orderId: active.orderId,
      checkoutToken: active.checkoutToken,
      authMode: active.checkoutMode === "account" ? "account" : "guest",
      usageAvailable: active.usageAvailable,
      usageConsumed: active.usageConsumed,
      totalTurns: active.totalTurns || AGENT_SESSION_TURNS,
      sessionStructuredText: active.structuredText,
      sessionJsonPayload: active.jsonPayload,
    };
    setAgentState((current) => ({ ...current, [active.mode]: nextState }));
    saveActiveAgentSession({
      orderId: nextState.orderId,
      checkoutToken: nextState.checkoutToken,
      checkoutMode: nextState.authMode,
      mode: active.mode,
      focus: active.focus,
      structuredText: active.structuredText,
      jsonPayload: active.jsonPayload,
      messages: active.messages,
      usageAvailable: active.usageAvailable,
      usageConsumed: active.usageConsumed,
      totalTurns: nextState.totalTurns,
      updatedAt: Date.now(),
    });
  }, []);

  const agentInspector = (
    <InspectorPanel
      agentAngles={AGENT_ANALYSIS_ANGLES[mode]}
      agentError={agentState[mode].error}
      agentConversation={agentState[mode].conversation}
      agentFollowUps={AGENT_FOLLOW_UP_QUESTIONS[mode]}
      agentLoading={agentState[mode].loading || Boolean(platformCheckoutLoading)}
      agentModel={agentState[mode].model}
      agentQuestion={agentState[mode].question}
      isInterviewZeroState={agentState[mode].focus === "人生议题访谈" && !agentState[mode].question.trim() && agentState[mode].conversation.length === 0}
      agentUsageAvailable={(Object.values(agentState).find((state) => canUseAgentState(state)) ?? agentState[mode]).usageAvailable}
      agentUsageConsumed={(Object.values(agentState).find((state) => canUseAgentState(state)) ?? agentState[mode]).usageConsumed}
      agentPurchaseLabel={(() => {
        const plan = platformWorkspace.plans.find((item) => item.plan_code === AGENT_PLAN_CODE);
        return plan ? `${plan.title} · ¥${(plan.price_cny / 100).toFixed(2)}` : "读取平台套餐后购买";
      })()}
      platformStatus={platformWorkspace.status}
      defaultAgentQuestion={DEFAULT_AGENT_QUESTIONS[mode]}
      agentResult={agentState[mode].content}
      agentResultCopied={agentResultCopied}
      copyState={copyState}
      literatureContext={agentLiteratureContext}
      jsonPayload={jsonPayload}
      mode={mode}
      onAgentAnalyze={handleAgentAnalyze}
      onCopyResult={handleCopyAgentResult}
      onCopyJson={handleCopyJson}
      onCopyText={handleCopyText}
      onAgentQuestionChange={handleAgentQuestionChange}
      selectedPalace={mode === "qimen" ? selectedPalace : null}
      structuredText={structuredText}
    />
  );

  const restoreAgentCase = useCallback(({ question, conversation, mode: restoredMode, evidence }: { question: string; conversation: AgentConversationMessage[]; mode?: WorkbenchMode; evidence?: { sourceText:string; structuredJson:unknown } | null }) => {
    const assistantResult = [...conversation].reverse().find((message) => message.role === "assistant")?.content ?? "";
    const targetMode = restoredMode ?? mode;
    if (restoredMode) setMode(restoredMode);
    setAgentState((current) => ({
      ...current,
      [targetMode]: {
        ...current[targetMode],
        question,
        conversation,
        content: assistantResult,
        sessionStructuredText: evidence?.sourceText ?? "",
        sessionJsonPayload: evidence ? JSON.stringify(evidence.structuredJson) : "",
        error: null,
        loading: false,
      },
    }));
  }, [mode]);

  const shiftChartDateTime = (hours: number) => {
    const nextDatetime = shiftDateTimeInput(formState.datetime, hours);
    if (nextDatetime === formState.datetime) return;
    const nextValue = { ...formState, datetime: nextDatetime };
    setFormState(nextValue);
    handleGenerate(nextValue);
  };

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

  useEffect(() => {
    if (!parametersOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !parametersPopoverRef.current?.contains(target)) {
        setParametersOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setParametersOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [parametersOpen]);

  const workbenchCanvas = (
    <section className="canvas-panel" data-mode={mode}>
      {mode === "qimen" ? (
        <div className="chart-time-stepper" aria-label="盘面时间快速调整">
          <span>排盘时间</span>
          <strong>{formState.datetime.replace("T", " ")}</strong>
          <DateTimeStepper onShift={shiftChartDateTime} />
        </div>
      ) : null}

      <div
        className={
          mode === "qimen"
            ? sequence.length > 0
              ? "canvas-panel__content qimen-board-layout has-sequence"
              : "canvas-panel__content qimen-board-layout"
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

        {mode === "bazi" ? <><BaziPanel chart={baziChart} /><BaziCompatibilityPanel value={compatibility} datetime={partnerFormState.datetime} gender={partnerFormState.gender} onDatetimeChange={(datetime) => setPartnerFormState((current) => ({ ...current, datetime }))} onGenderChange={(gender) => setPartnerFormState((current) => ({ ...current, gender }))} onPurchase={handleCompatibilityPurchase} loading={compatibilityLoading} /></> : null}

        {mode === "ziwei" ? <ZiweiPanel value={formState} /> : null}

        {mode === "research" ? (
          <ResearchPanel data={researchData} tool={researchTool} onToolChange={setResearchTool} />
        ) : null}

      </div>
      {mode === "qimen" && activeQimenChart ? <SummaryStrip chart={activeQimenChart} /> : null}
    </section>
  );

  const workbenchSidebar = (
    <aside className="sidebar-panel" data-mode={mode}>
      {product === "shengtian" && mode !== "combined" ? agentInspector : null}

      {mode !== "research" ? null : <div className="research-sidebar-note">研究工具与 Agent 已在同一工作区显示；选择工具后，Agent 会收到对应的结构化文本和 JSON。</div>}
    </aside>
  );

  const chartModeControls = mode === "qimen" ? (
    <section className="sidebar-quick-controls parameters-popover__mode-controls" aria-label="排盘模式与时间范围">
      <div className="sidebar-quick-controls__heading">
        <div>
          <span>排盘模式</span>
          <small>单张看当前；序列按时间间隔连续生成多张盘，用于连续分析</small>
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
        <div className="sidebar-quick-controls__actions">
          <Button
            className="command-button command-button-primary"
            type="button"
            onClick={() => handleGenerate(formState)}
          >
            生成单张盘
          </Button>
        </div>
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
              <option value="month">月 / 1月</option>
              <option value="year">年 / 1年</option>
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
  ) : null;

  const chartParametersForm = mode !== "research" ? (
    <ChartForm
      copyState={copyState}
      layout="sidebar"
      mode={mode}
      onCopyJson={handleCopyJson}
      onCopyText={handleCopyText}
      onQimenSettingsChange={handleQimenSettingsChange}
      onSequenceSubmit={handleGenerateSequence}
      onSequenceValueChange={setSequenceFormState}
      onSubmit={(value) => {
        if (mode === "qimen" && quickChartMode === "series") {
          handleGenerateSequence(sequenceFormState);
          return;
        }
        handleGenerate(value);
      }}
      onValueChange={setFormState}
      qimenSettings={qimenSettings}
      sequenceValue={sequenceFormState}
      showCopyActions={false}
      showSequenceControls={false}
      showSubmitAction={mode !== "qimen"}
      isSequenceMode={mode === "qimen" && quickChartMode === "series"}
      value={formState}
    />
  ) : null;

  const invitationRedeemControl = (
    <div className="platform-account__redeem-wrap">
      <button
        type="button"
        className="platform-account__button platform-account__redeem-button"
        aria-expanded={invitationCodeOpen}
        onClick={() => {
          setInvitationCodeOpen((open) => !open);
          setInvitationCodeError(null);
          setInvitationCodeMessage(null);
        }}
      >
        邀请码兑换
      </button>
      {invitationCodeOpen ? (
        <form className="platform-account__redeem-popover" onSubmit={(event) => void handleInvitationRedeem(event)}>
          <strong>兑换分析次数</strong>
          <p>登录平台账户后兑换；次数和有效期由平台邀请码配置决定，本产品不额外设置每日兑换限制。</p>
          <Input
            aria-label="邀请码"
            autoComplete="off"
            maxLength={64}
            placeholder="输入邀请码"
            value={invitationCode}
            onChange={(event) => {
              setInvitationCode(event.target.value);
              setInvitationCodeError(null);
            }}
            disabled={invitationCodeLoading}
          />
          <button type="submit" className="platform-account__button is-primary" disabled={invitationCodeLoading || !invitationCode.trim()}>
            {invitationCodeLoading ? "正在兑换…" : "确认兑换"}
          </button>
          {invitationCodeError ? <span className="platform-account__redeem-error" role="alert">{invitationCodeError}</span> : null}
          {invitationCodeMessage ? <span className="platform-account__redeem-success" role="status">{invitationCodeMessage}</span> : null}
        </form>
      ) : null}
    </div>
  );

  return (
    <div className={`page-shell product-${product}${agentWorkspaceOpen ? " is-agent-workspace" : ""}`} data-mode={mode}>
      <header className="observatory-hero">
        <div className="observatory-hero__copy">
          <span className="workspace-kicker">{product === "shengtian" ? "胜天半子" : "术数排盘工具"}</span>
          <h1>{product === "shengtian" ? "胜天半子" : "术数排盘工作台"}</h1>
          <span className="observatory-hero__workspace">{product === "shengtian" ? (agentWorkspaceOpen ? "人生决策控制室" : decisionWorkspaceOpen ? "关键决策树" : klineWorkspaceOpen ? "K 线观测" : classicWorkspace === "daliuren" ? "大六壬观测" : classicWorkspace === "taiyi" ? "太乙神数观测" : activeModeMeta.title) : (classicWorkspace === "daliuren" ? "大六壬排盘研究" : classicWorkspace === "taiyi" ? "太乙神数排盘研究" : activeModeMeta.title)}</span>
          <p className="observatory-hero__manifesto" aria-label="产品说明">
            {product === "shengtian" ? <><strong>命盘写下边界，选择决定路径。</strong><span>从前重构代码，现在重构命运。</span></> : <><strong>准确排盘，可复核的术数研究。</strong><span>奇门、八字、紫微与三式研究工具。</span></>}
          </p>
        </div>

        <ModeTabs mode={mode} onChange={handleModeChange} product={product} klineActive={klineWorkspaceOpen} onKlineSelect={handleKlineWorkspaceOpen} classicActive={classicWorkspace} onClassicSelect={handleClassicWorkspaceOpen} decisionActive={decisionWorkspaceOpen} onDecisionSelect={handleDecisionWorkspaceOpen} agentActive={agentWorkspaceOpen} onAgentSelect={handleAgentWorkspaceOpen} />

        <div className="platform-account" aria-label="平台账户与 AI 权益">
          {platformWorkspace.status === "checking" ? (
            <span className="platform-account__status">正在读取账户…</span>
          ) : platformWorkspace.status === "authenticated" ? (
            <>
              <span className="platform-account__status">
                {platformWorkspace.profile?.display_name || platformWorkspace.profile?.phone_number || "已登录"}
                <small>{platformWorkspace.usage ? `AI 余 ${platformWorkspace.usage.available} 轮` : "权益已连接"}</small>
              </span>
              {invitationRedeemControl}
              {platformWorkspace.session && platformConfig ? (
                <AdminInvitationPanel
                  key={platformWorkspace.session.access_token}
                  accessToken={platformWorkspace.session.access_token}
                  productCode={platformConfig.productCode}
                  planCode={AGENT_PLAN_CODE}
                />
              ) : null}
              <button type="button" className="platform-account__button" onClick={() => void handlePlatformLogout()}>退出</button>
            </>
          ) : (
            <>
              <span className="platform-account__status">游客模式 · 支付后可恢复本次分析</span>
              {invitationRedeemControl}
              <button type="button" className="platform-account__button is-primary" onClick={handlePlatformLogin}>登录平台账户</button>
            </>
          )}
        </div>

        {mode !== "research" && !klineWorkspaceOpen && !classicWorkspace && !decisionWorkspaceOpen && !agentWorkspaceOpen ? (
          <button
            className="hero-action"
            type="button"
            aria-controls="chart-parameters-popover"
            aria-expanded={parametersOpen}
            aria-haspopup="dialog"
            onClick={() => setParametersOpen((open) => !open)}
          >
            调整盘面
          </button>
        ) : null}

        {mode !== "research" && parametersOpen ? (
          <div
            ref={parametersPopoverRef}
            id="chart-parameters-popover"
            className="parameters-popover"
            role="dialog"
            aria-label="调整盘面"
          >
            <div className="parameters-popover__heading">
              <strong>调整盘面</strong>
              <span>排盘模式、时间、历法、真太阳时与排盘口径</span>
            </div>
            {chartModeControls}
            {chartParametersForm}
          </div>
        ) : null}

        <div className="observatory-hero__agent-entry">
          {mode === "combined" || mode === "research" ? (
            <span className="observatory-hero__agent-status">{mode === "combined" ? "三盘数据已注入 Agent" : "研究材料已注入 Agent"}</span>
          ) : null}
        </div>

      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      {product === "shengtian" && agentWorkspaceOpen ? (
        <AgentCommandCenter
          mode={mode}
          onModeChange={handleAgentEvidenceModeChange}
          inspector={agentInspector}
          life={lifeKline}
          relationshipScales={relationshipKlines}
          question={agentState[mode].question}
          conversationCount={agentState[mode].conversation.length}
          canPersist={platformWorkspace.status === "authenticated"}
          evidenceText={structuredText}
          evidenceJson={jsonPayload}
          conversation={agentState[mode].conversation}
          accessToken={platformWorkspace.session?.access_token}
          onLogin={handlePlatformLogin}
          onOpenWorkbench={() => setAgentWorkspaceOpen(false)}
          onCaseRestore={restoreAgentCase}
        />
      ) : product === "shengtian" && decisionWorkspaceOpen ? (
        <DecisionTreePanel life={lifeKline} relationshipScales={relationshipKlines} />
      ) : classicWorkspace ? (
        <main className="analysis-layout analysis-layout--classic" aria-label={classicWorkspace === "daliuren" ? "大六壬观测" : "太乙神数观测"}>
          <ClassicObservatoryPanel kind={classicWorkspace} value={researchData?.[classicWorkspace] ?? null} />
        </main>
      ) : product === "shengtian" && klineWorkspaceOpen ? (
        <main className="analysis-layout analysis-layout--kline" aria-label="K 线观测">
          <section className="kline-workspace">
            <KlinePanel
              life={lifeKline}
              relationship={relationshipKline}
              relationshipScales={relationshipKlines}
              aiContent={klineAiContent}
              aiError={klineAiError}
              loading={klineAiLoading || Boolean(platformCheckoutLoading === KLINE_PLAN_CODE)}
              onAnalyze={handleKlineAnalyze}
              aiPriceLabel={(() => {
                const plan = platformWorkspace.plans.find((item) => item.plan_code === KLINE_PLAN_CODE);
                return plan ? `¥${(plan.price_cny / 100).toFixed(2)}` : "读取平台套餐后购买";
              })()}
            />
            <ObservationJournal />
          </section>
        </main>
      ) : mode === "combined" ? (
        <main className="analysis-layout analysis-layout--combined-agent" aria-label="三盘联合 Agent 分析">
          <section className="combined-agent-surface">
            <div className="combined-agent-surface__heading">
              <div>
                <span>三盘联合</span>
                <h2>Agent 分析</h2>
                <p>奇门、八字、紫微三盘数据会同时作为本次分析上下文。</p>
              </div>
              <strong>已载入三盘数据</strong>
            </div>
            {agentInspector}
          </section>
        </main>
      ) : product === "chart" ? (
        <main className="analysis-layout analysis-layout--chart-only" data-layout="chart-only">
          {workbenchCanvas}
        </main>
      ) : isNarrowLayout || !resizablePanelsReady ? (
        <main className="analysis-layout analysis-layout--stacked" data-layout="agent-sidebar">
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
          <span>{product === "shengtian" ? "胜天半子" : "术数排盘工作台"}</span>
          <p>{product === "shengtian" ? "以身入局，落下你选择的一子。" : "准确计算，清晰阅读，保留每一项盘面依据。"}</p>
        </div>
        <div className="qmdj-footer__meta">
          <span>© 2026 胜天半子</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            鄂ICP备2026026686号-1
          </a>
        </div>
      </footer>

    </div>
  );
}
