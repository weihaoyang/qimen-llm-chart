import { noStore } from "@/lib/http";
import { requirePlatformServerConfig } from "@/lib/platform/config";
import {
  PLATFORM_BRIDGE_ACCESS_COOKIE,
  PLATFORM_BRIDGE_CSRF_COOKIE,
  PLATFORM_BRIDGE_REFRESH_COOKIE,
  clearBridgeCookies,
  isBridgeToken,
  readRequestCookie,
  readResponseCookie,
  setBridgeCookies,
} from "@/lib/platform/bridge";

export async function PUT(request: Request) {
  let body: { code?: unknown; verifier?: unknown; redirect_uri?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return noStore({ error: "登录参数格式无效。" }, { status: 400 }); }
  if (typeof body.code !== "string" || typeof body.verifier !== "string" || typeof body.redirect_uri !== "string") return noStore({ error: "登录参数不完整。" }, { status: 400 });
  const config = requirePlatformServerConfig(process.env);
  const upstream = await fetch(new URL("/api/v1/oauth/token", config.baseUrl), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", code: body.code, client_id: config.productCode, redirect_uri: body.redirect_uri, code_verifier: body.verifier }), cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return noStore({ error: payload.message ?? payload.detail?.message ?? "平台登录交换失败。" }, { status: upstream.status });
  const access = readResponseCookie(upstream.headers, "ssp_access");
  const refresh = readResponseCookie(upstream.headers, "ssp_refresh");
  const csrf = readResponseCookie(upstream.headers, "ssp_csrf") || payload.csrf_token || "";
  if (!isBridgeToken(access) || !isBridgeToken(refresh)) return noStore({ error: "平台未下发有效登录会话。" }, { status: 502 });
  const response = noStore({ session: payload.session, profile: payload.profile, csrf_token: csrf });
  setBridgeCookies(response, access, refresh, csrf);
  return response;
}

export async function POST(request: Request) {
  let body: { access_token?: unknown; refresh_token?: unknown; csrf_token?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return noStore({ error: "会话数据格式无效。" }, { status: 400 });
  }
  if (!isBridgeToken(body.access_token) || !isBridgeToken(body.refresh_token)) {
    return noStore({ error: "平台会话不完整。" }, { status: 400 });
  }

  const response = noStore({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  const common = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  response.cookies.set(PLATFORM_BRIDGE_ACCESS_COOKIE, body.access_token, { ...common, maxAge: 60 * 60 });
  response.cookies.set(PLATFORM_BRIDGE_REFRESH_COOKIE, body.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });
  if (typeof body.csrf_token === "string" && body.csrf_token.length < 4096) {
    response.cookies.set(PLATFORM_BRIDGE_CSRF_COOKIE, body.csrf_token, { ...common, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}

/**
 * Read-only view of the bridge session.
 *
 * This handler never rotates, never calls the platform, and never writes a
 * cookie. It exists so that a caller can cheaply ask "is there a bridge session
 * here, and what access token does it carry?" without consuming a refresh token.
 *
 * Rotation used to live here, which made this a `GET` with a side effect.
 * Browsers, link prefetchers and intermediary caches are all entitled to issue a
 * `GET` speculatively, and refresh-token rotation invalidates the previous token
 * — so a prefetch could log the caller out, or race the real caller and lose.
 * Rotation now lives in `./refresh/route.ts`, which is `POST`-only.
 *
 * The refresh token is deliberately *not* returned: it is httpOnly by design and
 * `loadPlatformSession` strips tokens out of localStorage on every read, so JS is
 * not supposed to hold one.
 */
export async function GET(request: Request) {
  const access = readRequestCookie(request.headers, PLATFORM_BRIDGE_ACCESS_COOKIE);
  const csrf = readRequestCookie(request.headers, PLATFORM_BRIDGE_CSRF_COOKIE);
  if (!isBridgeToken(access)) return noStore({ error: "平台登录已过期。" }, { status: 401 });
  return noStore({ session: { access_token: access, csrf_token: csrf }, csrf_token: csrf });
}

export async function DELETE() {
  const response = noStore({ ok: true });
  clearBridgeCookies(response);
  return response;
}
