"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { Position } from "3meta";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaziPanel } from "@/components/bazi-panel";
import { BaziReversePanel } from "@/components/bazi-reverse-panel";
import {
  HYDRATION_SAFE_DATE,
  HYDRATION_SAFE_TIME_ZONE,
  useResolvedClock,
} from "@/lib/hydration-clock";
import {
  AGENT_ANALYSIS_ANGLES,
  AGENT_FOLLOW_UP_QUESTIONS,
  AGENT_INTERVIEW_START_LABEL,
  AGENT_INTERVIEW_START_QUESTION,
  DEFAULT_AGENT_QUESTIONS,
  type AgentConversationMessage,
  type AgentConversationMode,
  type AgentStreamEvent,
  type AgentChartUpdate,
  type AgentToolEvent,
} from "@/lib/agent/chat";
import { selectBaziClassicsContext } from "@/lib/agent/bazi-classics";
import { serializeBaziToCompactJson, serializeBaziToStructuredText } from "@/lib/bazi/serializer";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { buildBaziCompatibility } from "@/lib/bazi/compatibility";
import { DEFAULT_BAZI_SETTINGS } from "@/lib/bazi/settings";
import {
  serializeCombinedToCompactJson,
  serializeCombinedToStructuredText,
} from "@/lib/combined/serializer";
import { toQimenProfileInput } from "@/lib/combined/chart-times";
import {
  getDefaultProfileInput,
  normalizeProfileInput,
  shiftDateTimeInput,
  type NormalizedProfileInput,
  type ProfileInput,
} from "@/lib/profile";
import { mergeBirthProfiles, parseBirthLibrary, readFileText, serializeBirthLibrary, formatBirthProfileMeta, type BirthProfileEntry } from "@/lib/birth-library";
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
import { type PlatformClientConfig } from "@/lib/platform/config";
import {
  createAccountCheckout,
  createGuestCheckout,
  createGuestPaymentAttempt,
  fetchPlatformUsage,
  listPlatformPlans,
  redeemInvitationCode,
  restorePlatformAccessState,
  recoverPlatformSessionFromBridge,
  hasBridgeSessionHint,
  type PlatformPlanState,
  preparePlatformOAuthLogin,
  parsePlatformOAuthCallback,
  consumePlatformOAuthRequest,
  PLATFORM_OAUTH_CALLBACK_PATH,
  savePlatformOAuthRequest,
} from "@/lib/platform/browser";
import { createProductPlatformClient } from "@/lib/platform/client";
import { loadPlatformSession, clearPlatformSession, savePlatformSession } from "@/lib/platform/session";
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
import { QimenPatternPanel } from "./qimen-pattern-panel";
import { SummaryStrip } from "./summary-strip";
import { KlinePanel } from "./kline-panel";
import { ClassicObservatoryPanel } from "./classic-observatory-panel";
import { BaziCompatibilityPanel } from "./bazi-compatibility-panel";
import { ModeTabs } from "./workbench/mode-tabs";
import { ZiweiPanel } from "./ziwei-panel";
import { CombinedMap } from "./combined-map";
import { DivinationPanel } from "./divination-panel";
import { FourthWayPanel } from "./fourth-way-panel";
import { HarmonicPanel } from "./harmonic-panel";
import { HuangjiPanel } from "./huangji-panel";
import { QizhengPanel } from "./qizheng-panel";
import { SacredGeometryPanel } from "./sacred-geometry-panel";
import { RunesPanel } from "./runes-panel";
import { UranianPanel } from "./uranian-panel";
import { ChartMaterials } from "./chart-materials";
import parameterStyles from "./parameters-drawer.module.css";
import { buildAstroChart } from "@/lib/astro/chart";
import { serializeAstroToCompactJson, serializeAstroToStructuredText } from "@/lib/astro/serializer";
import type { AstroChart } from "@/lib/astro/types";
import { FOURTH_WAY_CONTENT } from "@/lib/fourth-way/content";
import { serializeFourthWayToCompactJson, serializeFourthWayToStructuredText } from "@/lib/fourth-way/serializer";
import { buildHarmonicChart } from "@/lib/harmonic/chart";
import { serializeHarmonicToCompactJson, serializeHarmonicToStructuredText } from "@/lib/harmonic/serializer";
import { calculateHuangjiChronology, parseHistoricalYear } from "@/lib/huangji/chronology";
import { serializeHuangjiToCompactJson, serializeHuangjiToStructuredText } from "@/lib/huangji/serializer";
import { buildQizhengChart } from "@/lib/qizheng/chart";
import { serializeQizhengToCompactJson, serializeQizhengToStructuredText } from "@/lib/qizheng/serializer";
import { serializeSacredGeometryToCompactJson, serializeSacredGeometryToStructuredText } from "@/lib/sacred-geometry/serializer";
import type { SpreadId } from "@/lib/runes/data";
import { buildRuneReading } from "@/lib/runes/draw";
import { serializeRunesToCompactJson, serializeRunesToStructuredText } from "@/lib/runes/serializer";
import type { DialSettings } from "@/lib/uranian/dial";
import { buildUranianChart } from "@/lib/uranian/chart";
import { serializeUranianToCompactJson, serializeUranianToStructuredText } from "@/lib/uranian/serializer";
import { buildHumanDesignChart } from "@/lib/human-design/chart";
import { serializeHumanDesignToCompactJson, serializeHumanDesignToStructuredText } from "@/lib/human-design/serializer";
import type { HumanDesignChart } from "@/lib/human-design/types";
import { buildTarotReading } from "@/lib/tarot/reading";
import { serializeTarotToCompactJson, serializeTarotToStructuredText } from "@/lib/tarot/serializer";
import type { TarotReading, TarotSpreadId } from "@/lib/tarot/types";

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
  usage: {
    available: number;
    reserved: number;
    consumed: number;
    /** Platform-provided unit for this plan (e.g. analysis_turn / kline_report). */
    usage_unit?: string;
    usage_label?: string;
  } | null;
  plans: PlanCatalogItem[];
  channels: Array<{ channel: string; ready: boolean; mobile_ready: boolean; reason_code: string; message: string }>;
  error: string | null;
};

