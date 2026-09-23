import { NextResponse } from "next/server";

/**
 * `NextResponse.json` with `Cache-Control: no-store`.
 *
 * App Router route handlers receive no default `Cache-Control` at all (verified
 * against this Next.js version), so without an explicit header a shared cache
 * is free to store and replay a response containing another account's data.
 * These routes are cookie-authenticated and do not send `Vary: Cookie`, so the
 * RFC 9111 protection that covers `Authorization` requests does not apply.
 *
 * This is deliberately not a blanket rule in `next.config.ts`: config headers
 * *override* route headers (also verified), which would silently clobber the
 * intentionally public caching on the observation proxy and public catalogs.
 * Keep public, cacheable responses on `NextResponse.json` and use this for
 * anything scoped to an account.
 */
export const noStore = <T>(body: T, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
};

/**
 * The counterpart for responses that are deliberately public and account-free —
 * the scenario and template catalogs.
 *
 * These need an explicit header for the same reason as `noStore`: this Next.js
 * version sends no default `Cache-Control`, so leaving it out does not mean
 * "uncacheable", it means "whatever the intermediary decides". The `maxAge` is
 * the accepted staleness bound for that catalog, so it is a product decision and
 * stays at the call site rather than being fixed here.
 *
 * Do not use this for anything derived from the caller's identity.
 */
export const publicCatalog = <T>(body: T, maxAgeSeconds: number) =>
  NextResponse.json(body, { headers: { "Cache-Control": `public, max-age=${maxAgeSeconds}` } });
