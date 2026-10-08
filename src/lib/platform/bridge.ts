import type { NextResponse } from "next/server";

/**
 * Cookie names for this product's *bridge* session.
 *
 * The bridge is how the server talks to the platform on the caller's behalf:
 * the httpOnly pair holds the platform-issued token pair, and the non-httpOnly
 * CSRF cookie holds the token the browser SDK reads.
 *
 * These names are deliberately distinct from the platform's own `ssp_*` cookies
 * so that a cookie set by `api.singseq.com` can never be mistaken for one set by
 * this origin (and vice versa). `readPlatformCookieHeader` in `./server.ts` maps
 * the bridge names back onto the `ssp_*` names when forwarding upstream.
 */
export const PLATFORM_BRIDGE_ACCESS_COOKIE = "qmdj_platform_access";
export const PLATFORM_BRIDGE_REFRESH_COOKIE = "qmdj_platform_refresh";
export const PLATFORM_BRIDGE_CSRF_COOKIE = "qmdj_platform_csrf";

export const PLATFORM_BRIDGE_COOKIE_NAMES = [
  PLATFORM_BRIDGE_ACCESS_COOKIE,
  PLATFORM_BRIDGE_REFRESH_COOKIE,
  PLATFORM_BRIDGE_CSRF_COOKIE,
] as const;

/**
 * Cheap sanity gate for a platform-issued opaque token.
 *
 * This is deliberately *not* validation — the platform is the only authority on
 * whether a token is genuine. It only rejects obviously malformed values
 * (missing, empty, or absurdly long) before they are written into a cookie or
 * forwarded upstream.
 */
export const isBridgeToken = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 20 && value.length < 4096;

/** Read one cookie value out of a request's `Cookie` header. */
export const readRequestCookie = (headers: Headers, name: string) =>
  headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? "";

/** Read one cookie value out of an upstream response's `Set-Cookie` header(s). */
export const readResponseCookie = (headers: Headers, name: string) => {
  const values =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie") ?? ""];
  return (
    values
      .find((value) => value.startsWith(`${name}=`))
      ?.split(";", 1)[0]
      ?.slice(name.length + 1) ?? ""
  );
};

/**
 * Install a platform token pair into the bridge cookies.
 *
 * `secure` is tied to `NODE_ENV` rather than hardcoded, so local HTTP
 * development still works; production is the only place the flag is on.
 */
export const setBridgeCookies = (
  response: NextResponse,
  access: string,
  refresh: string,
  csrf: string,
) => {
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set(PLATFORM_BRIDGE_ACCESS_COOKIE, access, { ...common, maxAge: 60 * 60 });
  response.cookies.set(PLATFORM_BRIDGE_REFRESH_COOKIE, refresh, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
  if (csrf) {
    response.cookies.set(PLATFORM_BRIDGE_CSRF_COOKIE, csrf, {
      ...common,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
};

/** Expire every bridge cookie. Used on logout. */
export const clearBridgeCookies = (response: NextResponse) => {
  for (const name of PLATFORM_BRIDGE_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      httpOnly: name !== PLATFORM_BRIDGE_CSRF_COOKIE,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
};

/**
 * Origins allowed to write to the bridge.
 *
 * Derived from the request itself so every deployment works without
 * product-specific config: the request URL origin, the `Host` header (with
 * `x-forwarded-proto` when behind a proxy), plus any explicit extras.
 */
const trustedBridgeWriteOrigins = (request: Request, extraOrigins: readonly string[]): Set<string> => {
  const trusted = new Set<string>(extraOrigins.filter(Boolean));
  try {
    trusted.add(new URL(request.url).origin);
  } catch {
    // Route handlers always receive an absolute URL; ignore an unparsable one.
  }
  const host = request.headers.get("host");
  if (host) {
    trusted.add(`https://${host}`);
    trusted.add(`http://${host}`);
    const proto = request.headers.get("x-forwarded-proto");
    if (proto) trusted.add(`${proto}://${host}`);
  }
  return trusted;
};

/**
 * Reject cross-site writes to the bridge.
 *
 * `POST /api/platform/session` installs a caller-supplied token pair into
 * first-party cookies, and it is reachable by a top-level cross-site `<form>`
 * POST — which `SameSite=Lax` does not stop. The body token is attacker-chosen,
 * so a CSRF token cannot help; Origin is the only reliable signal. A missing
 * Origin (same-origin `fetch`, curl, the test client) is allowed, because
 * browsers always attach it to the cross-site writes we intend to reject.
 */
export const isTrustedBridgeWriteOrigin = (request: Request, extraOrigins: readonly string[] = []): boolean => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return trustedBridgeWriteOrigins(request, extraOrigins).has(origin);
};
