import { noStore } from "@/lib/http";
import { errorResponse, UserFacingError } from "@/lib/api-error";
import { createAgentEventStreamResponse, requestAgentAnalysis, streamAgentAnalysis } from "@/lib/agent/chat";
import {
  commitGuestUsage,
  commitPlatformUsage,
  fetchPlatformGate,
  readGuestCheckoutToken,
  readBearerToken,
  releasePlatformUsage,
  releaseGuestUsage,
  reservePlatformUsage,
  reserveGuestUsage,
  AGENT_PLAN_CODE,
  KLINE_PLAN_CODE,
} from "@/lib/platform/server";
import { settledCommit, type SettledUsage } from "@/lib/platform/settled-commit";
import { readProviderUsage } from "@/lib/platform/ai-contract";
import { reportPlatformTokenUsage } from "@/lib/platform/ai-platform-adapter";
import type { WorkbenchMode } from "@/lib/workbench/types";

const WORKBENCH_MODES: WorkbenchMode[] = ["qimen", "bazi", "ziwei", "combined", "research", "astro", "human-design", "tarot"];
const MAX_HISTORY_MESSAGES = 18;
// These caps exist to bound the prompt — and therefore the token bill — per
// charged analysis. The workbench only ever sends the *active* chart (a
// sequence is never posted), and the largest legitimate payload measured is
// ~15 KB of structured text plus ~24 KB of JSON for a combined three-chart
// reading. The previous 180 KB / 260 KB limits were ~12x that and allowed a
// single request to carry ~110k tokens of attacker-controlled context.
const MAX_STRUCTURED_TEXT_LENGTH = 60_000;
const MAX_JSON_LENGTH = 80_000;
const MAX_TOTAL_PAYLOAD_LENGTH = 120_000;
const PLATFORM_COOKIE_NAMES = new Set(["ssp_access", "ssp_refresh", "ssp_csrf"]);
const COOKIE_ALIASES: Record<string, string> = {
  qmdj_platform_access: "ssp_access",
  qmdj_platform_refresh: "ssp_refresh",
  qmdj_platform_csrf: "ssp_csrf",
};
const readPlatformCookieHeader = (cookieHeader: string | null) => (cookieHeader ?? "")
  .split(";")
  .map((part) => part.trim())
  .map((part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return "";
    const name = COOKIE_ALIASES[part.slice(0, separator)] ?? part.slice(0, separator);
    return PLATFORM_COOKIE_NAMES.has(name) ? `${name}=${part.slice(separator + 1)}` : "";
  })
  .filter(Boolean)
  .join("; ");
const readCookieValue = (cookieHeader: string | null, name: string) => {
  const names = [name, ...Object.entries(COOKIE_ALIASES).filter(([, target]) => target === name).map(([source]) => source)];
  return (cookieHeader ?? "").split(";").map((part) => part.trim()).map((part) => {
    const separator = part.indexOf("=");
    return separator < 1 ? null : { name: part.slice(0, separator), value: part.slice(separator + 1) };
  }).find((part) => part && names.includes(part.name))?.value ?? "";
};
const isWorkbenchMode = (value: unknown): value is WorkbenchMode =>
  typeof value === "string" && WORKBENCH_MODES.includes(value as WorkbenchMode);

