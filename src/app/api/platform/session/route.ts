import { NextResponse } from "next/server";
import { requirePlatformServerConfig } from "@/lib/platform/config";

const isToken = (value: unknown): value is string => typeof value === "string" && value.trim().length > 20 && value.length < 4096;

export async function POST(request: Request) {
  let body: { access_token?: unknown; refresh_token?: unknown; csrf_token?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "会话数据格式无效。" }, { status: 400 });
  }
  if (!isToken(body.access_token) || !isToken(body.refresh_token)) {
    return NextResponse.json({ error: "平台会话不完整。" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  const common = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  response.cookies.set("qmdj_platform_access", body.access_token, { ...common, maxAge: 60 * 60 });
  response.cookies.set("qmdj_platform_refresh", body.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });
  if (typeof body.csrf_token === "string" && body.csrf_token.length < 4096) {
    response.cookies.set("qmdj_platform_csrf", body.csrf_token, { ...common, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}

export async function GET(request: Request) {
  const refreshToken = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("qmdj_platform_refresh="))?.slice("qmdj_platform_refresh=".length) ?? "";
  if (!isToken(refreshToken)) return NextResponse.json({ error: "平台登录已过期。" }, { status: 401 });
  const config = requirePlatformServerConfig(process.env);
  const platformResponse = await fetch(new URL("/api/v1/identity/refresh", config.baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  const body = await platformResponse.json().catch(() => ({})) as { session?: { access_token?: unknown; refresh_token?: unknown; csrf_token?: unknown } };
  if (!platformResponse.ok || !body.session || !isToken(body.session.access_token) || !isToken(body.session.refresh_token)) {
    return NextResponse.json({ error: "平台登录已过期。" }, { status: 401 });
  }
  const response = NextResponse.json({ session: body.session });
  const common = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set("qmdj_platform_access", body.session.access_token, { ...common, maxAge: 60 * 60 });
  response.cookies.set("qmdj_platform_refresh", body.session.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });
  if (typeof body.session.csrf_token === "string") response.cookies.set("qmdj_platform_csrf", body.session.csrf_token, { ...common, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  for (const name of ["qmdj_platform_access", "qmdj_platform_refresh", "qmdj_platform_csrf"]) {
    response.cookies.set(name, "", { httpOnly: name !== "qmdj_platform_csrf", secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  }
  return response;
}
