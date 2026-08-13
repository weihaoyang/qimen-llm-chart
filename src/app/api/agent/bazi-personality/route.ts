import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { requestBaziPersonalityPrediction } from "@/lib/agent/bazi-personality";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import {
  serializeBaziToCompactJson,
  serializeBaziToStructuredText,
} from "@/lib/bazi/serializer";
import { normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildResearchFeatureSnapshot } from "@/lib/bazi/research-feature-snapshot";
import { getActiveResearchRuleRelease } from "@/lib/bazi/research-rule-repository";
import { applyResearchRules } from "@/lib/bazi/research-rules";

const MAX_CLOCK_SKEW_SECONDS = 300;
const BAZI_TRAIT_IDS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "emotional_stability",
] as const;
const MBTI_AXIS_IDS = ["ei", "sn", "tf", "jp"] as const;
const MBTI_AXIS_LETTERS = {
  ei: ["I", "E"],
  sn: ["S", "N"],
  tf: ["F", "T"],
  jp: ["P", "J"],
} as const;
const mbtiDirectionForScore = (axis: (typeof MBTI_AXIS_IDS)[number], score: number) =>
  score >= 55 ? MBTI_AXIS_LETTERS[axis][1] : score <= 45 ? MBTI_AXIS_LETTERS[axis][0] : "X";
const DAY_MASTER_STRENGTHS = new Set([
  "extreme-strong",
  "strong",
  "balanced",
  "weak",
  "extreme-weak",
  "disputed",
]);
const FOLLOW_STRUCTURES = new Set([
  "not-supported",
  "follow-strong-candidate",
  "follow-weak-candidate",
  "follow-wealth-candidate",
  "follow-officer-killing-candidate",
  "follow-output-candidate",
  "transformation-candidate",
  "disputed",
]);
const DAY_MASTER_STRENGTH_ALIASES: Record<string, string> = {
  "极旺": "extreme-strong",
  "偏旺": "strong",
  "身强": "strong",
  "强": "strong",
  "中和": "balanced",
  "平衡": "balanced",
  "偏弱": "weak",
  "身弱": "weak",
  "弱": "weak",
  "极弱": "extreme-weak",
  "有争议": "disputed",
  "争议": "disputed",
};
const FOLLOW_STRUCTURE_ALIASES: Record<string, string> = {
  "不支持从格": "not-supported",
  "不从": "not-supported",
  "从强格": "follow-strong-candidate",
  "从强格候选": "follow-strong-candidate",
  "从旺格": "follow-strong-candidate",
  "专旺格候选": "follow-strong-candidate",
  "从弱格": "follow-weak-candidate",
  "从弱格候选": "follow-weak-candidate",
  "从财格": "follow-wealth-candidate",
  "从财格候选": "follow-wealth-candidate",
  "从杀格": "follow-officer-killing-candidate",
  "从杀格候选": "follow-officer-killing-candidate",
  "从官杀格候选": "follow-officer-killing-candidate",
  "从儿格": "follow-output-candidate",
  "从儿格候选": "follow-output-candidate",
  "从食伤格候选": "follow-output-candidate",
  "化气格": "transformation-candidate",
  "化气格候选": "transformation-candidate",
  "有争议": "disputed",
  "争议": "disputed",
};
const PREDICTION_CACHE_TTL_MS = 10 * 60 * 1000;
const predictionCache = new Map<string, { expiresAt: number; value: Record<string, unknown> }>();
const predictionCacheEnabled = process.env.NODE_ENV === "production";
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;
const BASE_PREDICTION_VERSION = "bazi-v3-ziping-luming-rules";
let requestWindowStartedAt = Date.now();
let requestCountInWindow = 0;

const consumeRequestSlot = () => {
  const now = Date.now();
  if (now - requestWindowStartedAt >= REQUEST_WINDOW_MS) {
    requestWindowStartedAt = now;
    requestCountInWindow = 0;
  }
  requestCountInWindow += 1;
  return requestCountInWindow <= MAX_REQUESTS_PER_WINDOW;
};

type BaziPredictionBody = {
  birth_date?: unknown;
  birth_time?: unknown;
  timezone?: unknown;
  gender?: unknown;
  time_basis?: unknown;
  longitude?: unknown;
  calendar?: unknown;
};

const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const parseEvidence = (value: unknown, field: string, minimum = 0) => {
  if (!Array.isArray(value)) throw new Error(`Agent 返回的${field}不符合结构化契约。`);
  const evidence = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (evidence.length < minimum) throw new Error(`Agent 返回的${field}不符合结构化契约。`);
  return evidence;
};