export async function POST(request: Request) {
  let reservationId = "";
  let guestToken = "";
  let accessToken = "";
  let reservationPlanCode = AGENT_PLAN_CODE;
  let reservationMode: "account" | "guest" = "guest";
  let platformCookieHeader = "";
  let platformCsrfToken = "";
  // Set once the model has produced output. From that moment the reservation
  // must never be released: releasing refunds a user who already holds the
  // analysis, so a platform hiccup would become a free analysis.
  let delivered = false;
  try {
    accessToken = readBearerToken(request.headers.get("authorization")) ?? "";
    platformCookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
    platformCsrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
    const qmdjAccessToken = readCookieValue(request.headers.get("cookie"), "ssp_access");
    if (!accessToken && qmdjAccessToken) accessToken = qmdjAccessToken;
    guestToken = readGuestCheckoutToken(request.headers.get("x-guest-checkout-token")) ?? "";
    if (!accessToken && !platformCookieHeader && !guestToken) {
      return noStore(
        { error: "请先登录并开通 AI 分析，或使用已完成支付的游客凭证。", reasonCode: "analysis_access_required" },
        { status: 401 },
      );
    }

    let body: {
      mode?: unknown;
      question?: unknown;
      focus?: unknown;
      researchTool?: unknown;
      history?: unknown;
      messages?: unknown;
      structuredText?: unknown;
      jsonPayload?: unknown;
      analysisProduct?: unknown;
      conversationMode?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return noStore({ error: "请求体格式无效。" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return noStore({ error: "请求体格式无效。" }, { status: 400 });
    }

    const analysisProduct = body.analysisProduct === undefined || body.analysisProduct === "agent"
      ? "agent"
      : body.analysisProduct === "kline"
        ? "kline"
        : null;
    if (!analysisProduct) {
      return noStore({ error: "无效的分析产品。" }, { status: 400 });
    }
    const conversationMode = body.conversationMode === undefined || ["free", "interview", "calibration", "recalculate"].includes(String(body.conversationMode))
      ? body.conversationMode as "free" | "interview" | "calibration" | "recalculate" | undefined
      : null;
    if (conversationMode === null) return noStore({ error: "Agent 工作模式无效。" }, { status: 400 });
    // Life K lines are derived from Bazi dayun/liunian, while relationship
    // K lines are derived from Qimen sequences. Keep this boundary explicit
    // so the model can never receive the wrong source contract.
    if (analysisProduct === "kline" && body.mode !== "qimen" && body.mode !== "bazi") {
      return noStore({ error: "K 线 AI 仅支持八字人生线或奇门感情线。" }, { status: 400 });
    }

    if (!isWorkbenchMode(body.mode)) {
      return noStore({ error: "无效的分析模式。" }, { status: 400 });
    }

    if (typeof body.structuredText !== "string" || !body.structuredText.trim()) {
      return noStore({ error: "缺少结构化文本。" }, { status: 400 });
    }
    if (body.structuredText.length > MAX_STRUCTURED_TEXT_LENGTH) {
      return noStore({ error: "结构化盘面过大，请缩小序列范围后再分析。" }, { status: 413 });
    }

    if (typeof body.jsonPayload !== "string" || !body.jsonPayload.trim()) {
      return noStore({ error: "缺少 JSON 载荷。" }, { status: 400 });
    }
    if (body.jsonPayload.length > MAX_JSON_LENGTH) {
      return noStore({ error: "JSON 盘面过大，请缩小序列范围后再分析。" }, { status: 413 });
    }
    // Bound the prompt as a whole, not just each field independently: the two
    // limits above could otherwise be combined into one oversized request.
    if (body.structuredText.length + body.jsonPayload.length > MAX_TOTAL_PAYLOAD_LENGTH) {
      return noStore({ error: "盘面上下文总量过大，请缩小序列范围后再分析。" }, { status: 413 });
    }
    try {
      JSON.parse(body.jsonPayload);
    } catch {
      return noStore({ error: "JSON 载荷格式无效，请重新生成盘面。" }, { status: 400 });
    }

    if (body.question !== undefined && (typeof body.question !== "string" || body.question.length > 2000)) {
      return noStore({ error: "分析问题不能超过 2000 字。" }, { status: 400 });
    }

    if (body.focus !== undefined && (typeof body.focus !== "string" || body.focus.length > 80)) {
      return noStore({ error: "分析方向无效。" }, { status: 400 });
    }

    if (body.researchTool !== undefined && (typeof body.researchTool !== "string" || body.researchTool.length > 40)) {
      return noStore({ error: "研究工具无效。" }, { status: 400 });
    }

    if (body.history !== undefined) {
      if (!Array.isArray(body.history) || body.history.length > MAX_HISTORY_MESSAGES) {
        return noStore({ error: "对话上下文过长，请从当前问题重新开始。" }, { status: 400 });
      }
      const invalidHistory = body.history.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          !(["user", "assistant"] as unknown[]).includes((item as { role?: unknown }).role) ||
          typeof (item as { content?: unknown }).content !== "string" ||
          ((item as { content: string }).content.length > 4000),
      );
      if (invalidHistory) {
        return noStore({ error: "对话上下文格式无效。" }, { status: 400 });
      }
    }

    // AI SDK UI transports send the complete message list. Normalize it to
    // the product's compact conversation contract so follow-up turns use the
    // same server-side prompt path as the legacy JSON client.
    let transportHistory: Array<{ role: "user" | "assistant"; content: string }> | undefined;
    if (body.messages !== undefined) {
      if (!Array.isArray(body.messages) || body.messages.length > MAX_HISTORY_MESSAGES) {
        return noStore({ error: "对话上下文过长，请从当前问题重新开始。" }, { status: 400 });
      }
      transportHistory = [];
      for (const item of body.messages) {
        if (!item || typeof item !== "object") return noStore({ error: "对话上下文格式无效。" }, { status: 400 });
        const role = (item as { role?: unknown }).role;
        if (role !== "user" && role !== "assistant") return noStore({ error: "对话上下文格式无效。" }, { status: 400 });
        const parts = (item as { parts?: unknown }).parts;
        const content = Array.isArray(parts)
          ? parts.filter((part): part is { type: "text"; text: string } => Boolean(part) && typeof part === "object" && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string").map((part) => part.text).join("")
          : typeof (item as { content?: unknown }).content === "string" ? (item as { content: string }).content : "";
        if (!content || content.length > 4000) return noStore({ error: "对话上下文格式无效。" }, { status: 400 });
        transportHistory.push({ role, content });
      }
    }

    reservationPlanCode = analysisProduct === "kline" ? KLINE_PLAN_CODE : AGENT_PLAN_CODE;
    let reservation: { reservation_id: string };
    if (accessToken || platformCookieHeader) {
      reservationMode = "account";
      const accountOptions = accessToken ? undefined : { cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken };
      const gate = await fetchPlatformGate(accessToken || null, accountOptions);
      if (!gate.allowed) {
        return noStore(
          {
            error: gate.message || "当前账户还没有这项 AI 分析权益。",
            reasonCode: gate.reason_code || "entitlement_gate_blocked",
            gate,
          },
          { status: 402 },
        );
      }
      reservation = accessToken
        ? await reservePlatformUsage(accessToken, { planCode: reservationPlanCode })
        : await reservePlatformUsage(null, { planCode: reservationPlanCode, cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken });
    } else {
      reservation = await reserveGuestUsage(guestToken, { planCode: reservationPlanCode });
    }
    reservationId = reservation.reservation_id;
    if (!reservationId) {
      throw new UserFacingError("无法预留本次分析。请刷新后重试。");
    }

    const normalizedHistory = transportHistory ?? (Array.isArray(body.history)
      ? body.history.map((item) => ({
          role: (item as { role: "user" | "assistant" }).role,
          content: (item as { content: string }).content,
        }))
      : undefined);
    const latestUserQuestion = normalizedHistory?.filter((item) => item.role === "user").at(-1)?.content;
    const analysisPayload = {
      mode: body.mode,
      question: typeof body.question === "string" ? body.question : latestUserQuestion,
      focus: typeof body.focus === "string" ? body.focus : undefined,
      researchTool: typeof body.researchTool === "string" ? body.researchTool : undefined,
      history: normalizedHistory,
      structuredText: body.structuredText,
      jsonPayload: body.jsonPayload,
      analysisProduct,
      conversationMode,
    } as const;

    if (request.headers.get("x-agent-stream") === "1" && analysisProduct === "agent") {
      let streamSettled = false;
      const requestId = crypto.randomUUID();
      // One decision point for the whole stream. The previous split between a
      // `release` callback and a `commit` callback could mark the stream settled
      // in `release`, notice the analysis had already been delivered, and return
      // — which left the reservation dangling forever *and* permanently blocked
      // `commit`, so who paid was decided by platform reconciliation instead of
      // by us.
      //
      // Reading `delivered` and flipping the flag happen in the same synchronous
      // block (no `await` in between), so the choice cannot be raced: a delivered
      // analysis is always committed, an undelivered one is always released.
      const settle = async (providerUsage?: unknown, providerModel?: string) => {
        if (streamSettled || !reservationId) return;
        const deliveredToClient = delivered;
        streamSettled = true;
        try {
          if (reservationMode === "account") {
            if (deliveredToClient) {
              // A settled reservation is not a failure to retry — see `settled-commit.ts`.
              await settledCommit("agent", `reservation ${reservationId}`, () => accessToken
                ? commitPlatformUsage(accessToken, reservationId, { planCode: reservationPlanCode })
                : commitPlatformUsage(null, reservationId, { planCode: reservationPlanCode, cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken }));
            } else if (accessToken) {
              await releasePlatformUsage(accessToken, reservationId, { planCode: reservationPlanCode });
            } else {
              await releasePlatformUsage(null, reservationId, { planCode: reservationPlanCode, cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken });
            }
          } else if (deliveredToClient) {
            // The guest commit raises the same terminal 409 as the account one.
            await settledCommit("agent", `reservation ${reservationId}`, () => commitGuestUsage(guestToken, reservationId, { planCode: reservationPlanCode }));
          } else {
            await releaseGuestUsage(guestToken, reservationId, { planCode: reservationPlanCode });
          }
          if (deliveredToClient) {
            const usage = readProviderUsage(providerUsage);
            if (usage?.inputTokens !== undefined || usage?.outputTokens !== undefined) {
              await reportPlatformTokenUsage({
                providerCode: process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY ? "gemini" : "openai-compatible",
                modelCode: providerModel || process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "unknown",
                usage,
                idempotencyKey: `${requestId}:agent-token-usage`,
              });
            }
          }
        } finally {
          // Clearing the id in `finally` is what makes this the *only* settle:
          // a failed commit must not be retried by a later callback (that would
          // double-charge) and a failed release must not be retried either. Both
          // are left for platform reconciliation.
          reservationId = "";
        }
      };
      const result = streamAgentAnalysis(analysisPayload, {
        abortSignal: request.signal,
        onChunk: () => { delivered = true; },
        onFinish: async (_text, usage, model) => settle(usage, model),
        onError: async () => { await settle(); },
        onAbort: async () => { await settle(); },
      });
      return createAgentEventStreamResponse(result as { fullStream: AsyncIterable<unknown> });
    }

    const commitUsage = () => reservationMode === "account"
      ? accessToken
        ? commitPlatformUsage(accessToken, reservationId, { planCode: reservationPlanCode })
        : commitPlatformUsage(null, reservationId, { planCode: reservationPlanCode, cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken })
      : commitGuestUsage(guestToken, reservationId, { planCode: reservationPlanCode });

    const result = await requestAgentAnalysis(analysisPayload);
    // The analysis now exists, so the reservation is no longer releasable.
    delivered = true;

    // A transient commit failure must not be converted into a refund. Retry
    // briefly, and if it still fails let the error surface while leaving the
    // reservation in place for platform-side reconciliation.
    // `SettledUsage` is in the union because a reservation the platform already
    // settled resolves to a reconciliation marker rather than a usage summary.
    let usage: Awaited<ReturnType<typeof commitUsage>> | SettledUsage | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // `settledCommit` resolves the platform's terminal 409 instead of throwing,
        // so an already-settled reservation neither retries three times nor fails.
        usage = await settledCommit("agent", `reservation ${reservationId}`, commitUsage);
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    reservationId = "";

    const providerUsage = readProviderUsage(result.usage);
    if (providerUsage?.inputTokens !== undefined || providerUsage?.outputTokens !== undefined) {
      await reportPlatformTokenUsage({
        providerCode: process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY ? "gemini" : "openai-compatible",
        modelCode: result.model || process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "unknown",
        usage: providerUsage,
        idempotencyKey: `${crypto.randomUUID()}:agent-token-usage`,
      });
    }

    return noStore({ ...result, usage });
  } catch (error) {
    // Only release when the analysis was never produced. Releasing after
    // delivery would refund a user who already received the content.
    if (reservationId && !delivered) {
      if (reservationMode === "account" && (accessToken || platformCookieHeader)) {
        try {
          if (accessToken) {
            await releasePlatformUsage(accessToken, reservationId, { planCode: reservationPlanCode });
          } else {
            await releasePlatformUsage(null, reservationId, { planCode: reservationPlanCode, cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken });
          }
        } catch {
          // Preserve the original failure; the platform will release stale reservations.
        }
      } else if (guestToken) {
        try {
          await releaseGuestUsage(guestToken, reservationId, { planCode: reservationPlanCode });
        } catch {
          // Preserve the original failure; the platform will release stale reservations.
        }
      }
    }
    return errorResponse(error, "AI 分析请求失败。");
  }
}
