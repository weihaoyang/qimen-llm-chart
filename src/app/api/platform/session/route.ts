import { NextResponse } from "next/server";
import { requirePlatformServerConfig } from "@/lib/platform/config";

const isToken = (value: unknown): value is string => typeof value === "string" && value.trim().length > 20 && value.length < 4096;
const cookieValue = (headers: Headers, name: string) => {
  const values = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie") ?? ""];
  return values.find((value) => value.startsWith(`${name}=`))?.split(";", 1)[0]?.slice(name.length + 1) ?? "";
};

const setBridgeCookies = (response: NextResponse, access: string, refresh: string, csrf: string) => {
  const common = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set("qmdj_platform_access", access, { ...common, maxAge: 60 * 60 });
  response.cookies.set("qmdj_platform_refresh", refresh, { ...common, maxAge: 60 * 60 * 24 * 30 });
  if (csrf) response.cookies.set("qmdj_platform_csrf", csrf, { ...common, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
};

export async function PUT(request: Request) {
  let body: { code?: unknown; verifier?: unknown; redirect_uri?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "登录参数格式无效。" }, { status: 400 }); }
  if (typeof body.code !== "string" || typeof body.verifier !== "string" || typeof body.redirect_uri !== "string") return NextResponse.json({ error: "登录参数不完整。" }, { status: 400 });
  const config = requirePlatformServerConfig(process.env);
  const upstream = await fetch(new URL("/api/v1/oauth/token", config.baseUrl), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", code: body.code, client_id: config.productCode, redirect_uri: body.redirect_uri, code_verifier: body.verifier }), cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return NextResponse.json({ error: payload.message ?? payload.detail?.message ?? "平台登录交换失败。" }, { status: upstream.status });
  const access = cookieValue(upstream.headers, "ssp_access");
  const refresh = cookieValue(upstream.headers, "ssp_refresh");
  const csrf = cookieValue(upstream.headers, "ssp_csrf") || payload.csrf_token || "";
  if (!isToken(access) || !isToken(refresh)) return NextResponse.json({ error: "平台未下发有效登录会话。" }, { status: 502 });
  const response = NextResponse.json({ session: payload.session, profile: payload.profile, csrf_token: csrf });
  setBridgeCookies(response, access, refresh, csrf);
  return response;
}

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
  const body = await platformResponse.json().catch(() => ({})) as { session?: unknown; csrf_token?: string };
  const access = cookieValue(platformResponse.headers, "ssp_access");
  const refresh = cookieValue(platformResponse.headers, "ssp_refresh") || refreshToken;
  const csrf = cookieValue(platformResponse.headers, "ssp_csrf") || body.csrf_token || "";
  if (!platformResponse.ok || !isToken(access) || !isToken(refresh)) {
    return NextResponse.json({ error: "平台登录已过期。" }, { status: 401 });
  }
  const response = NextResponse.json({ session: body.session, csrf_token: csrf });
  setBridgeCookies(response, access, refresh, csrf);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  for (const name of ["qmdj_platform_access", "qmdj_platform_refresh", "qmdj_platform_csrf"]) {
    response.cookies.set(name, "", { httpOnly: name !== "qmdj_platform_csrf", secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  }
  return response;
}
