import { exchangeAuthorizationCode } from "@singseq/platform-sdk";
import { noStore } from "@/lib/http";
import { reportSwallowedError } from "@/lib/internal-log";
import { requirePlatformServerConfig } from "@/lib/platform/config";
import {
  PLATFORM_BRIDGE_ACCESS_COOKIE,
  PLATFORM_BRIDGE_CSRF_COOKIE,
  PLATFORM_BRIDGE_REFRESH_COOKIE,
  clearBridgeCookies,
  isBridgeToken,
  isTrustedBridgeWriteOrigin,
  readRequestCookie,
  setBridgeCookies,
} from "@/lib/platform/bridge";

/**
 * Reject a cross-site write before it can install or rotate the bridge cookies.
 * See `isTrustedBridgeWriteOrigin` for why Origin is the only usable signal.
 */
const untrustedOrigin = (request: Request) =>
  isTrustedBridgeWriteOrigin(request) ? null : noStore({ error: "请求来源不被信任。" }, { status: 403 });

export async function PUT(request: Request) {
  const rejected = untrustedOrigin(request);
  if (rejected) return rejected;
  let body: { code?: unknown; verifier?: unknown; redirect_uri?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return noStore({ error: "登录参数格式无效。" }, { status: 400 }); }
  if (typeof body.code !== "string" || typeof body.verifier !== "string" || typeof body.redirect_uri !== "string") return noStore({ error: "登录参数不完整。" }, { status: 400 });
  const config = requirePlatformServerConfig(process.env);
  if (!config.clientId) return noStore({ error: "缺少登记的平台 OAuth client id。" }, { status: 503 });
  try {
    const tokens = await exchangeAuthorizationCode({
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      code: body.code,
      redirectUri: body.redirect_uri,
      verifier: body.verifier,
    });
    if (!isBridgeToken(tokens.access_token) || !isBridgeToken(tokens.refresh_token)) return noStore({ error: "平台未返回有效 OAuth token。" }, { status: 502 });
    const response = noStore({ session: { access_token: tokens.access_token, csrf_token: "", expires_at_iso: new Date(Date.now() + tokens.expires_in * 1000).toISOString() }, csrf_token: "" });
    setBridgeCookies(response, tokens.access_token, tokens.refresh_token, "");
    return response;
  } catch (error) {
    reportSwallowedError("platform-session", "OAuth code exchange failed", error);
    const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : 502;
    return noStore({ error: "平台登录交换失败。" }, { status });
  }
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

export async function DELETE(request: Request) {
  const rejected = untrustedOrigin(request);
  if (rejected) return rejected;
  const response = noStore({ ok: true });
  clearBridgeCookies(response);
  return response;
}