const createInitialAgentState = (): Record<WorkbenchMode, AgentModeState> => ({
  qimen: {
    question: "",
    focus: "按主题分析",
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
  astro: {
    question: DEFAULT_AGENT_QUESTIONS.astro,
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  "human-design": {
    question: DEFAULT_AGENT_QUESTIONS["human-design"],
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  tarot: {
    question: DEFAULT_AGENT_QUESTIONS.tarot,
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  "fourth-way": {
    question: DEFAULT_AGENT_QUESTIONS["fourth-way"],
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  harmonic: {
    question: DEFAULT_AGENT_QUESTIONS.harmonic,
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  huangji: {
    question: DEFAULT_AGENT_QUESTIONS.huangji,
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  qizheng: {
    question: DEFAULT_AGENT_QUESTIONS.qizheng,
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  "sacred-geometry": {
    question: DEFAULT_AGENT_QUESTIONS["sacred-geometry"],
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  runes: {
    question: DEFAULT_AGENT_QUESTIONS.runes,
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
  },
  uranian: {
    question: DEFAULT_AGENT_QUESTIONS.uranian,
    focus: "按问题综合取证",
    content: "", model: null, error: null, loading: false, conversation: [], orderId: "", checkoutToken: "", usageAvailable: 0, usageConsumed: 0, totalTurns: AGENT_SESSION_TURNS, sessionStructuredText: "", sessionJsonPayload: "", authMode: "guest",
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
  astro: { label: "西方星盘", title: "星盘", description: "太阳 / 月亮 / 上升 / 行星" },
  "human-design": { label: "人类图结构", title: "人类图", description: "类型 / 权威 / 中心 / 闸门" },
  tarot: { label: "塔罗三张牌", title: "塔罗牌", description: "主题 / 阻力 / 下一步" },
  "fourth-way": { label: "葛吉夫第四道", title: "第四道", description: "三律 / 七律 / 九型图" },
  harmonic: { label: "谐波占星", title: "泛音星盘", description: "第 n 谐波 / 叠合 / 折算" },
  huangji: { label: "皇极经世", title: "皇极经世", description: "元会运世 / 干支 / 纪元序号" },
  qizheng: { label: "七政四余", title: "七政四余", description: "七政 / 四余 / 宫宿庙旺" },
  "sacred-geometry": { label: "神圣几何", title: "神圣几何", description: "生命之花 / 元立方 / 黄金螺旋" },
  runes: { label: "卢恩符文", title: "卢恩符文", description: "Elder Futhark / 抽符 / 九界" },
  uranian: { label: "汉堡学派", title: "汉堡学派", description: "天王星系统 / 八虚星 / 90° 盘" },
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
  // 三盘联合可选让奇门单独用「问事起局时间」；默认同源，复用同一份归一化结果。
  const qimenInput = toQimenProfileInput(inputWithQimenSettings);
  const qimenProfile = qimenInput === inputWithQimenSettings ? normalizedProfile : normalizeProfileInput(qimenInput);

  return {
    normalizedProfile,
    qimenChart: buildQimenChartFromProfile(qimenProfile),
    baziChart: buildBaziChartFromProfile(normalizedProfile),
    ziweiChart: buildZiweiChartFromProfile(normalizedProfile),
  };
};

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
  baziSettings: source.baziSettings,
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

type AppShellProps = {
  platformConfig: PlatformClientConfig;
};

/**
 * What the K-line series memos return when nothing can render them.
 *
 * A stable module-level constant rather than a fresh object per render, so a
 * panel that does receive it never sees a changed identity. The shape matches
 * the "sequence too short to chart" result `buildQimenKline` already produces.
 */
const EMPTY_RELATIONSHIP_KLINES = {
  "double-hour": buildQimenKline([], "relationship"),
  day: buildQimenKline([], "relationship"),
  month: buildQimenKline([], "relationship"),
  year: buildQimenKline([], "relationship"),
};

const PLATFORM_CATALOG_TIMEOUT_MS = 2500;
const withPlatformCatalogTimeout = <T,>(promise: Promise<T>) => Promise.race([
  promise,
  new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("平台目录请求超时。")), PLATFORM_CATALOG_TIMEOUT_MS)),
]);

/**
 * The phone layout is a different composition, not a style pass. A ≤720px
 * viewport cannot hold the desktop masthead (identity + account cluster +
 * ten-tab rail) and still leave room for the chart, so the shell swaps to an
 * app bar plus a fixed action bar. This stays `false` through SSR and the first
 * client render so hydration matches the server markup, then flips on mount.
 * Environments without `matchMedia` (jsdom) keep the desktop composition.
 */
const MOBILE_VIEWPORT_QUERY = "(max-width: 720px)";

function useIsMobileViewport(query = MOBILE_VIEWPORT_QUERY) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [query]);
  return isMobile;
}

export function AppShell({ platformConfig }: AppShellProps) {
  const [initialState] = useState(() => getInitialState());
  const [mode, setMode] = useState<WorkbenchMode>("qimen");
  const [classicWorkspace, setClassicWorkspace] = useState<"daliuren" | "taiyi" | null>(null);
  const [formState, setFormState] = useState<ProfileInput>(initialState.defaultInput);
  const [birthProfiles, setBirthProfiles] = useState<BirthProfileEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try { const value = JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
  });
  const [birthLibraryOpen, setBirthLibraryOpen] = useState(false);
  const [birthName, setBirthName] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [birthQuery, setBirthQuery] = useState("");
  const [confirmingOverwriteId, setConfirmingOverwriteId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [pinnedBirthId, setPinnedBirthId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem("qmdj-birth-library-pin"); } catch { return null; }
  });
  const [renamingBirthId, setRenamingBirthId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [chartHistory, setChartHistory] = useState<Array<{ id: string; mode: WorkbenchMode; profile: ProfileInput; createdAt: number }>>(() => {
    if (typeof window === "undefined") return [];
    try { const value = JSON.parse(localStorage.getItem("qmdj-chart-history") || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
  });
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
  const [conversationModes, setConversationModes] = useState<Record<WorkbenchMode, AgentConversationMode>>({ qimen: "free", bazi: "free", ziwei: "free", combined: "free", research: "free", astro: "free", "human-design": "free", tarot: "free", "fourth-way": "free", harmonic: "free", huangji: "free", qizheng: "free", "sacred-geometry": "free", runes: "free", uranian: "free" });
  const [agentToolEvents, setAgentToolEvents] = useState<Record<WorkbenchMode, AgentToolEvent[]>>({ qimen: [], bazi: [], ziwei: [], combined: [], research: [], astro: [], "human-design": [], tarot: [], "fourth-way": [], harmonic: [], huangji: [], qizheng: [], "sacred-geometry": [], runes: [], uranian: [] });
  const persistBirthProfiles = (next: BirthProfileEntry[]) => {
    setBirthProfiles(next);
    try { localStorage.setItem("qmdj-birth-library", JSON.stringify(next)); } catch { /* optional */ }
  };
  const startRenameBirthProfile = (id: string, name: string) => {
    setRenamingBirthId(id);
    setRenameDraft(name);
  };
  const cancelRenameBirthProfile = () => {
    setRenamingBirthId(null);
    setRenameDraft("");
  };
  const saveBirthProfile = () => {
    const name = birthName.trim();
    if (!name) return;
    const duplicate = birthProfiles.some((item) => item.name === name);
    persistBirthProfiles([{ id: crypto.randomUUID(), name, profile: formState }, ...birthProfiles.filter((item) => item.name !== name)].slice(0, 50));
    setBirthName("");
    setImportStatus(duplicate ? `已覆盖同名档案「${name}」` : `已保存「${name}」`);
  };
  const deleteBirthProfile = (id: string) => {
    const target = birthProfiles.find((item) => item.id === id);
    persistBirthProfiles(birthProfiles.filter((item) => item.id !== id));
    if (renamingBirthId === id) cancelRenameBirthProfile();
    setConfirmingDeleteId(null);
    setConfirmingOverwriteId(null);
    if (target) setImportStatus(`已删除「${target.name}」`);
  };
  const commitRenameBirthProfile = () => {
    const name = renameDraft.trim();
    if (!renamingBirthId || !name) { cancelRenameBirthProfile(); return; }
    const duplicate = birthProfiles.some((item) => item.id !== renamingBirthId && item.name === name);
    persistBirthProfiles(birthProfiles.map((item) => (item.id === renamingBirthId ? { ...item, name } : item)));
    cancelRenameBirthProfile();
    setImportStatus(duplicate ? `已改名为「${name}」，与既有档案同名` : `已改名为「${name}」`);
  };
  const exportBirthProfiles = () => {
    if (!birthProfiles.length) return;
    const blob = new Blob([serializeBirthLibrary(birthProfiles)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `知几生日库-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setImportStatus(`已导出 ${birthProfiles.length} 条`);
  };
  const importBirthProfiles = (file: File) => {
    setImportStatus("正在导入…");
    readFileText(file).then((text) => {
      const { entries, skipped } = parseBirthLibrary(text);
      if (!entries.length) {
        setImportStatus(skipped ? `跳过 ${skipped} 条无效记录，没有可导入档案` : "文件中没有可用档案");
        return;
      }
      persistBirthProfiles(mergeBirthProfiles(birthProfiles, entries));
      setImportStatus(`已导入 ${entries.length} 条${skipped ? `，跳过 ${skipped} 条` : ""}`);
    }).catch(() => setImportStatus("导入失败：无法读取文件"));
  };
  const overwriteBirthProfile = (id: string) => {
    const target = birthProfiles.find((item) => item.id === id);
    persistBirthProfiles(birthProfiles.map((item) => (item.id === id ? { ...item, profile: formState } : item)));
    setConfirmingOverwriteId(null);
    if (target) setImportStatus(`已用当前盘面资料更新「${target.name}」`);
  };
  const toggleBirthPin = (id: string) => {
    const next = pinnedBirthId === id ? null : id;
    setPinnedBirthId(next);
    try {
      if (next) localStorage.setItem("qmdj-birth-library-pin", next);
      else localStorage.removeItem("qmdj-birth-library-pin");
    } catch { /* optional */ }
    const target = birthProfiles.find((item) => item.id === id);
    if (target) setImportStatus(next ? `已置顶「${target.name}」` : `已取消置顶「${target.name}」`);
  };
  const [agentResultCopied, setAgentResultCopied] = useState(false);
  const [quickChartMode, setQuickChartMode] = useState<"single" | "series">("single");
  const [parametersOpen, setParametersOpen] = useState(false);
  const parameterSnapshot = useRef<{ profile: ProfileInput; settings: QimenSettings; sequence: ChartSequenceInput; quick: "single" | "series" } | null>(null);
  const cancelParameters = () => {
    const saved = parameterSnapshot.current;
    if (saved) { setFormState(saved.profile); setQimenSettings(saved.settings); setSequenceFormState(saved.sequence); setQuickChartMode(saved.quick); }
    setError(null);
    setParametersOpen(false);
  };
  const parametersPopoverRef = useRef<HTMLElement | null>(null);
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
  const [klineAiKind, setKlineAiKind] = useState<KlineKind | null>(null);
  const [klineAiError, setKlineAiError] = useState<string | null>(null);
  const [klineAiLoading, setKlineAiLoading] = useState(false);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [baziPairOpen, setBaziPairOpen] = useState(false);
  const [chartAnalysisOpen, setChartAnalysisOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const isMobile = useIsMobileViewport();
  const [platformLoginBusy, setPlatformLoginBusy] = useState(false);
  const [platformLoginError, setPlatformLoginError] = useState<string | null>(null);
  // A guest checkout token is forwarded explicitly to the paid Agent endpoint;
  // login is only required for persistence, not for consuming a paid guest turn.
  const clock = useResolvedClock();
  // Replace the hydration-safe defaults with the visitor's real clock and time
  // zone exactly once. The initial `useState` seeds above run with the fixed
  // instant so the server HTML and the first client render agree; this effect is
  // the single swap, and it only fires once `clock.resolved` flips — hence the
  // `clock` dependency rather than an empty array.
  useEffect(() => {
    if (!clock.resolved) return;
    const currentState = getInitialState(clock.now, clock.timeZone);
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
  }, [clock]);

  useEffect(() => {
    let active = true;
    const restoreOAuthCallback = async () => {
      if (typeof window === "undefined") return;
      const callback = parsePlatformOAuthCallback(window.location.hash);
      if (!callback) return;
      const clearCallback = () => {
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      };
      try {
        const oauthRequest = consumePlatformOAuthRequest(callback.state);
        if (!oauthRequest) throw new Error("登录授权已过期或来源校验失败，请返回首页重新登录。");
        const redirectUri = `${window.location.origin}${PLATFORM_OAUTH_CALLBACK_PATH}`;
        const response = await fetch("/api/platform/session", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: callback.code,
            verifier: oauthRequest.verifier,
            redirect_uri: redirectUri,
          }),
        });
        const result = await response.json().catch(() => ({})) as {
          session?: PlatformSession;
          profile?: PlatformProfile;
          csrf_token?: string;
          error?: string;
        };
        if (!response.ok || !result.session) {
          throw new Error(result.error ?? "平台登录交换失败，请重试。");
        }
        const session = {
          ...result.session,
          access_token: "",
          refresh_token: "",
          csrf_token: result.csrf_token ?? "",
        };
        savePlatformSession(session);
        clearCallback();
        const access = await restorePlatformAccessState(session);
        const client = createProductPlatformClient({
          accessToken: access.session.access_token,
          csrfToken: access.session.csrf_token,
        });
        // A failed or slow catalog / gate / usage read must not undo a login
        // that already succeeded.
        const [gateResult, usageResult, plansResult] = await Promise.allSettled([
          client.getCurrentGate(platformConfig.productCode, platformConfig.accessScope),
          fetchPlatformUsage(access.session.access_token, access.session.csrf_token, AGENT_PLAN_CODE),
          withPlatformCatalogTimeout(listPlatformPlans(platformConfig.productCode)),
        ]);
        if (!active) return;
        const gate = gateResult.status === "fulfilled" ? gateResult.value : null;
        const usage = usageResult.status === "fulfilled" ? usageResult.value : null;
        const plans = plansResult.status === "fulfilled" ? plansResult.value : null;
        const catalogTimedOut = plansResult.status === "rejected" && plansResult.reason instanceof Error && plansResult.reason.message === "平台目录请求超时。";
        const accountDataFailed = gateResult.status === "rejected" || usageResult.status === "rejected";
        setPlatformWorkspace({
          status: "authenticated",
          catalogStatus: plans ? "ready" : catalogTimedOut ? "loading" : "error",
          session: access.session,
          profile: access.profile ?? result.profile ?? null,
          gate,
          usage,
          plans: plans?.items ?? [],
          channels: plans?.channels ?? [],
          error: accountDataFailed ? "账户数据暂时读取失败，请稍后重试。" : null,
        });
        if (usage) {
          setAgentState((current) => Object.fromEntries(Object.entries(current).map(([key, state]) => [
            key,
            { ...state, authMode: "account", usageAvailable: usage.available, usageConsumed: usage.consumed },
          ])) as Record<WorkbenchMode, AgentModeState>);
        }
      } catch (error) {
        if (!loadPlatformSession()) clearPlatformSession();
        clearCallback();
        if (!active) return;
        setPlatformWorkspace((current) => ({
          ...current,
          status: "guest",
          session: null,
          profile: null,
          gate: null,
          usage: null,
          error: error instanceof Error ? error.message : "恢复平台登录失败。",
        }));
      }
    };
    void restoreOAuthCallback();
    return () => { active = false; };
  }, [platformConfig]);

  const partnerNormalizedProfile = useMemo(() => {
    try { return normalizeProfileInput(partnerFormState); } catch { return null; }
  }, [partnerFormState]);
  const partnerBaziChart = useMemo(() => partnerNormalizedProfile ? buildBaziChartFromProfile(partnerNormalizedProfile) : null, [partnerNormalizedProfile]);
  const compatibility = useMemo(() => baziChart && partnerBaziChart ? buildBaziCompatibility(baziChart, partnerBaziChart) : null, [baziChart, partnerBaziChart]);

  const activeQimenChart = sequence[selectedSequenceIndex]?.chart ?? qimenChart;
  // Four 20-chart 奇门 sequences, measured at ~33 ms on this machine. The only
  // consumer is the `research` mode panel, so on the default load — mode
  // `qimen` — the whole thing is built and thrown away, and then built again
  // when the mount effect swaps in the real clock. Build it only when something
  // can actually render it.
  const klineSeriesVisible = mode === "research";
  const relationshipKlines = useMemo(() => {
    if (!klineSeriesVisible) return EMPTY_RELATIONSHIP_KLINES;
    const start = formState.datetime;
    const zone = formState.timeZone;
    try {
      return {
        "double-hour": buildQimenKline(buildChartSequenceByCount(start, zone, "double-hour", 20, qimenSettings), "relationship", "double-hour"),
        day: buildQimenKline(buildChartSequenceByCount(start, zone, "day", 20, qimenSettings), "relationship", "day"),
        month: buildQimenKline(buildChartSequenceByCount(start, zone, "month", 20, qimenSettings), "relationship", "month"),
        year: buildQimenKline(buildChartSequenceByCount(start, zone, "year", 20, qimenSettings), "relationship", "year"),
      };
    } catch {
      return EMPTY_RELATIONSHIP_KLINES;
    }
  }, [klineSeriesVisible, formState.datetime, formState.timeZone, qimenSettings]);
  const relationshipKline = relationshipKlines["double-hour"];
  const activeModeMeta = MODE_META[mode];
  useEffect(() => {
    let cancelled = false;
    const loadPlatformWorkspace = async () => {
      if (typeof window !== "undefined" && parsePlatformOAuthCallback(window.location.hash)) {
        // The callback effect owns this mount while the authorization code is exchanged.
        return;
      }
      if (!platformConfig) {
        setPlatformWorkspace((current) => ({ ...current, status: "error", error: "平台接入配置缺失，暂时无法登录或使用 AI 分析。" }));
        return;
      }

      const plansPromise = listPlatformPlans(platformConfig.productCode);
      // `loadPlatformSession` only knows about local storage. If its record was
      // evicted (private mode, a storage-capped/ITP browser, a manual clear) the
      // httpOnly bridge cookies may still carry a live session, so recover from
      // them before declaring the visitor a guest.
      let session = loadPlatformSession();
      if (!session && hasBridgeSessionHint()) {
        try {
          session = await recoverPlatformSessionFromBridge();
        } catch {
          session = null;
        }
      }
      if (!session) {
        try {
          const plans = await withPlatformCatalogTimeout(plansPromise);
          if (cancelled) return;
          setPlatformWorkspace({ status: "guest", catalogStatus: "ready", session: null, profile: null, gate: null, usage: null, plans: plans.items, channels: plans.channels, error: null });
        } catch (nextError) {
          if (cancelled) return;
          setPlatformWorkspace({
            status: "guest",
            // A slow public catalog must never hide the account action. The
            // catalog can be retried by the next checkout interaction.
            catalogStatus: nextError instanceof Error && nextError.message === "平台目录请求超时。" ? "loading" : "error",
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

      // Authentication and account data are separate concerns. A failed or slow
      // catalog / gate / usage read must never log the user out, so only the
      // restore itself can drop the session.
      let access: Awaited<ReturnType<typeof restorePlatformAccessState>>;
      try {
        access = await restorePlatformAccessState(session);
      } catch (nextError) {
        if (cancelled) return;
        const message = nextError instanceof Error ? nextError.message : "平台登录状态已失效。";
        // `restorePlatformAccessState` clears the stored record only once the
        // refresh token is genuinely past its expiry. If the record survives,
        // this was a transient failure and the next load can recover — keep the
        // account visible instead of bouncing the user to the login screen.
        const retained = loadPlatformSession();
        let plans: PlatformPlanState = { items: [], channels: [] };
        try { plans = await withPlatformCatalogTimeout(plansPromise); } catch { /* catalog is retried later */ }
        if (cancelled) return;
        setPlatformWorkspace({
          status: retained ? "authenticated" : "guest",
          catalogStatus: "ready",
          session: retained,
          profile: null,
          gate: null,
          usage: null,
          plans: plans.items,
          channels: plans.channels,
          error: message,
        });
        return;
      }

      const client = createProductPlatformClient({ accessToken: access.session.access_token, csrfToken: access.session.csrf_token });
      const [gateResult, usageResult, plansResult] = await Promise.allSettled([
        client.getCurrentGate(platformConfig.productCode, platformConfig.accessScope),
        fetchPlatformUsage(access.session.access_token, access.session.csrf_token, AGENT_PLAN_CODE),
        withPlatformCatalogTimeout(plansPromise),
      ]);
      if (cancelled) return;
      const gate = gateResult.status === "fulfilled" ? gateResult.value : null;
      const usage = usageResult.status === "fulfilled" ? usageResult.value : null;
      const plans = plansResult.status === "fulfilled" ? plansResult.value : null;
      const catalogTimedOut = plansResult.status === "rejected" && plansResult.reason instanceof Error && plansResult.reason.message === "平台目录请求超时。";
      const accountDataFailed = gateResult.status === "rejected" || usageResult.status === "rejected";
      setPlatformWorkspace({
        status: "authenticated",
        catalogStatus: plans ? "ready" : catalogTimedOut ? "loading" : "error",
        session: access.session,
        profile: access.profile,
        gate,
        usage,
        plans: plans?.items ?? [],
        channels: plans?.channels ?? [],
        error: accountDataFailed ? "账户数据暂时读取失败，请稍后重试。" : null,
      });
      if (usage) {
        setAgentState((current) => Object.fromEntries(Object.entries(current).map(([key, state]) => [
          key,
          { ...state, authMode: "account", usageAvailable: usage.available, usageConsumed: usage.consumed },
        ])) as Record<WorkbenchMode, AgentModeState>);
      }
    };

    void loadPlatformWorkspace();
    return () => {
      cancelled = true;
    };
  }, [platformConfig]);

  const handlePlatformLogin = async () => {
    if (typeof window === "undefined" || platformLoginBusy) return;
    setPlatformLoginBusy(true);
    setPlatformLoginError(null);
    try {
      const login = await preparePlatformOAuthLogin(platformConfig, window.location.origin);
      savePlatformOAuthRequest(login.request);
      window.location.assign(login.url);
    } catch (loginError) {
      setPlatformLoginBusy(false);
      setPlatformLoginError(loginError instanceof Error ? loginError.message : "无法打开统一登录，请稍后重试。");
    }
  };

  const handlePlatformLogout = async () => {
    const session = platformWorkspace.session;
    try {
      if (session) await createProductPlatformClient({ accessToken: session.access_token, csrfToken: session.csrf_token }).logout();
    } catch {
      // The local session is cleared even if the platform logout request has expired.
    }
    await fetch("/api/platform/session", { method: "DELETE" }).catch(() => undefined);
    clearPlatformSession();
    clearActiveAgentSession();
    setPlatformWorkspace((current) => ({ ...current, status: "guest", session: null, profile: null, gate: null, usage: null }));
    setAgentState((current) => Object.fromEntries(Object.entries(current).map(([key, state]) => [
      key,
      { ...state, authMode: "guest", usageAvailable: 0, usageConsumed: 0 },
    ])) as Record<WorkbenchMode, AgentModeState>);
  };

  const handlePlatformSwitchAccount = async () => {
    await handlePlatformLogout();
    await handlePlatformLogin();
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
  const astroChart = useMemo<AstroChart>(() => buildAstroChart(normalizedProfile), [normalizedProfile]);
  const humanDesignChart = useMemo<HumanDesignChart>(() => buildHumanDesignChart(normalizedProfile), [normalizedProfile]);
  const [tarotSeed, setTarotSeed] = useState<string | undefined>(undefined);
  const [tarotSpreadId, setTarotSpreadId] = useState<TarotSpreadId>("three-card");
  const tarotReading = useMemo<TarotReading>(() => buildTarotReading(normalizedProfile, tarotSeed, tarotSpreadId), [normalizedProfile, tarotSeed, tarotSpreadId]);
  const astroStructuredText = useMemo(() => serializeAstroToStructuredText(astroChart), [astroChart]);
  const humanDesignStructuredText = useMemo(() => serializeHumanDesignToStructuredText(humanDesignChart), [humanDesignChart]);
  const tarotStructuredText = useMemo(() => serializeTarotToStructuredText(tarotReading), [tarotReading]);
  const fourthWayStructuredText = useMemo(() => serializeFourthWayToStructuredText(FOURTH_WAY_CONTENT), []);
  const [harmonic, setHarmonic] = useState(5);
  const harmonicChart = useMemo(() => buildHarmonicChart(normalizedProfile, harmonic), [normalizedProfile, harmonic]);
  const harmonicStructuredText = useMemo(() => serializeHarmonicToStructuredText(harmonicChart), [harmonicChart]);
  const [huangjiYear, setHuangjiYear] = useState(() => String(Number(initialState.normalizedProfile.normalized.datetime.slice(0, 4)) || new Date().getFullYear()));
  const huangjiChronology = useMemo(() => {
    try { return calculateHuangjiChronology(parseHistoricalYear(huangjiYear)); } catch { return null; }
  }, [huangjiYear]);
  const huangjiFallback = useMemo(() => {
    const year = Number(normalizedProfile.normalized.datetime.slice(0, 4)) || new Date().getFullYear();
    return calculateHuangjiChronology({ era: "CE", year });
  }, [normalizedProfile]);
  const huangjiValue = huangjiChronology ?? huangjiFallback;
  const huangjiStructuredText = useMemo(() => serializeHuangjiToStructuredText(huangjiValue), [huangjiValue]);
  const qizhengChart = useMemo(() => buildQizhengChart(normalizedProfile), [normalizedProfile]);
  const qizhengStructuredText = useMemo(() => serializeQizhengToStructuredText(qizhengChart), [qizhengChart]);
  const [sacredPatternId, setSacredPatternId] = useState("flower");
  const [sacredSteps, setSacredSteps] = useState(2);
  const sacredStructuredText = useMemo(() => serializeSacredGeometryToStructuredText(sacredPatternId, sacredSteps), [sacredPatternId, sacredSteps]);
  const [runeSeed, setRuneSeed] = useState("runes");
  const [runeSpreadId, setRuneSpreadId] = useState<SpreadId>("three");
  const runeReading = useMemo(() => buildRuneReading(runeSeed, runeSpreadId), [runeSeed, runeSpreadId]);
  const runesStructuredText = useMemo(() => serializeRunesToStructuredText(runeReading), [runeReading]);
  const [uranianSettings, setUranianSettings] = useState<DialSettings>({ modulus: 90, orb: 1.5 });
  const uranianChart = useMemo(() => buildUranianChart(normalizedProfile, astroChart, uranianSettings), [normalizedProfile, astroChart, uranianSettings]);
  const uranianStructuredText = useMemo(() => serializeUranianToStructuredText(uranianChart), [uranianChart]);

  const researchData = useMemo<ResearchWorkspaceData | null>(() => {
    try {
      const verification = buildVerificationData({
        profile: normalizedProfile,
        qimen: qimenChart,
        bazi: baziChart,
        ziwei: ziweiChart,
      });
      // Build a new array instead of assigning to `verification.rows`. The
      // builder returns a fresh object today, so the assignment happens to be
      // harmless — but a memo result is the memo's value, and the moment the
      // builder caches, or a second memo shares the object, the mutation would
      // leak into an unrelated render.
      const rows: VerificationRow[] = [
        ...verification.rows.filter((item) => item.system !== "奇门" || item.field !== "参考引擎"),
        ...qimenVerificationRows,
      ];
      if (qimenChart && qimenVerificationRows.length === 0) {
        rows.push({
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
        verification: { ...verification, rows },
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
                format: "ziwei-llm-compact-v2",
                payload: JSON.parse(serializeZiweiToCompactJson(ziweiChart)),
                structuredText: ziweiStructuredText,
              }
            : undefined,
        });
      case "research":
        return researchContext.text;
      case "astro":
        return astroStructuredText;
      case "human-design":
        return humanDesignStructuredText;
      case "tarot":
        return tarotStructuredText;
      case "fourth-way":
        return fourthWayStructuredText;
      case "harmonic":
        return harmonicStructuredText;
      case "huangji":
        return huangjiStructuredText;
      case "qizheng":
        return qizhengStructuredText;
      case "sacred-geometry":
        return sacredStructuredText;
      case "runes":
        return runesStructuredText;
      case "uranian":
        return uranianStructuredText;
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
    astroStructuredText,
    humanDesignStructuredText,
    tarotStructuredText,
    fourthWayStructuredText,
    harmonicStructuredText,
    huangjiStructuredText,
    qizhengStructuredText,
    sacredStructuredText,
    runesStructuredText,
    uranianStructuredText,
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
                format: "ziwei-llm-compact-v2",
                payload: JSON.parse(serializeZiweiToCompactJson(ziweiChart)),
              }
            : undefined,
        });
      case "research":
        return researchContext.json;
      case "astro":
        return serializeAstroToCompactJson(astroChart);
      case "human-design":
        return serializeHumanDesignToCompactJson(humanDesignChart);
      case "tarot":
        return serializeTarotToCompactJson(tarotReading);
      case "fourth-way":
        return serializeFourthWayToCompactJson(FOURTH_WAY_CONTENT);
      case "harmonic":
        return serializeHarmonicToCompactJson(harmonicChart);
      case "huangji":
        return serializeHuangjiToCompactJson(huangjiValue);
      case "qizheng":
        return serializeQizhengToCompactJson(qizhengChart);
      case "sacred-geometry":
        return serializeSacredGeometryToCompactJson(sacredPatternId, sacredSteps);
      case "runes":
        return serializeRunesToCompactJson(runeReading);
      case "uranian":
        return serializeUranianToCompactJson(uranianChart);
    }
  }, [mode, sequence, activeQimenChart, normalizedProfile, qimenChart, baziChart, ziweiChart, researchContext.json, astroChart, humanDesignChart, tarotReading, harmonicChart, huangjiValue, qizhengChart, sacredPatternId, sacredSteps, runeReading, uranianChart]);

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
    setTarotSeed(undefined);
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
      astro: { ...current.astro, content: "", model: null, error: null, loading: false },
      "human-design": { ...current["human-design"], content: "", model: null, error: null, loading: false },
      tarot: { ...current.tarot, content: "", model: null, error: null, loading: false },
      "fourth-way": { ...current["fourth-way"], content: "", model: null, error: null, loading: false },
      harmonic: { ...current.harmonic, content: "", model: null, error: null, loading: false },
      huangji: { ...current.huangji, content: "", model: null, error: null, loading: false },
      qizheng: { ...current.qizheng, content: "", model: null, error: null, loading: false },
      "sacred-geometry": { ...current["sacred-geometry"], content: "", model: null, error: null, loading: false },
      uranian: { ...current.uranian, content: "", model: null, error: null, loading: false },
      runes: { ...current.runes, content: "", model: null, error: null, loading: false },
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
      const nextHistory = [{ id: crypto.randomUUID(), mode, profile: nextInput, createdAt: Date.now() }, ...chartHistory].slice(0, 50);
      setChartHistory(nextHistory);
      try { localStorage.setItem("qmdj-chart-history", JSON.stringify(nextHistory)); } catch { /* optional */ }
      setParametersOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "生成排盘失败。");
      // Keep the last successful reading visible while the input is corrected.
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

  // 排盘口径（用局法/节气/遁type/局数/年分界）不在这里直接重排：
  // 调整盘面是一个草稿面板（打开时快照、取消时回滚、点「应用并重新排盘」才生效），
  // 所以 ChartForm 只回写 setQimenSettings，重排统一走 handleGenerate / handleGenerateSequence。

  const handleModeChange = (nextMode: WorkbenchMode) => {
    setMode(nextMode);
    setCopyState("idle");
    setClassicWorkspace(null);
    setParametersOpen(false);
  };

  const handleClassicWorkspaceOpen = (kind: "daliuren" | "taiyi") => {
    // The two classic boards are research tools rather than a new Agent mode.
    // Reuse the existing gated research Agent so its exact structured text and
    // compact JSON stay attached to the selected method.
    setMode("research");
    setResearchTool(kind);
    setClassicWorkspace(kind);
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

  // Entitlement truth belongs to the platform, never to local storage.
  //
  // An account state carries a `usageAvailable` that was restored from local
  // storage, so it must not decide the account path: only the live
  // `platformWorkspace.usage` may. Reading the cached count here would let a
  // stale "9 次" from a previous session re-enable the analysis entry after the
  // platform has already exhausted (or revoked) the entitlement, and the user
  // would only find out from a server-side gate error mid-conversation.
  //
  // Guests are different: the platform exposes reserve/commit/release for a
  // guest checkout token but no read-only balance endpoint, so the cached count
  // stays a hint for them. That is safe because every turn re-reserves against
  // the platform, so a stale hint can send a guest into a conversation that
  // fails — it can never hand out a free analysis.
  const canUseAgentState = (state: AgentModeState) =>
    state.authMode === "account"
      ? platformWorkspace.status === "authenticated"
        && Boolean(platformWorkspace.session)
        && (platformWorkspace.usage?.available ?? 0) > 0
      : state.usageAvailable > 0 && Boolean(state.checkoutToken);

  // The account balance is the authoritative source after login/redeem. An
  // active guest session can be restored from local storage at the same time
  // as the platform session, so never let that stale mode shadow an account
  // entitlement that is already visible in the account bar.
  const getAccountAgentState = (state: AgentModeState): AgentModeState | null => {
    if (platformWorkspace.status !== "authenticated" || !platformWorkspace.session || !platformWorkspace.usage || platformWorkspace.usage.available <= 0) {
      return null;
    }
    return {
      ...state,
      authMode: "account",
      checkoutToken: "",
      orderId: "",
      usageAvailable: platformWorkspace.usage.available,
      usageConsumed: platformWorkspace.usage.consumed,
    };
  };

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
      // `restorePlatformAccessState` clears the stored record only once the
      // refresh token is genuinely past its expiry. A transient failure must not
      // drop the account, or the user is bounced to guest for a slow network.
      if (!loadPlatformSession()) {
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
      } else {
        setPlatformWorkspace((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "账户数据暂时读取失败，请稍后重试。",
        }));
      }
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
        const client = createProductPlatformClient({ accessToken: access.session.access_token, csrfToken: access.session.csrf_token });
        [gate, usage] = await Promise.all([
          client.getCurrentGate(platformConfig.productCode, platformConfig.accessScope),
          fetchPlatformUsage(access.session.access_token, access.session.csrf_token, AGENT_PLAN_CODE),
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
      setInvitationCodeMessage(`兑换成功：${redemption.plan_title}，获得 ${redemption.credits_granted} ${redemption.usage_label}；当前可用 ${redemption.available}。${refreshWarning}`);
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
    const paymentScene: "web" | "wap" = window.matchMedia("(max-width: 767px)").matches ? "wap" : "web";
    const supportsScene = (channel: { ready: boolean; mobile_ready: boolean }) => paymentScene === "wap" ? channel.mobile_ready : channel.ready;
    let paymentChannel = platformWorkspace.channels.find(supportsScene)?.channel ?? "";
    if (!paymentChannel) {
      if (platformWorkspace.catalogStatus === "loading") {
        throw new Error("正在读取支付方式，请稍候再发起支付。");
      }
      try {
        const catalog = await listPlatformPlans(platformConfig.productCode);
        paymentChannel = catalog.channels.find(supportsScene)?.channel ?? "";
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
        throw new Error(paymentScene === "wap" ? "平台当前没有已开通的手机支付方式，请稍后重试或使用电脑完成支付。" : "当前支付方式暂不可用，请稍后重试。");
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
          paymentScene,
        );
        savePendingPaidAnalysis({
          ...pending,
          orderId: checkout.orderId,
          productCode: platformConfig.productCode,
          checkoutToken: "",
          checkoutMode: "account",
          returnPath: "/paipan",
        });
        window.location.assign(checkout.providerCheckoutUrl);
        return;
      }

      const checkout = await createGuestCheckout(planCode, paymentChannel);
      const payment = await createGuestPaymentAttempt(
        checkout,
        paymentChannel,
        returnUrl(checkout.order.order_id),
        paymentScene,
      );
      savePendingPaidAnalysis({
        ...pending,
        orderId: checkout.order.order_id,
        productCode: platformConfig.productCode,
        checkoutToken: checkout.checkout_token,
        checkoutMode: "guest",
        returnPath: "/paipan",
      });
      if (!payment.provider_checkout_url) throw new Error("平台没有返回收银台地址，未继续发起支付。");
      window.location.href = payment.provider_checkout_url;
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
      const existing = getAccountAgentState(agentState.bazi)
        ?? Object.values(agentState).find((state) => canUseAgentState(state))
        ?? agentState.bazi;
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
        mode: kind === "life" ? "bazi" : "qimen",
        question: kind === "life"
          ? "请对这组基于八字大运与流年的‘人生 K 线’做精确 AI 取象。必须吸收载荷中每一个规则 K 点的 evidence、score、delta、phase 与八字原始字段；以当前条件分出上、中、下三条可验证的人生世界线，各自给出触发条件、观察时间窗、现实行动建议、停止条件和复盘条件。不得把任何路径写成确定结果。"
          : "请对这组奇门序列盘的感情 K 线做精确的 AI 取象。必须吸收载荷中每一个规则 K 点的 evidence、score、delta、phase 与原始序列盘字段；以当前条件分出上、中、下三条可验证的可能路径，各自给出触发条件、观察时间窗、现实行动建议、停止条件和复盘条件。不得把任何路径写成确定结果。",
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

  const handleAgentAnalyze = async (questionOverride?: string) => {
    if (!structuredText || !jsonPayload) {
      return;
    }

    const currentState = agentState[mode];
    const sharedState = getAccountAgentState(currentState)
      ?? (canUseAgentState(currentState)
        ? currentState
        : Object.values(agentState).find((state) => canUseAgentState(state)) ?? currentState);
    const enteredQuestion = (questionOverride ?? currentState.question).trim();
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

    // Chat submission is owned by assistant-ui. This entry handles checkout only.
    if (canUseAgentState(sharedState)) {
      handleAgentQuestionChange(currentQuestion);
      setAgentState(current => ({ ...current, [mode]: { ...current[mode], loading: false } }));
      return;
    }
    try {

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

  // `popCompletedPaidAnalysis` below is a destructive read, so this effect is not
  // idempotent — and React double-invokes mount effects in development, which is
  // exactly the shape a remount has too. On the second run the completed record is
  // gone, so the effect falls through to the session restore and rebuilds the mode
  // state from a snapshot that has no `model` (the session deliberately stores
  // messages, not the model label): the paid turn keeps its content but silently
  // loses which model produced it, and a stale session can pull the workspace back
  // to another mode. The work is genuinely once-per-page-load, so latch it.
  //
  // The latch cannot make a *remount* behave like the first run — by then the
  // record really is consumed — so the destructive read itself stays a known
  // limitation of the storage API rather than something this effect can repair.
  const consumedCompletedAnalysis = useRef(false);
  useEffect(() => {
    if (consumedCompletedAnalysis.current) return;
    consumedCompletedAnalysis.current = true;
    const savedKline = loadKlineAiResult();
    if (savedKline?.content) {
      setKlineAiContent(savedKline.content);
      setKlineAiKind(savedKline.klineKind ?? null);
    }
    const completed = popCompletedPaidAnalysis();
    const active = completed ?? loadActiveAgentSession();
    if (!active) return;
    if (completed?.analysisProduct === "kline") {
      setKlineAiContent(completed.content);
      setKlineAiKind(completed.klineKind ?? null);
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

  // `agentStreamConfig` is rebuilt on every render, but the `onFinish` callback it
  // hands out is captured by the stream when the request starts and may run
  // seconds later, after any number of renders. Reading `agentState` or
  // `streamSharedState` from that closure writes a state object derived from a
  // stale snapshot, reverting whatever changed meanwhile — for instance a second
  // turn that finished first and already decremented the usage counters. The ref
  // is kept current on every commit so `onFinish` can read the latest state
  // without depending on the render it was created in.
  const latestAgentState = useRef(agentState);
  const previousChartContext = useRef<{ profile: ProfileInput; structuredText: string; jsonPayload: string } | null>(null);
  useEffect(() => {
    latestAgentState.current = agentState;
  }, [agentState]);

  const streamSharedState = getAccountAgentState(agentState[mode])
    ?? (canUseAgentState(agentState[mode])
      ? agentState[mode]
      : Object.values(agentState).find((state) => canUseAgentState(state)) ?? agentState[mode]);
  const agentStreamConfig = canUseAgentState(streamSharedState) ? {
    chatId: `qmdj-agent-${mode}`,
    requestBody: {
      mode,
      focus: streamSharedState.focus,
      researchTool: mode === "research" ? researchTool : undefined,
      structuredText: agentState[mode].sessionStructuredText || structuredText,
      jsonPayload: agentState[mode].sessionJsonPayload || jsonPayload,
    } satisfies Record<string, unknown>,
    requestHeaders: async () => {
      const accessToken = streamSharedState.authMode === "account"
        ? (await refreshPlatformAccount()).session.access_token
        : undefined;
      return buildAgentRequestHeaders(streamSharedState, accessToken);
    },
    onStart: () => setAgentState((current) => ({ ...current, [mode]: { ...current[mode], loading: true, error: null } })),
    onFinish: (messages: AgentConversationMessage[], completed = true) => {
      const assistant = messages.filter((message) => message.role === "assistant").at(-1)?.content ?? "";
      const delta = completed ? 1 : 0;
      const latest = latestAgentState.current;
      const previous = latest[mode];
      // Re-resolve the shared state from the latest snapshot for the same reason.
      const latestShared = getAccountAgentState(previous)
        ?? (canUseAgentState(previous)
          ? previous
          : Object.values(latest).find((state) => canUseAgentState(state)) ?? previous);
      const nextAvailable = Math.max(previous.usageAvailable - delta, 0);
      const nextConsumed = previous.usageConsumed + delta;
      const nextState = {
        ...previous,
        authMode: latestShared.authMode,
        checkoutToken: latestShared.checkoutToken,
        orderId: latestShared.orderId,
        question: "",
        content: assistant,
        loading: false,
        error: null,
        conversation: messages,
        usageAvailable: nextAvailable,
        usageConsumed: nextConsumed,
        sessionStructuredText: previous.sessionStructuredText || structuredText,
        sessionJsonPayload: previous.sessionJsonPayload || jsonPayload,
      };
      setAgentState((current) => ({ ...current, [mode]: nextState }));
      saveActiveAgentSession({ orderId: nextState.orderId, checkoutToken: nextState.checkoutToken, checkoutMode: nextState.authMode, mode, focus: nextState.focus, structuredText: nextState.sessionStructuredText, jsonPayload: nextState.sessionJsonPayload, messages, usageAvailable: nextAvailable, usageConsumed: nextConsumed, totalTurns: nextState.totalTurns, updatedAt: Date.now() });
      setPlatformWorkspace((current) => ({ ...current, usage: current.usage ? { ...current.usage, available: nextAvailable, consumed: nextConsumed } : current.usage }));
    },
    onError: (message: string) => setAgentState((current) => ({ ...current, [mode]: { ...current[mode], loading: false, error: message } })),
    onToolEvent: (_event: AgentStreamEvent) => undefined,
    onChartContextUpdate: (event: AgentChartUpdate) => {
      if (event.mode !== mode) {
        setAgentState((current) => ({ ...current, [mode]: { ...current[mode], error: `Agent 生成了${event.mode === "qimen" ? "奇门" : event.mode === "bazi" ? "八字" : "紫微"}盘，请切换到对应盘面查看。` } }));
        return;
      }
      previousChartContext.current = { profile: formState, structuredText, jsonPayload };
      setAgentState((current) => ({ ...current, [mode]: { ...current[mode], sessionStructuredText: event.structuredText, sessionJsonPayload: event.jsonPayload, error: null } }));
      if (event.profile) {
        setFormState(event.profile);
        void handleGenerate(event.profile);
      }
    },
    onRestoreChartContext: () => {
      const previous = previousChartContext.current;
      if (!previous) return;
      setFormState(previous.profile);
      void handleGenerate(previous.profile);
    },
  } : undefined;

  // The counter next to the analysis entry has to agree with the gate above it.
  // For an authenticated account the live platform balance wins over the cached
  // count, otherwise the panel advertises turns the platform has already spent.
  const displayedUsage = platformWorkspace.status === "authenticated" && platformWorkspace.usage
    ? { usageAvailable: platformWorkspace.usage.available, usageConsumed: platformWorkspace.usage.consumed }
    : Object.values(agentState).find((state) => canUseAgentState(state)) ?? agentState[mode];

  const agentInspector = (
    <InspectorPanel
      agentTitle={classicWorkspace === "daliuren" ? "大六壬 Agent 分析" : classicWorkspace === "taiyi" ? "太乙 Agent 分析" : "AI 分析"}
      agentAngles={AGENT_ANALYSIS_ANGLES[mode]}
      agentError={agentState[mode].error}
      agentConversation={agentState[mode].conversation}
      agentFollowUps={AGENT_FOLLOW_UP_QUESTIONS[mode]}
      agentLoading={agentState[mode].loading || Boolean(platformCheckoutLoading)}
      agentModel={agentState[mode].model}
      agentQuestion={agentState[mode].question}
      isInterviewZeroState={agentState[mode].focus === "人生议题访谈" && !agentState[mode].question.trim() && agentState[mode].conversation.length === 0}
      agentUsageAvailable={displayedUsage.usageAvailable}
      agentUsageConsumed={displayedUsage.usageConsumed}
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
      onRecalculate={(datetime) => handleGenerate({ ...formState, datetime })}
      mode={mode}
      onAgentAnalyze={handleAgentAnalyze}
      onCopyResult={handleCopyAgentResult}
      onCopyJson={handleCopyJson}
      onCopyText={handleCopyText}
      onAgentQuestionChange={handleAgentQuestionChange}
      selectedPalace={mode === "qimen" ? selectedPalace : null}
      structuredText={structuredText}
      agentStreamConfig={agentStreamConfig}
      conversationMode={conversationModes[mode]}
      onConversationModeChange={(nextMode) => setConversationModes((current) => ({ ...current, [mode]: nextMode }))}
      toolEvents={agentToolEvents[mode]}
      activeAgentCaseId={null}
      onToolEvent={(event) => { setAgentToolEvents((current) => ({ ...current, [mode]: [...current[mode], event].slice(-8) })); if (event.type === "tool_result" && event.status === "error") setAgentState((current) => ({ ...current, [mode]: { ...current[mode], error: event.summary } })); }}
      onChartContextUpdate={(event) => agentStreamConfig?.onChartContextUpdate?.(event)}
    />
  );

  const shiftChartDateTime = (hours: number) => {
    const nextDatetime = shiftDateTimeInput(formState.datetime, hours);
    if (nextDatetime === formState.datetime) return;
    const nextValue = { ...formState, datetime: nextDatetime };
    setFormState(nextValue);
    handleGenerate(nextValue);
  };

  useEffect(() => {
    if (!chartAnalysisOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChartAnalysisOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [chartAnalysisOpen]);

  useEffect(() => {
    if (!parametersOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
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

            {activeQimenChart ? <QimenPatternPanel chart={activeQimenChart} /> : null}
          </>
        ) : null}

        {mode === "bazi" ? <>
          {!baziPairOpen ? <BaziPanel chart={baziChart} now={clock.now} /> : null}
          <BaziReversePanel
            settings={formState.baziSettings ?? DEFAULT_BAZI_SETTINGS}
            chart={baziChart}
            onApply={(datetime) => handleGenerate({ ...formState, datetime })}
          />
          <BaziCompatibilityPanel value={compatibility} chart={baziChart} partnerChart={partnerBaziChart} datetime={partnerFormState.datetime} gender={partnerFormState.gender} onDatetimeChange={(datetime) => setPartnerFormState((current) => ({ ...current, datetime }))} onGenderChange={(gender) => setPartnerFormState((current) => ({ ...current, gender }))} onPurchase={handleCompatibilityPurchase} loading={compatibilityLoading} open={baziPairOpen} onOpenChange={setBaziPairOpen} />
        </> : null}

        {mode === "ziwei" ? <ZiweiPanel value={formState} chart={ziweiChart} /> : null}

        {mode === "astro" ? <DivinationPanel kind="astro" value={astroChart} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "human-design" ? <DivinationPanel kind="human-design" value={humanDesignChart} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "tarot" ? <DivinationPanel kind="tarot" value={tarotReading} onSpreadChange={(next) => { setTarotSpreadId(next); setTarotSeed(crypto.randomUUID()); setCopyState("idle"); }} onRedraw={() => { setTarotSeed(crypto.randomUUID()); setCopyState("idle"); }} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "fourth-way" ? <FourthWayPanel content={FOURTH_WAY_CONTENT} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "harmonic" ? <HarmonicPanel value={harmonicChart} onHarmonicChange={(next) => { setHarmonic(next); setCopyState("idle"); }} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "huangji" ? <HuangjiPanel value={huangjiValue} yearInput={huangjiYear} yearError={!huangjiChronology} onYearChange={(next) => { setHuangjiYear(next); setCopyState("idle"); }} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "qizheng" ? <QizhengPanel value={qizhengChart} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "sacred-geometry" ? <SacredGeometryPanel patternId={sacredPatternId} steps={sacredSteps} onPatternChange={(id) => { setSacredPatternId(id); setSacredSteps(2); setCopyState("idle"); }} onStepsChange={(next) => { setSacredSteps(next); setCopyState("idle"); }} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "runes" ? <RunesPanel reading={runeReading} onSpreadChange={(id) => { setRuneSpreadId(id); setCopyState("idle"); }} onRedraw={() => { setRuneSeed(crypto.randomUUID()); setCopyState("idle"); }} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}
        {mode === "uranian" ? <UranianPanel chart={uranianChart} onModulusChange={(modulus) => { setUranianSettings((current) => ({ ...current, modulus })); setCopyState("idle"); }} onOrbChange={(orb) => { setUranianSettings((current) => ({ ...current, orb })); setCopyState("idle"); }} onCopyJson={handleCopyJson} jsonCopied={copyState === "json"} /> : null}

        {mode === "research" ? (
          <KlinePanel
            life={lifeKline}
            relationship={relationshipKline}
            relationshipScales={relationshipKlines}
            aiContent={klineAiContent}
            aiKind={klineAiKind}
            aiError={klineAiError}
            loading={klineAiLoading || Boolean(platformCheckoutLoading === KLINE_PLAN_CODE)}
            onAnalyze={handleKlineAnalyze}
            now={clock.resolved ? clock.now : undefined}
            aiPriceLabel={(() => {
              const plan = platformWorkspace.plans.find((item) => item.plan_code === KLINE_PLAN_CODE);
              return plan ? `¥${(plan.price_cny / 100).toFixed(2)}` : "读取平台套餐后购买";
            })()}
          />
        ) : null}

      </div>
      {mode === "qimen" && activeQimenChart ? <SummaryStrip chart={activeQimenChart} /> : null}
    </section>
  );

  const workbenchSidebar = (
    <aside className="sidebar-panel" data-mode={mode}>
      {/* The split only moves the life-decision control room to Shengtian.
          The chart product keeps the original per-chart Agent analysis beside
          Qimen/Bazi/Ziwei, including single-chart and sequence evidence. */}
      {mode !== "combined" && !chartAnalysisOpen ? agentInspector : null}

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
      onQimenSettingsChange={setQimenSettings}
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
      showSubmitAction={false}
      deferTimeSubmit
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
          <strong>兑换平台权益</strong>
          <p>额度类型、数量和有效期由平台套餐及邀请码配置决定。</p>
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

  const chartAnalysisToggle = (
    <button
      type="button"
      className="chart-analysis-toggle"
      aria-controls="chart-analysis-drawer"
      aria-expanded={chartAnalysisOpen}
      onClick={() => setChartAnalysisOpen(true)}
    >
      <span>AI</span>
      盘面分析
    </button>
  );

  const chartAnalysisOverlay = chartAnalysisOpen
    && typeof document !== "undefined"
    ? createPortal(
      <div className="product-chart chart-analysis-portal">
        <div className="chart-analysis-drawer is-open" aria-hidden={false}>
          <button
            type="button"
            className="chart-analysis-drawer__backdrop"
            aria-label="关闭盘面分析"
            onClick={() => setChartAnalysisOpen(false)}
          />
          <section className="chart-analysis-drawer__panel" id="chart-analysis-drawer" role="dialog" aria-label="盘面分析台" aria-modal="true">
            <header className="chart-analysis-drawer__header">
              <strong>AI 分析</strong>
              <button type="button" onClick={() => setChartAnalysisOpen(false)} aria-label="关闭盘面分析">×</button>
            </header>
            {/* The compact analysis drawer owns a single inspector instance;
                rendering the full sidebar here would duplicate its tabs while
                the main workbench remains mounted underneath the portal. */}
            {agentInspector}
          </section>
        </div>
      </div>,
      document.body,
    )
    : null;

  // Keep a stable DOM anchor for chart integrations and smoke tests even while
  // the analysis drawer is closed. The interactive dialog remains portalized
  // and is mounted only on demand.
  const chartAnalysisAnchor = !chartAnalysisOpen
    ? <div data-layout="chart-analysis-drawer" aria-hidden="true" hidden />
    : null;

  const openParameters = () => {
    parameterSnapshot.current = { profile: formState, settings: qimenSettings, sequence: sequenceFormState, quick: quickChartMode };
    setError(null);
    setParametersOpen(true);
  };

  const platformAccount = (
    <div className="platform-account" aria-label="平台账户与 AI 权益">
      {platformWorkspace.status === "checking" ? (
        <span className="platform-account__status">正在读取账户…</span>
      ) : platformWorkspace.status === "authenticated" ? (
        <>
          <span className="platform-account__status">
            {platformWorkspace.profile?.display_name || platformWorkspace.profile?.phone_number || "已登录"}
            <small>{platformWorkspace.usage ? `AI 余 ${platformWorkspace.usage.available} ${platformWorkspace.usage.usage_label || "轮"}` : "权益已连接"}</small>
          </span>
          {invitationRedeemControl}
          <button type="button" className="platform-account__button" onClick={() => void handlePlatformSwitchAccount()}>切换账户</button>
          <button type="button" className="platform-account__button" onClick={() => void handlePlatformLogout()}>退出登录</button>
        </>
      ) : (
        <>
          <span className="platform-account__status">游客模式 · 当前标签页可恢复 <small>关闭页面或换设备可能丢失恢复信息</small></span>
          {invitationRedeemControl}
          <button type="button" className="platform-account__button is-primary" disabled={platformLoginBusy} onClick={() => void handlePlatformLogin()}>{platformLoginBusy ? "正在打开登录…" : "登录平台账户"}</button>
          {platformLoginError ? <span className="platform-account__error" role="alert">{platformLoginError}</span> : null}
        </>
      )}
    </div>
  );

  const loadBirthProfile = (item: BirthProfileEntry) => {
    setFormState(item.profile);
    handleGenerate(item.profile);
    setBirthLibraryOpen(false);
    // 最近使用置顶：用过一次就移到最前，下次更好找。
    if (birthProfiles[0]?.id !== item.id) {
      persistBirthProfiles([item, ...birthProfiles.filter((entry) => entry.id !== item.id)]);
    }
  };
  const normalizedBirthQuery = birthQuery.trim().toLowerCase();
  const visibleBirthProfiles = normalizedBirthQuery
    ? birthProfiles.filter((item) => item.name.toLowerCase().includes(normalizedBirthQuery) || item.profile.datetime.includes(normalizedBirthQuery))
    : birthProfiles;
  // 置顶档案永远排最前，其余沿用「最近使用置顶」的顺序。
  const pinnedBirthEntry = pinnedBirthId ? visibleBirthProfiles.find((item) => item.id === pinnedBirthId) : undefined;
  const orderedBirthProfiles = pinnedBirthEntry
    ? [pinnedBirthEntry, ...visibleBirthProfiles.filter((item) => item.id !== pinnedBirthId)]
    : visibleBirthProfiles;

  const birthLibraryPanel = (
    <div className="birth-library-popover" role="dialog" aria-label="姓名与生日库">
      <strong>姓名与生日库</strong>
      <div className="birth-library-save"><input value={birthName} onChange={(event) => setBirthName(event.target.value)} placeholder="姓名" aria-label="姓名" /><button type="button" onClick={saveBirthProfile}>保存当前</button></div>
      <div className="birth-library-tools">
        <button type="button" onClick={exportBirthProfiles} disabled={!birthProfiles.length}>导出</button>
        <label className="birth-library-import">导入<input type="file" accept="application/json,.json" aria-label="导入生日库文件" onChange={(event) => { const file = event.target.files?.[0]; if (file) importBirthProfiles(file); event.target.value = ""; }} /></label>
        {importStatus ? <span className="birth-library-status" role="status">{importStatus}</span> : null}
      </div>
      {birthProfiles.length ? <input className="birth-library-search" value={birthQuery} onChange={(event) => setBirthQuery(event.target.value)} placeholder="搜索姓名或生日" aria-label="搜索生日库" /> : null}
      {orderedBirthProfiles.map((item) => renamingBirthId === item.id ? (
        <div className="birth-library-item birth-library-item--renaming" key={item.id}>
          <input
            className="birth-library-rename"
            value={renameDraft}
            autoFocus
            aria-label={`重命名${item.name}`}
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); commitRenameBirthProfile(); }
              if (event.key === "Escape") { event.preventDefault(); cancelRenameBirthProfile(); }
            }}
          />
          <button type="button" onClick={commitRenameBirthProfile} disabled={!renameDraft.trim()}>保存</button>
          <button type="button" aria-label="取消重命名" onClick={cancelRenameBirthProfile}>取消</button>
        </div>
      ) : confirmingOverwriteId === item.id ? (
        <div className="birth-library-item birth-library-item--renaming" key={item.id}>
          <span className="birth-library-confirm">用当前盘面资料覆盖「{item.name}」？</span>
          <button type="button" onClick={() => overwriteBirthProfile(item.id)}>覆盖</button>
          <button type="button" aria-label="取消覆盖" onClick={() => setConfirmingOverwriteId(null)}>取消</button>
        </div>
      ) : confirmingDeleteId === item.id ? (
        <div className="birth-library-item birth-library-item--renaming" key={item.id}>
          <span className="birth-library-confirm">确认删除「{item.name}」？</span>
          <button type="button" onClick={() => deleteBirthProfile(item.id)}>删除</button>
          <button type="button" aria-label="取消删除" onClick={() => setConfirmingDeleteId(null)}>取消</button>
        </div>
      ) : (
        <div className="birth-library-item" key={item.id}>
          <button type="button" onClick={() => loadBirthProfile(item)}>{item.id === pinnedBirthId ? "★ " : ""}{item.name}<small>{formatBirthProfileMeta(item.profile)}</small></button>
          <button type="button" aria-label={`${item.id === pinnedBirthId ? "取消置顶" : "置顶"}${item.name}`} onClick={() => toggleBirthPin(item.id)}>★</button>
          <button type="button" aria-label={`重命名${item.name}`} onClick={() => startRenameBirthProfile(item.id, item.name)}>✎</button>
          <button type="button" aria-label={`更新${item.name}`} onClick={() => { setConfirmingDeleteId(null); setConfirmingOverwriteId(item.id); }}>⟳</button>
          <button type="button" aria-label={`删除${item.name}`} onClick={() => { setConfirmingOverwriteId(null); setConfirmingDeleteId(item.id); }}>×</button>
        </div>
      ))}
      {chartHistory.length ? <><strong className="birth-library-history-title">历史排盘</strong>{chartHistory.slice(0, 8).map((item) => <button type="button" className="birth-library-history" key={item.id} onClick={() => { setFormState(item.profile); handleGenerate(item.profile); setBirthLibraryOpen(false); }}>{item.mode} · {new Date(item.createdAt).toLocaleString("zh-CN")}</button>)}</> : null}
      {birthProfiles.length && !visibleBirthProfiles.length ? <small>没有匹配「{birthQuery.trim()}」的档案</small> : null}
      {!birthProfiles.length && !chartHistory.length ? <small>暂无保存档案</small> : null}
    </div>
  );

  const parametersOverlay = mode !== "research" && parametersOpen ? createPortal(
    <div className={parameterStyles.overlay}>
      <button type="button" tabIndex={-1} aria-label="关闭调整盘面" className={parameterStyles.backdrop} onClick={cancelParameters} />
      <section ref={parametersPopoverRef} id="chart-parameters-popover" className={parameterStyles.panel} role="dialog" aria-modal="true" aria-label="调整盘面" onKeyDown={event => {
        if(event.key === "Escape") {event.stopPropagation();cancelParameters();}
        if(event.key === "Tab" && event.currentTarget.contains(event.target as Node)) {
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(node => node.getClientRects().length);
          const first = items[0], last = items.at(-1);
          if(event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
          else if(!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
        }
      }}>
        <header className={parameterStyles.head}><div><small>CHART / PARAMETERS</small><h2>调整盘面</h2></div><button type="button" autoFocus aria-label="关闭调整盘面" onClick={cancelParameters}>关闭 ×</button></header>
        <div className={parameterStyles.body}><h3>{activeModeMeta.title} · 排盘资料</h3><p>修改后点击“应用并重新排盘”；取消会恢复打开前的设置。</p>{mode === "combined" ? <p>默认三盘共用一组时间资料；在「调整盘面」勾选「三盘分别用不同时间」后，奇门用问事起局时间，八字 / 紫微用出生时间。</p> : null}{chartModeControls}{chartParametersForm}{error ? <p role="alert" className={parameterStyles.error}>{error}</p> : null}</div>
        <footer className={parameterStyles.foot}><button type="button" onClick={cancelParameters}>取消</button><button type="button" onClick={() => {if(mode === "qimen" && quickChartMode === "series") handleGenerateSequence(sequenceFormState); else handleGenerate(formState);}}>应用并重新排盘 ↗</button></footer>
      </section>
    </div>, document.body
  ) : null;

  const mobileActionBar = isMobile ? (
    <nav className="mobile-action-bar" aria-label="排盘操作">
      {mode !== "research" && !classicWorkspace ? (
        <button type="button" className="mobile-action" aria-controls="chart-parameters-popover" aria-expanded={parametersOpen} aria-haspopup="dialog" onClick={openParameters}>调整盘面</button>
      ) : null}
      {mode !== "research" && !classicWorkspace ? (
        <button type="button" className="mobile-action" aria-expanded={birthLibraryOpen} onClick={() => setBirthLibraryOpen((value) => !value)}>生日库</button>
      ) : null}
      <div className="mobile-action mobile-action--materials">
        <ChartMaterials text={structuredText} json={jsonPayload} literature={agentLiteratureContext} />
      </div>
      {mode !== "combined" && !classicWorkspace ? (
        <button type="button" className="mobile-action mobile-action--primary" onClick={() => setChartAnalysisOpen(true)}>
          <span>AI</span>盘面分析
        </button>
      ) : null}
    </nav>
  ) : null;

  const mobileSheets = isMobile ? (
    <>
      {mobileAccountOpen ? (
        <div className="mobile-sheet" role="presentation">
          <button type="button" className="mobile-sheet__backdrop" aria-label="关闭账户" onClick={() => setMobileAccountOpen(false)} />
          <section className="mobile-sheet__panel" role="dialog" aria-modal="true" aria-label="账户与权益">
            <header className="mobile-sheet__head"><strong>账户与权益</strong><button type="button" aria-label="关闭账户" onClick={() => setMobileAccountOpen(false)}>×</button></header>
            <div className="mobile-sheet__body">{platformAccount}</div>
          </section>
        </div>
      ) : null}
      {birthLibraryOpen && mode !== "research" && !classicWorkspace ? (
        <div className="mobile-sheet" role="presentation">
          <button type="button" className="mobile-sheet__backdrop" aria-label="关闭生日库" onClick={() => setBirthLibraryOpen(false)} />
          <section className="mobile-sheet__panel" role="dialog" aria-modal="true" aria-label="姓名与生日库">
            <header className="mobile-sheet__head"><strong>生日库</strong><button type="button" aria-label="关闭生日库" onClick={() => setBirthLibraryOpen(false)}>×</button></header>
            <div className="mobile-sheet__body">{birthLibraryPanel}</div>
          </section>
        </div>
      ) : null}
    </>
  ) : null;

  return (
    <div className="page-shell product-chart" data-mode={mode} data-shell={isMobile ? "mobile" : "desktop"}>
      {isMobile ? (
        <header className="mobile-hero">
          <div className="mobile-hero__top">
            <div className="mobile-hero__brand">
              <h1>知几</h1>
            </div>
            <button type="button" className="mobile-account-trigger" onClick={() => setMobileAccountOpen(true)} aria-haspopup="dialog" aria-expanded={mobileAccountOpen}>
              <span>{platformWorkspace.status === "checking" ? "读取账户…" : platformWorkspace.status === "authenticated" ? (platformWorkspace.profile?.display_name || platformWorkspace.profile?.phone_number || "已登录") : "游客模式"}</span>
              <small>{platformWorkspace.usage ? `AI 余 ${platformWorkspace.usage.available} ${platformWorkspace.usage.usage_label || "轮"}` : "账户与权益"}</small>
            </button>
          </div>
          <ModeTabs mode={mode} onChange={handleModeChange} classicActive={classicWorkspace} onClassicSelect={handleClassicWorkspaceOpen} />
        </header>
      ) : (
        <header className="observatory-hero">
          <div className="observatory-hero__copy">
            <h1>知几</h1>
          </div>

          <ModeTabs mode={mode} onChange={handleModeChange} classicActive={classicWorkspace} onClassicSelect={handleClassicWorkspaceOpen} />

          <div className="observatory-hero__materials">
            <ChartMaterials text={structuredText} json={jsonPayload} literature={agentLiteratureContext} />
          </div>

          {platformAccount}

          {mode !== "research" && !classicWorkspace ? (
            <button
              className="hero-action"
              type="button"
              aria-controls="chart-parameters-popover"
              aria-expanded={parametersOpen}
              aria-haspopup="dialog"
              onClick={openParameters}
            >
              调整盘面
            </button>
          ) : null}
          {mode !== "research" && !classicWorkspace ? <div className="birth-library-control">
            <button type="button" className="hero-action" onClick={() => setBirthLibraryOpen((value) => !value)}>生日库</button>
            {birthLibraryOpen ? birthLibraryPanel : null}
          </div> : null}

          <div className="observatory-hero__agent-entry">
            {mode === "combined" || mode === "research" ? (
              <span className="observatory-hero__agent-status">{mode === "combined" ? "三盘数据已注入 Agent" : "研究材料已注入 Agent"}</span>
            ) : null}
          </div>
        </header>
      )}

      {error ? <p className="error-banner">{error}</p> : null}

      {classicWorkspace ? (
        <main className="analysis-layout analysis-layout--classic" aria-label={classicWorkspace === "daliuren" ? "大六壬观测" : "太乙神数观测"}>
          <ClassicObservatoryPanel kind={classicWorkspace} value={researchData?.[classicWorkspace] ?? null} />
          <aside className="classic-agent-rail agent-surface-host" aria-label={`${classicWorkspace === "daliuren" ? "大六壬" : "太乙神数"} Agent 分析`}>
            {agentInspector}
          </aside>
        </main>
      ) : mode === "combined" ? (
        <CombinedMap qimen={qimenChart} bazi={baziChart} ziwei={ziweiChart}
          agent={agentInspector} onQuestion={handleAgentQuestionChange} />
      ) : (
        <>
          <main
            id="qimen-workbench-layout"
            className="analysis-layout analysis-panel-group paipan-workspace"
            aria-label="排盘主盘与智能分析分栏"
          >
            <section id="qimen-chart" className="analysis-panel">
              {workbenchCanvas}
              {isMobile ? null : chartAnalysisToggle}
            </section>
            <div id="qimen-workbench-separator" className="analysis-panel-divider" aria-hidden="true">
              <span className="analysis-panel-divider__grip" aria-hidden="true">
                <GripVertical size={17} strokeWidth={1.8} />
              </span>
            </div>
            <section id="qimen-agent" className="analysis-panel">
              {workbenchSidebar}
            </section>
          </main>
          {chartAnalysisAnchor}
          {chartAnalysisOverlay}
        </>
      )}

      {mobileActionBar}
      {mobileSheets}
      {parametersOverlay}

      <footer className="qmdj-footer">
        <div className="qmdj-footer__compact">
          <span>知几</span><span>© 2026 知几排盘</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">鄂ICP备2026026686号-1</a>
        </div>
      </footer>

    </div>
  );
}
