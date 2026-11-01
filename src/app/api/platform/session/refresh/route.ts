import { refreshOAuthToken } from "@singseq/platform-sdk";
import { noStore } from "@/lib/http";
import { reportSwallowedError } from "@/lib/internal-log";
import { requirePlatformServerConfig } from "@/lib/platform/config";
import {
  PLATFORM_BRIDGE_REFRESH_COOKIE,
  isBridgeToken,
  isTrustedBridgeWriteOrigin,
  readRequestCookie,
  setBridgeCookies,
} from "@/lib/platform/bridge";

/**
 * Rotate the bridge session against the platform.
 *
 * This is the body that used to live on `GET /api/platform/session`. It is
 * `POST`-only, on its own path, because it is neither safe nor idempotent: it
 * consumes the refresh token, the platform mints a new one, and the old one
 * stops working. Anything a browser is allowed to issue speculatively — a link
 * prefetch, a cache revalidation, an `<img src>` — must not be able to reach it.
 *
 * It lives under `/session/refresh` rather than on `POST /session` because
 * `POST /session` is already taken by the SDK bridge that installs a token pair
 * supplied in the request body.
 *
 * Note for callers: a refresh token is only *read* from the httpOnly cookie, so
 * this endpoint is the only way to recover an access token once the access
 * cookie has expired. That is why it is a `POST` the product's own client issues
 * deliberately, rather than something a `GET` could be trusted to do.
 */
export async function POST(request: Request) {
  if (!isTrustedBridgeWriteOrigin(request)) return noStore({ error: "请求来源不被信任。" }, { status: 403 });
  const refreshToken = readRequestCookie(request.headers, PLATFORM_BRIDGE_REFRESH_COOKIE);
  if (!isBridgeToken(refreshToken)) return noStore({ error: "平台登录已过期。" }, { status: 401 });
  const config = requirePlatformServerConfig(process.env);
  if (!config.clientId) return noStore({ error: "缺少登记的平台 OAuth client id。" }, { status: 503 });
  try {
    const tokens = await refreshOAuthToken({ baseUrl: config.baseUrl, clientId: config.clientId, refreshToken });
    if (!isBridgeToken(tokens.access_token) || !isBridgeToken(tokens.refresh_token)) return noStore({ error: "平台未返回有效 OAuth token。" }, { status: 502 });
    const response = noStore({ session: { access_token: tokens.access_token, csrf_token: "", expires_at_iso: new Date(Date.now() + tokens.expires_in * 1000).toISOString() }, csrf_token: "" });
    setBridgeCookies(response, tokens.access_token, tokens.refresh_token, "");
    return response;
  } catch (error) {
    reportSwallowedError("platform-session-refresh", "OAuth refresh failed", error);
    return noStore({ error: "平台登录已过期。" }, { status: 401 });
  }
}
