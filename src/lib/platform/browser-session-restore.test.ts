// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformSession } from "@singularity-sequence/web-sdk";
import { hasBridgeSessionHint, recoverPlatformSessionFromBridge, restorePlatformAccessState } from "./browser";

const STORAGE_KEY = "qmdj.platform.session.v1";
const BASE_URL = "https://platform.example.com";

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const ACCESS = "bridge-access-0123456789abcdef";
const NEW_ACCESS = "bridge-access-rotated-0123456789abcdef";
const CSRF = "bridge-csrf-0123456789abcdef";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const meBody = {
  session: {
    expires_at_iso: FUTURE,
    refresh_expires_at_iso: FUTURE,
    user_id: "user-1",
    phone_number: "13900139000",
    current_subject_type: "user",
    current_subject_id: "user-1",
  },
  profile: {
    user_id: "user-1",
    phone_number: "13900139000",
    display_name: "",
    locale: "zh-CN",
    region_code: "CN",
  },
};

const storedSession = (overrides: Partial<PlatformSession> = {}): PlatformSession => ({
  access_token: "",
  refresh_token: "",
  csrf_token: CSRF,
  expires_at_iso: PAST,
  refresh_expires_at_iso: FUTURE,
  user_id: "user-1",
  phone_number: "13900139000",
  current_subject_type: "user",
  current_subject_id: "user-1",
  ...overrides,
});

const persist = (session: PlatformSession) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

let fetchMock: ReturnType<typeof vi.fn>;

type Handlers = {
  bridgeGet?: () => Response | Promise<Response>;
  bridgeRefresh?: () => Response | Promise<Response>;
  me?: () => Response | Promise<Response>;
  platformRefresh?: () => Response | Promise<Response>;
};

const installFetch = (handlers: Handlers) => {
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/platform/session") {
      return handlers.bridgeGet ? handlers.bridgeGet() : jsonResponse({ error: "expired" }, 401);
    }
    if (url === "/api/platform/session/refresh") {
      return handlers.bridgeRefresh ? handlers.bridgeRefresh() : jsonResponse({ error: "expired" }, 401);
    }
    if (url === `${BASE_URL}/api/v1/identity/me`) {
      return handlers.me ? handlers.me() : jsonResponse(meBody);
    }
    if (url === `${BASE_URL}/api/v1/identity/refresh`) {
      return handlers.platformRefresh ? handlers.platformRefresh() : jsonResponse({ message: "expired" }, 401);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
};

const bridgeRefreshCalls = () => fetchMock.mock.calls.filter(([input]) => String(input) === "/api/platform/session/refresh").length;

