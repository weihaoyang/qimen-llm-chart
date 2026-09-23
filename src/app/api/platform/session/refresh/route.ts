import { noStore } from "@/lib/http";
import { requirePlatformServerConfig } from "@/lib/platform/config";
import {
  PLATFORM_BRIDGE_REFRESH_COOKIE,
  isBridgeToken,
  readRequestCookie,
  readResponseCookie,
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
  const refreshToken = readRequestCookie(request.headers, PLATFORM_BRIDGE_REFRESH_COOKIE);
  if (!isBridgeToken(refreshToken)) return noStore({ error: "平台登录已过期。" }, { status: 401 });
  const config = requirePlatformServerConfig(process.env);
  const platformResponse = await fetch(new URL("/api/v1/identity/refresh", config.baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  const body = await platformResponse.json().catch(() => ({})) as { session?: unknown; csrf_token?: string };
  const access = readResponseCookie(platformResponse.headers, "ssp_access");
  const refresh = readResponseCookie(platformResponse.headers, "ssp_refresh") || refreshToken;
  const csrf = readResponseCookie(platformResponse.headers, "ssp_csrf") || body.csrf_token || "";
  if (!platformResponse.ok || !isBridgeToken(access) || !isBridgeToken(refresh)) {
    return noStore({ error: "平台登录已过期。" }, { status: 401 });
  }
  const response = noStore({ session: body.session, csrf_token: csrf });
  setBridgeCookies(response, access, refresh, csrf);
  return response;
}