const parseBoundedInteger = (value: unknown, field: string) => {
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    throw new Error(`Agent 返回的${field}不符合结构化契约。`);
  }
  return Math.round(numeric);
};

const parseConfidence = (value: unknown, field: string) => parseBoundedInteger(value, field);

const unwrapAxisScore = (value: unknown): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return record.score ?? record.value ?? record.percentage;
};

const resolveAxisScore = (
  source: Record<string, unknown>,
  axis: (typeof MBTI_AXIS_IDS)[number],
): number => {
  const [lowLetter, highLetter] = MBTI_AXIS_LETTERS[axis];
  const normalized = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key.toLowerCase().replace(/[^a-z]/g, ""), value]),
  );
  const direct = normalized[axis] ?? normalized[`${highLetter.toLowerCase()}${lowLetter.toLowerCase()}`];
  if (direct !== undefined) return parseBoundedInteger(unwrapAxisScore(direct), " MBTI 四维");
  const high = normalized[highLetter.toLowerCase()];
  if (high !== undefined) return parseBoundedInteger(unwrapAxisScore(high), " MBTI 四维");
  const low = normalized[lowLetter.toLowerCase()];
  if (low !== undefined) return 100 - parseBoundedInteger(unwrapAxisScore(low), " MBTI 四维");
  throw new Error("Agent 返回的 MBTI 四维不符合结构化契约。");
};

