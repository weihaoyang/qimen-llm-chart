import { NextResponse } from "next/server";
import { requestAgentAnalysis } from "@/lib/agent/chat";
import {
  commitGuestUsage,
  readGuestCheckoutToken,
  releaseGuestUsage,
  reserveGuestUsage,
} from "@/lib/platform/server";
import type { WorkbenchMode } from "@/lib/workbench/types";

const WORKBENCH_MODES: WorkbenchMode[] = ["qimen", "bazi", "ziwei", "combined"];

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
  try {
    guestToken = readGuestCheckoutToken(request.headers.get("x-guest-checkout-token")) ?? "";
    if (!guestToken) return NextResponse.json({ error: "请先支付 ¥10。" }, { status: 402 });

    const body = (await request.json()) as {
      mode?: unknown;
      question?: unknown;
      structuredText?: unknown;
      jsonPayload?: unknown;
    };

    if (!isWorkbenchMode(body.mode)) {
      return NextResponse.json({ error: "无效的分析模式。" }, { status: 400 });
    }

    if (typeof body.structuredText !== "string" || !body.structuredText.trim()) {
      return NextResponse.json({ error: "缺少结构化文本。" }, { status: 400 });
    }

    if (typeof body.jsonPayload !== "string" || !body.jsonPayload.trim()) {
      return NextResponse.json({ error: "缺少 JSON 载荷。" }, { status: 400 });
    }

    if (body.question !== undefined && (typeof body.question !== "string" || body.question.length > 300)) {
      return NextResponse.json({ error: "分析问题不能超过 300 字。" }, { status: 400 });
    }

    const reservation = await reserveGuestUsage(guestToken);
    reservationId = reservation.reservation_id;
    if (!reservationId) {
      throw new Error("无法预留本次分析。请刷新后重试。");
    }

    const result = await requestAgentAnalysis({
      mode: body.mode,
      question: typeof body.question === "string" ? body.question : undefined,
      structuredText: body.structuredText,
      jsonPayload: body.jsonPayload,
    });

    const usage = await commitGuestUsage(guestToken, reservationId);
    reservationId = "";

    return NextResponse.json({ ...result, usage });
  } catch (error) {
    if (reservationId) {
      if (guestToken) {
        try {
          await releaseGuestUsage(guestToken, reservationId);
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
