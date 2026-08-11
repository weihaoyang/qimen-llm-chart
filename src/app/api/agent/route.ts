import { NextResponse } from "next/server";
import { requestAgentAnalysis } from "@/lib/agent/chat";
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
import type { WorkbenchMode } from "@/lib/workbench/types";

const WORKBENCH_MODES: WorkbenchMode[] = ["qimen", "bazi", "ziwei", "combined", "research"];
const MAX_HISTORY_MESSAGES = 18;
const MAX_STRUCTURED_TEXT_LENGTH = 180_000;
const MAX_JSON_LENGTH = 260_000;
const PLATFORM_COOKIE_NAMES = new Set(["ssp_access", "ssp_refresh", "ssp_csrf"]);

const readPlatformCookieHeader = (cookieHeader: string | null) => (cookieHeader ?? "")
  .split(";")
  .map((part) => part.trim())
  .filter((part) => PLATFORM_COOKIE_NAMES.has(part.split("=", 1)[0] ?? ""))
  .join("; ");

const readCookieValue = (cookieHeader: string | null, name: string) => {
  const prefix = `${name}=`;
  return (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? "";
};

const isWorkbenchMode = (value: unknown): value is WorkbenchMode =>
  typeof value === "string" && WORKBENCH_MODES.includes(value as WorkbenchMode);

const isPlatformRequestError = (
  error: unknown,
): error is { status: number; reasonCode?: string; message: string } =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  typeof (error as { status?: unknown }).status === "number" &&
  "message" in error &&
  typeof (error as { message?: unknown }).message === "string";

export async function POST(request: Request) {
  let reservationId = "";
  let guestToken = "";
  let accessToken = "";
  let reservationPlanCode = AGENT_PLAN_CODE;
  let reservationMode: "account" | "guest" = "guest";
  let platformCookieHeader = "";
  let platformCsrfToken = "";
  try {
    accessToken = readBearerToken(request.headers.get("authorization")) ?? "";
    platformCookieHeader = readPlatformCookieHeader(request.headers.get("cookie"));
    platformCsrfToken = readCookieValue(request.headers.get("cookie"), "ssp_csrf");
    guestToken = readGuestCheckoutToken(request.headers.get("x-guest-checkout-token")) ?? "";
    if (!accessToken && !platformCookieHeader && !guestToken) {
      return NextResponse.json(
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
      structuredText?: unknown;
      jsonPayload?: unknown;
      analysisProduct?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "请求体格式无效。" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "请求体格式无效。" }, { status: 400 });
    }

    const analysisProduct = body.analysisProduct === undefined || body.analysisProduct === "agent"
      ? "agent"
      : body.analysisProduct === "kline"
        ? "kline"
        : null;
    if (!analysisProduct) {
      return NextResponse.json({ error: "无效的分析产品。" }, { status: 400 });
    }
    if (analysisProduct === "kline" && body.mode !== "qimen") {
      return NextResponse.json({ error: "K 线 AI 目前只支持奇门序列盘。" }, { status: 400 });
    }

    if (!isWorkbenchMode(body.mode)) {
      return NextResponse.json({ error: "无效的分析模式。" }, { status: 400 });
    }

    if (typeof body.structuredText !== "string" || !body.structuredText.trim()) {
      return NextResponse.json({ error: "缺少结构化文本。" }, { status: 400 });
    }
    if (body.structuredText.length > MAX_STRUCTURED_TEXT_LENGTH) {
      return NextResponse.json({ error: "结构化盘面过大，请缩小序列范围后再分析。" }, { status: 413 });
    }

    if (typeof body.jsonPayload !== "string" || !body.jsonPayload.trim()) {
      return NextResponse.json({ error: "缺少 JSON 载荷。" }, { status: 400 });
    }
    if (body.jsonPayload.length > MAX_JSON_LENGTH) {
      return NextResponse.json({ error: "JSON 盘面过大，请缩小序列范围后再分析。" }, { status: 413 });
    }
    try {
      JSON.parse(body.jsonPayload);
    } catch {
      return NextResponse.json({ error: "JSON 载荷格式无效，请重新生成盘面。" }, { status: 400 });
    }

    if (body.question !== undefined && (typeof body.question !== "string" || body.question.length > 300)) {
      return NextResponse.json({ error: "分析问题不能超过 300 字。" }, { status: 400 });
    }

    if (body.focus !== undefined && (typeof body.focus !== "string" || body.focus.length > 80)) {
      return NextResponse.json({ error: "分析方向无效。" }, { status: 400 });
    }

    if (body.researchTool !== undefined && (typeof body.researchTool !== "string" || body.researchTool.length > 40)) {
      return NextResponse.json({ error: "研究工具无效。" }, { status: 400 });
    }

    if (body.history !== undefined) {
      if (!Array.isArray(body.history) || body.history.length > MAX_HISTORY_MESSAGES) {
        return NextResponse.json({ error: "对话上下文过长，请从当前问题重新开始。" }, { status: 400 });
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
        return NextResponse.json({ error: "对话上下文格式无效。" }, { status: 400 });
      }
    }

    reservationPlanCode = analysisProduct === "kline" ? KLINE_PLAN_CODE : AGENT_PLAN_CODE;
    let reservation: { reservation_id: string };
    if (accessToken || platformCookieHeader) {
      reservationMode = "account";
      const accountOptions = accessToken ? undefined : { cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken };
      const gate = await fetchPlatformGate(accessToken || null, accountOptions);
      if (!gate.allowed) {
        return NextResponse.json(
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
      throw new Error("无法预留本次分析。请刷新后重试。");
    }

    const result = await requestAgentAnalysis({
      mode: body.mode,
      question: typeof body.question === "string" ? body.question : undefined,
      focus: typeof body.focus === "string" ? body.focus : undefined,
      researchTool: typeof body.researchTool === "string" ? body.researchTool : undefined,
      history: Array.isArray(body.history)
        ? body.history.map((item) => ({
            role: (item as { role: "user" | "assistant" }).role,
            content: (item as { content: string }).content,
          }))
        : undefined,
      structuredText: body.structuredText,
      jsonPayload: body.jsonPayload,
      analysisProduct,
    });

    const usage = reservationMode === "account"
      ? accessToken
        ? await commitPlatformUsage(accessToken, reservationId, { planCode: reservationPlanCode })
        : await commitPlatformUsage(null, reservationId, { planCode: reservationPlanCode, cookieHeader: platformCookieHeader, csrfToken: platformCsrfToken })
      : await commitGuestUsage(guestToken, reservationId, { planCode: reservationPlanCode });
    reservationId = "";

    return NextResponse.json({ ...result, usage });
  } catch (error) {
    if (reservationId) {
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
    if (isPlatformRequestError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          reasonCode: error.reasonCode ?? "platform_request_failed",
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "AI 分析请求失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