const verifyInternalSignature = (request: Request, rawBody: string) => {
  const secret = process.env.BAZI_AGENT_INTERNAL_SECRET?.trim();
  if (!secret) return "missing-secret" as const;
  const timestamp = request.headers.get("x-ss-bazi-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-ss-bazi-signature")?.trim() ?? "";
  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

const parsePredictionJson = (content: string) => {
  let normalized = content.trim();
  if (normalized.startsWith("```")) {
    const lines = normalized.split("\n");
    if (lines[0]?.trim().startsWith("```")) lines.shift();
    if (lines.at(-1)?.trim() === "```") lines.pop();
    normalized = lines.join("\n").trim();
  }
  const parsed = JSON.parse(normalized) as Record<string, unknown>;
  const rawMbtiAxes = parsed.mbti_axes;
  if (!rawMbtiAxes || typeof rawMbtiAxes !== "object") {
    throw new Error("Agent 没有返回 MBTI 四维预测。");
  }
  const mbtiAxes = Object.fromEntries(
    MBTI_AXIS_IDS.map((axis) => {
      return [axis, resolveAxisScore(rawMbtiAxes as Record<string, unknown>, axis)];
    }),
  ) as Record<(typeof MBTI_AXIS_IDS)[number], number>;
  const mbtiCode = MBTI_AXIS_IDS.map((axis) => mbtiDirectionForScore(axis, mbtiAxes[axis])).join("");
  const rawDiagnosis = parsed.chart_diagnosis;
  if (!rawDiagnosis || typeof rawDiagnosis !== "object") {
    throw new Error("Agent 没有返回命局结构诊断。");
  }
  const diagnosis = rawDiagnosis as Record<string, unknown>;
  const rawDayMasterStrength = String(diagnosis.day_master_strength ?? "").trim();
  const rawFollowStructure = String(diagnosis.follow_structure ?? "").trim();
  const dayMasterStrength = DAY_MASTER_STRENGTH_ALIASES[rawDayMasterStrength] ?? rawDayMasterStrength;
  const followStructure = FOLLOW_STRUCTURE_ALIASES[rawFollowStructure] ?? rawFollowStructure;
  const structure = String(diagnosis.structure ?? "").trim();
  if (!DAY_MASTER_STRENGTHS.has(dayMasterStrength) || !FOLLOW_STRUCTURES.has(followStructure) || !structure) {
    throw new Error("Agent 返回的命局结构诊断不符合契约。");
  }
  const chartDiagnosis = {
    day_master_strength: dayMasterStrength,
    structure: structure.slice(0, 120),
    follow_structure: followStructure,
    confidence: parseConfidence(diagnosis.confidence, "命局诊断置信度"),
    supporting_evidence: parseEvidence(diagnosis.supporting_evidence, "命局支持证据", 2),
    contradicting_evidence: parseEvidence(diagnosis.contradicting_evidence, "命局反证"),
  };
  const rawAxisEvidence = parsed.mbti_axis_evidence;
  if (!rawAxisEvidence || typeof rawAxisEvidence !== "object") {
    throw new Error("Agent 没有返回 MBTI 四维证据。");
  }
  const mbtiAxisEvidence = Object.fromEntries(
    MBTI_AXIS_IDS.map((axis) => {
      const item = (rawAxisEvidence as Record<string, unknown>)[axis];
      if (!item || typeof item !== "object") throw new Error("Agent 返回的 MBTI 四维证据不符合契约。");
      const record = item as Record<string, unknown>;
      const expectedDirection = mbtiDirectionForScore(axis, mbtiAxes[axis]);
      if (record.direction !== expectedDirection) throw new Error("Agent 返回的 MBTI 四维证据方向不一致。");
      return [axis, {
        direction: expectedDirection,
        confidence: parseConfidence(record.confidence, "MBTI 轴置信度"),
        evidence: parseEvidence(record.evidence, "MBTI 轴证据", 2),
        contradictions: parseEvidence(record.contradictions, "MBTI 轴反证"),
      }];
    }),
  );
  const rawScores = parsed.trait_scores;
  if (!rawScores || typeof rawScores !== "object") {
    throw new Error("Agent 没有返回五维性格分数。");
  }
  const traitScores = Object.fromEntries(
    BAZI_TRAIT_IDS.map((trait) => {
      const value = (rawScores as Record<string, unknown>)[trait];
      return [trait, parseBoundedInteger(value, "性格分数")];
    }),
  );
  const rawHypotheses = Array.isArray(parsed.trait_hypotheses) ? parsed.trait_hypotheses : [];
  const traitHypotheses = rawHypotheses
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 5)
    .map((item) => ({
      trait: String(item.trait ?? ""),
      direction: String(item.direction ?? "moderate"),
      claim: String(item.claim ?? "").slice(0, 280),
      reason: String(item.reason ?? "").slice(0, 480),
    }))
    .filter(
      (item) =>
        BAZI_TRAIT_IDS.includes(item.trait as (typeof BAZI_TRAIT_IDS)[number]) &&
        ["low", "moderate", "high"].includes(item.direction) &&
        item.claim.length > 0 &&
        item.reason.length > 0,
    );
  const narrative = typeof parsed.narrative === "string" ? parsed.narrative.trim() : "";
  if (!narrative) throw new Error("Agent 没有返回性格预测叙事。");
  return {
    mbti_code: mbtiCode,
    mbti_axes: mbtiAxes,
    chart_audit: parsed.chart_audit && typeof parsed.chart_audit === "object" ? parsed.chart_audit : {},
    chart_diagnosis: chartDiagnosis,
    mbti_axis_evidence: mbtiAxisEvidence,
    trait_scores: traitScores,
    trait_hypotheses: traitHypotheses,
    narrative: narrative.slice(0, 6000),
    disclaimer:
      typeof parsed.disclaimer === "string" && parsed.disclaimer.trim()
        ? parsed.disclaimer.trim().slice(0, 800)
        : "这是传统命理叙事映射，不是科学测量，也不构成心理或医学诊断。",
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = verifyInternalSignature(request, rawBody);
  if (signature === "missing-secret") return jsonError("八字 Agent 内部接口未配置密钥。", 503);
  if (!signature) return jsonError("无效的八字 Agent 内部签名。", 401);
  if (!consumeRequestSlot()) return jsonError("八字 Agent 请求过于频繁，请稍后再试。", 429);

  let body: BaziPredictionBody;
  try {
    body = JSON.parse(rawBody) as BaziPredictionBody;
  } catch {
    return jsonError("请求体不是合法 JSON。", 400);
  }

  const birthDate = typeof body.birth_date === "string" ? body.birth_date : "";
  const birthTime = typeof body.birth_time === "string" ? body.birth_time : "";
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
  const gender = body.gender === "male" || body.gender === "female" ? body.gender : null;
  const timeBasis = body.time_basis === "true-solar" ? "true-solar" : "civil";
  const longitude = body.longitude === undefined ? undefined : Number(body.longitude);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{2}:\d{2}$/.test(birthTime) || !timezone || !gender) {
    return jsonError("出生日期、分钟级时间、时区和命理排盘性别口径均为必填。", 400);
  }
  if (body.calendar !== undefined && body.calendar !== "solar") {
    return jsonError("当前内部接口只接受公历出生信息。", 400);
  }
  if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return jsonError("经度必须在 -180 至 180 之间。", 400);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    return jsonError("无效的 IANA 时区。", 400);
  }

  try {
    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = birthTime.split(":").map(Number);
    const profile: ProfileInput = {
      calendarMode: "solar",
      datetime: `${birthDate}T${birthTime}`,
      timeZone: timezone,
      gender,
      timeBasis,
      ...(longitude === undefined ? {} : { location: { longitude } }),
      solar: { year, month, day, hour, minute },
    };
    const chart = buildBaziChartFromProfile(normalizeProfileInput(profile));
    let activeRelease = null;
    try {
      activeRelease = await getActiveResearchRuleRelease();
    } catch {
      activeRelease = null;
    }
    const cacheKey = createHmac("sha256", process.env.BAZI_AGENT_INTERNAL_SECRET ?? "")
      .update(JSON.stringify({ birthDate, birthTime, timezone, gender, timeBasis, longitude, researchRuleHash: activeRelease?.ruleHash ?? "" }))
      .digest("hex");
    const cached = predictionCacheEnabled ? predictionCache.get(cacheKey) : undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ...cached.value, cache_hit: true });
    }
    const analysis = await requestBaziPersonalityPrediction({
      structuredText: serializeBaziToStructuredText(chart),
      jsonPayload: serializeBaziToCompactJson(chart),
    });
    const prediction = parsePredictionJson(analysis.content);
    const auditedDiagnosis = {
      ...prediction.chart_diagnosis,
      day_master_strength: chart.raw.structureAudit.dayMasterStrength,
      follow_structure: chart.raw.structureAudit.followStructure,
      confidence: chart.raw.structureAudit.confidence,
      supporting_evidence: chart.raw.structureAudit.supportingEvidence,
      contradicting_evidence: chart.raw.structureAudit.contradictingEvidence,
    };
    // Research releases are an additive, reversible layer. A missing release
    // table during a rolling migration must not turn a valid baseline reading
    // into a user-facing 502; staging/activation endpoints themselves remain
    // fail-closed.
    if (activeRelease?.basePredictionVersion !== BASE_PREDICTION_VERSION) activeRelease = null;
    const featureSnapshot = buildResearchFeatureSnapshot(
      chart.raw.structureAudit,
      chart.raw.boundaryAudit,
      prediction.mbti_axes,
      prediction.mbti_axis_evidence,
    );
    const adjusted = activeRelease
      ? applyResearchRules(prediction.mbti_axes, featureSnapshot, activeRelease.ruleDefinition)
      : { axes: prediction.mbti_axes, applied: [] };
    const adjustedPrediction = {
      ...prediction,
      mbti_axes: adjusted.axes,
      mbti_code: MBTI_AXIS_IDS.map((axis) => mbtiDirectionForScore(axis, adjusted.axes[axis])).join(""),
      mbti_axis_evidence: Object.fromEntries(MBTI_AXIS_IDS.map((axis) => [axis, {
        ...prediction.mbti_axis_evidence[axis],
        direction: mbtiDirectionForScore(axis, adjusted.axes[axis]),
      }])),
    };
    const generatedAtIso = new Date().toISOString();
    const predictionHash = createHmac("sha256", process.env.BAZI_AGENT_INTERNAL_SECRET ?? "")
      .update(`${cacheKey}.${analysis.model}.${analysis.content}`)
      .digest("hex");
    const pillars = Object.fromEntries(
      chart.raw.pillars.map((pillar) => [pillar.key === "time" ? "hour" : pillar.key, pillar.pillar]),
    );
    const response = {
      prediction_version: activeRelease
        ? `bazi-v4-ziping-luming-rules+${activeRelease.ruleHash.slice(0, 12)}`
        : BASE_PREDICTION_VERSION,
      pillars,
      ...adjustedPrediction,
      chart_audit: chart.raw.structureAudit,
      boundary_audit: chart.raw.boundaryAudit,
      chart_diagnosis: auditedDiagnosis,
      applied_research_rules: activeRelease ? {
        release_contract_version: "qmdj-research-release-v1",
        rule_hash: activeRelease.ruleHash,
        experiment_id: activeRelease.experimentId,
        base_prediction_version: activeRelease.basePredictionVersion,
        base_mbti_axes: prediction.mbti_axes,
        applied: adjusted.applied,
      } : { applied: [] },
      provider: "qmdj-agent",
      model: analysis.model,
      chart_fingerprint: cacheKey,
      prediction_hash: predictionHash,
      generated_at_iso: generatedAtIso,
      prompt_version: "bazi-personality-v4-ziping-luming-rules",
      cache_hit: false,
    };
    if (predictionCacheEnabled) predictionCache.set(cacheKey, { expiresAt: Date.now() + PREDICTION_CACHE_TTL_MS, value: response });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "八字 Agent 生成失败。";
    return jsonError(message, 502);
  }
}