describe("restorePlatformAccessState", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = BASE_URL;
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = "shengtian-banzi";
    process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = "shengtian-banzi-core";
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_PLATFORM_BASE_URL;
    delete process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE;
    delete process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE;
  });

  it("reuses a still-valid access cookie instead of rotating the refresh token on every load", async () => {
    persist(storedSession());
    installFetch({
      bridgeGet: () => jsonResponse({ session: { access_token: ACCESS, csrf_token: CSRF } }),
    });

    const restored = await restorePlatformAccessState(storedSession());

    // The whole point: a live access cookie must not consume the single-use
    // refresh token, or two tabs restoring together log each other out.
    expect(bridgeRefreshCalls()).toBe(0);
    expect(restored.session.access_token).toBe(ACCESS);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}").refresh_expires_at_iso).toBe(FUTURE);
  });

  it("rotates the bridge session only when the access cookie is gone", async () => {
    installFetch({
      bridgeGet: () => jsonResponse({ error: "expired" }, 401),
      bridgeRefresh: () => jsonResponse({ session: { access_token: NEW_ACCESS, csrf_token: CSRF, expires_at_iso: FUTURE, refresh_expires_at_iso: FUTURE } }),
    });

    const restored = await restorePlatformAccessState(storedSession());

    expect(bridgeRefreshCalls()).toBe(1);
    expect(restored.session.access_token).toBe(NEW_ACCESS);
  });

  it("keeps the stored session when a refresh-token race loses", async () => {
    persist(storedSession());
    installFetch({
      bridgeGet: () => jsonResponse({ error: "expired" }, 401),
      // Both attempts 401: another tab rotated first. This must not wipe local
      // storage, or the next load reports a logged-out guest.
      bridgeRefresh: () => jsonResponse({ error: "expired" }, 401),
    });

    await expect(restorePlatformAccessState(storedSession())).rejects.toThrow("平台登录已过期");
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("clears the stored session only once the refresh window has actually closed", async () => {
    persist(storedSession({ refresh_expires_at_iso: PAST }));
    installFetch({
      bridgeGet: () => jsonResponse({ error: "expired" }, 401),
      bridgeRefresh: () => jsonResponse({ error: "expired" }, 401),
    });

    await expect(restorePlatformAccessState(storedSession({ refresh_expires_at_iso: PAST }))).rejects.toThrow("平台登录已过期");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not clear the stored session when me() 401s and the retry rotation also fails", async () => {
    persist(storedSession());
    installFetch({
      bridgeGet: () => jsonResponse({ session: { access_token: ACCESS, csrf_token: CSRF } }),
      me: () => jsonResponse({ message: "expired" }, 401),
      platformRefresh: () => jsonResponse({ message: "expired" }, 401),
      bridgeRefresh: () => jsonResponse({ error: "expired" }, 401),
    });

    await expect(restorePlatformAccessState(storedSession())).rejects.toThrow("平台登录已过期");
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});

describe("bridge session recovery", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = BASE_URL;
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = "shengtian-banzi";
    process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = "shengtian-banzi-core";
    window.localStorage.clear();
    document.cookie = "qmdj_platform_csrf=; Max-Age=0; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_PLATFORM_BASE_URL;
    delete process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE;
    delete process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE;
  });

  it("detects the readable bridge hint cookie", () => {
    expect(hasBridgeSessionHint()).toBe(false);
    document.cookie = "qmdj_platform_csrf=abc; path=/";
    expect(hasBridgeSessionHint()).toBe(true);
  });

  it("rebuilds a session from the bridge when local storage was evicted", async () => {
    installFetch({
      bridgeRefresh: () => jsonResponse({ session: { access_token: NEW_ACCESS, csrf_token: CSRF, expires_at_iso: FUTURE, refresh_expires_at_iso: FUTURE } }),
    });

    const recovered = await recoverPlatformSessionFromBridge();

    expect(recovered?.access_token).toBe(NEW_ACCESS);
    expect(recovered?.refresh_expires_at_iso).toBe(FUTURE);
  });

  it("returns null when the bridge has no session at all", async () => {
    installFetch({
      bridgeRefresh: () => jsonResponse({ error: "expired" }, 401),
      bridgeGet: () => jsonResponse({ error: "expired" }, 401),
    });

    expect(await recoverPlatformSessionFromBridge()).toBeNull();
  });
});

describe("cross-tab refresh lock", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_URL = BASE_URL;
    process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE = "shengtian-banzi";
    process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE = "shengtian-banzi-core";
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "locks");
    delete process.env.NEXT_PUBLIC_PLATFORM_BASE_URL;
    delete process.env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE;
    delete process.env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE;
  });

  it("rotates under the origin-scoped Web Lock when the browser supports it", async () => {
    const request = vi.fn(async (_name: string, task: () => Promise<unknown>) => task());
    Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });
    installFetch({
      bridgeGet: () => jsonResponse({ error: "expired" }, 401),
      bridgeRefresh: () => jsonResponse({ session: { access_token: NEW_ACCESS, csrf_token: CSRF, expires_at_iso: FUTURE, refresh_expires_at_iso: FUTURE } }),
    });

    const restored = await restorePlatformAccessState(storedSession());

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("qmdj-platform-refresh");
    expect(restored.session.access_token).toBe(NEW_ACCESS);
  });

  it("falls back to the retry when Web Locks is unavailable", async () => {
    installFetch({
      bridgeGet: () => jsonResponse({ error: "expired" }, 401),
      bridgeRefresh: () => jsonResponse({ session: { access_token: NEW_ACCESS, csrf_token: CSRF, expires_at_iso: FUTURE, refresh_expires_at_iso: FUTURE } }),
    });

    const restored = await restorePlatformAccessState(storedSession());

    expect(restored.session.access_token).toBe(NEW_ACCESS);
  });
});

