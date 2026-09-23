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
