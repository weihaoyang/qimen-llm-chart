import { buildAuthorizeUrl, createPkcePair, randomOAuthState, revokeOAuthToken } from "@singseq/platform-sdk";
import type { PlatformProfile, PlatformSession, PlanCatalogItem } from "./types";
import { createProductPlatformClient } from "@/lib/platform/client";
import { requirePlatformClientConfig, type PlatformClientConfig } from "@/lib/platform/config";
import { AGENT_PLAN_CODE } from "@/lib/platform/contracts";
import {
  clearPlatformSession,
  isPlatformRefreshExpired,
  savePlatformSession,
} from "@/lib/platform/session";

export type PlatformOAuthCallback = {
  code: string;
  state: string;
};

const PLATFORM_OAUTH_STORAGE_KEY = "qmdj.platform.oauth.v1";
// OAuth redirects to this registered path handled by the workbench.
export const PLATFORM_OAUTH_CALLBACK_PATH = "/auth/callback";

export type PlatformAccessState = {
  session: PlatformSession;
  profile: PlatformProfile;
};

export type PlatformPlanState = {
  items: PlanCatalogItem[];
  channels: Array<{
    channel: string;
    ready: boolean;
    mobile_ready: boolean;
    reason_code: string;
    message: string;
  }>;
};

export type PlatformPlanUsage = {
  plan_code: string;
  available: number;
  reserved: number;
  consumed: number;
  usage_unit: string;
  usage_label: string;
};

export type PlatformUsage = {
  product_code: string;
  available: number;
  reserved: number;
  consumed: number;
  usage_unit: string;
  usage_label: string;
  by_plan: PlatformPlanUsage[];
};

export const getAccountGate = (
  accessToken: string,
  productCode = requirePlatformClientConfig().productCode,
  options?: { csrfToken?: string },
) => {
  const config = requirePlatformClientConfig();
  return createProductPlatformClient({ accessToken, csrfToken: options?.csrfToken }).GET("/api/v1/usage/balance", {
    params: { query: { product_code: productCode } },
  }).then(({ data, error }) => {
    if (error || !data) throw new Error("无法读取平台权益余额。");
    const allowed = data.some((entry) => entry.product_code === config.productCode && (entry.remaining === null || (entry.remaining ?? 0) > 0));
    return { allowed, mode: allowed ? "usage_balance" : "blocked", product_code: config.productCode, access_scope: config.accessScope, subject_type: "user", subject_id: "", reason_code: allowed ? "" : "usage_exhausted", message: "" };
  });
};

export const revokePlatformSession = async (accessToken: string) => {
  const config = requirePlatformClientConfig();
  if (!config.clientId || !accessToken) return;
  await revokeOAuthToken({ baseUrl: config.baseUrl, clientId: config.clientId, token: accessToken, tokenTypeHint: "access_token" });
};

export const createPlatformOAuthRequest = async () => ({ ...(await createPkcePair()), state: randomOAuthState() });

export const preparePlatformOAuthLogin = async (
  config: PlatformClientConfig,
  origin: string,
) => {
  const request = await createPlatformOAuthRequest();
  const redirectUri = `${origin.replace(/\/$/, "")}${PLATFORM_OAUTH_CALLBACK_PATH}`;
  return {
    request,
    url: buildAuthorizeUrl({ baseUrl: config.baseUrl, clientId: (() => { if (!config.clientId) throw new Error("缺少平台登记的 OAuth client id。"); return config.clientId; })(), redirectUri, scope: ["account.read", "usage.write"], state: request.state, codeChallenge: request.challenge }),
  };
};

export const savePlatformOAuthRequest = (request: { verifier: string; state: string }) => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(PLATFORM_OAUTH_STORAGE_KEY, JSON.stringify(request));
  }
};

export const consumePlatformOAuthRequest = (state: string) => {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PLATFORM_OAUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(PLATFORM_OAUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { verifier?: unknown; state?: unknown };
    if (parsed.state !== state || typeof parsed.verifier !== "string") return null;
    return { verifier: parsed.verifier, state };
  } catch {
    return null;
  }
};

export const parsePlatformOAuthCallback = (value: string): PlatformOAuthCallback | null => {
  const normalized = value;
  if (!normalized.startsWith("/auth/callback")) return null;
  const query = normalized.slice("/auth/callback".length);
  if (query && !query.startsWith("?")) return null;
  const params = new URLSearchParams(query.slice(1));
  const code = params.get("code")?.trim() ?? "";
  const state = params.get("state")?.trim() ?? "";
  return code && state ? { code, state } : null;
};

/** Readable-by-JS companion to the httpOnly bridge cookies. Used only as a hint
 * that a session may still exist in the bridge after local storage is gone. */
const BRIDGE_SESSION_HINT_COOKIE = "qmdj_platform_csrf";

const asBridgeSession = (value: unknown): Partial<PlatformSession> | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const accessToken = typeof candidate.access_token === "string" ? candidate.access_token : "";
  if (!accessToken) return null;
  const partial: Partial<PlatformSession> = { access_token: accessToken };
  if (typeof candidate.csrf_token === "string") partial.csrf_token = candidate.csrf_token;
  if (typeof candidate.expires_at_iso === "string") partial.expires_at_iso = candidate.expires_at_iso;
  if (typeof candidate.refresh_expires_at_iso === "string") partial.refresh_expires_at_iso = candidate.refresh_expires_at_iso;
  if (typeof candidate.user_id === "string") partial.user_id = candidate.user_id;
  if (typeof candidate.phone_number === "string") partial.phone_number = candidate.phone_number;
  if (typeof candidate.current_subject_type === "string") partial.current_subject_type = candidate.current_subject_type as PlatformSession["current_subject_type"];
  if (typeof candidate.current_subject_id === "string") partial.current_subject_id = candidate.current_subject_id;
  return partial;
};

/**
 * Read-only recovery of the access credential from the bridge cookie.
 *
 * Side-effect free on purpose: a still-valid access cookie must not trigger a
 * refresh rotation. The platform refresh token is single-use, so rotating on
 * every page load lets two tabs restoring at once invalidate each other.
 */
const readBridgeAccessToken = async (): Promise<Partial<PlatformSession> | null> => {
  try {
    const response = await fetch("/api/platform/session", { method: "GET", cache: "no-store" });
    if (!response.ok) return null;
    const body = await response.json().catch(() => ({})) as { session?: unknown };
    return asBridgeSession(body.session);
  } catch {
    return null;
  }
};

/**
 * Serialize bridge rotations across tabs.
 *
 * The refresh token is single-use, but the httpOnly cookie that carries it is
 * shared by every tab on the origin, so two tabs restoring at once present the
 * same token and one of them loses the race. The Web Locks API is origin-scoped,
 * so holding this lock while rotating makes the second tab wait for the first
 * tab's `Set-Cookie` to land; it then rotates from the fresh token. Browsers
 * without `navigator.locks` fall back to the retry below.
 */
const withBridgeRefreshLock = async <T>(task: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator !== "undefined"
    ? (navigator as Navigator & { locks?: LockManager }).locks
    : undefined;
  if (!locks || typeof locks.request !== "function") return task();
  return locks.request("qmdj-platform-refresh", task) as Promise<T>;
};

/**
 * Rotate the bridge session against the platform.
 *
 * The refresh token is single-use. If two tabs restore together, the loser still
 * carries the previous token and gets a 401 even though the winner just
 * installed a fresh one, so one retry is made after a short delay (by which
 * point the winner's `Set-Cookie` has landed). Only a client retry can tell a
 * genuine expiry apart from an in-flight rotation race.
 */
const rotateBridgeSession = () => withBridgeRefreshLock(async (): Promise<Partial<PlatformSession> | null> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/platform/session/refresh", { method: "POST", cache: "no-store" });
      if (response.ok) {
        const body = await response.json().catch(() => ({})) as { session?: unknown };
        const parsed = asBridgeSession(body.session);
        if (parsed) return parsed;
      } else if (response.status !== 401) {
        return null;
      }
    } catch {
      return null;
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
});

const toSeedSession = (partial: Partial<PlatformSession>): PlatformSession => ({
  access_token: partial.access_token ?? "",
  refresh_token: "",
  csrf_token: partial.csrf_token ?? "",
  expires_at_iso: partial.expires_at_iso ?? "",
  refresh_expires_at_iso: partial.refresh_expires_at_iso ?? "",
  user_id: partial.user_id ?? "",
  phone_number: partial.phone_number ?? "",
  current_subject_type: partial.current_subject_type ?? "user",
  current_subject_id: partial.current_subject_id ?? partial.user_id ?? "",
});

/** True when a non-httpOnly bridge cookie suggests a session may still exist. */
export const hasBridgeSessionHint = () => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${BRIDGE_SESSION_HINT_COOKIE}=`));
};

/**
 * Rebuild the local session record from the httpOnly bridge cookies.
 *
 * `loadPlatformSession` reads only local storage, and the shell used to treat a
 * missing record as "logged out". Anything that evicts local storage (private
 * mode, a storage-capped/ITP browser, a manual clear) then forced a fresh login
 * even though the cookies still carried a live session. Ask the cookies before
 * giving up; `restorePlatformAccessState` fills in the profile from `me()`.
 */
export const recoverPlatformSessionFromBridge = async (): Promise<PlatformSession | null> => {
  const partial = (await rotateBridgeSession()) ?? (await readBridgeAccessToken());
  if (!partial?.access_token) return null;
  return toSeedSession(partial);
};

export const restorePlatformAccessState = async (
  session: PlatformSession,
): Promise<PlatformAccessState> => {
  let current = session;
  if (!current.access_token) {
    // `loadPlatformSession` strips both tokens out of localStorage on every read,
    // so after a reload the only usable access token lives in the httpOnly bridge
    // cookie. Prefer the side-effect-free read: reusing a still-valid access
    // cookie avoids rotating the single-use refresh token on every load, which
    // is what lets concurrent tabs invalidate each other. Only rotate when the
    // access cookie is gone, via the explicit `POST` rather than a speculative
    // `GET`.
    const read = await readBridgeAccessToken();
    if (read) {
      current = { ...current, ...read };
    } else {
      const rotated = await rotateBridgeSession();
      if (rotated) current = { ...current, ...rotated };
    }
  }
  if (!current.access_token) {
    // No credential in the bridge. Keep the local record while the refresh
    // window is open so a later load can retry; drop it only once the refresh
    // token is genuinely past its expiry.
    if (isPlatformRefreshExpired(current)) clearPlatformSession();
    throw new Error("平台登录已过期，请重新登录。");
  }

  const authenticatedClient = createProductPlatformClient({
    accessToken: current.access_token,
    csrfToken: current.csrf_token,
  });

  try {
    const { data, error, response } = await authenticatedClient.GET("/api/v1/account/me");
    if (error || !data) throw Object.assign(new Error("平台账户读取失败。"), { status: (response as Response).status });
    const profile: PlatformProfile = { user_id: data.subject_id, phone_number: "", display_name: data.name, locale: "zh-CN", region_code: "CN" };
    const nextSession = { ...current, user_id: data.subject_id, current_subject_id: data.subject_id };
    savePlatformSession(nextSession);
    return {
      session: nextSession,
      profile,
    };
  } catch (error) {
    if ((error as { status?: number })?.status !== 401) {
      // Network/transient failure: keep the local record so the next load can
      // recover instead of forcing a fresh login.
      throw error;
    }
    if (isPlatformRefreshExpired(current)) {
      clearPlatformSession();
      throw error;
    }

    const rotated = await rotateBridgeSession();
    if (!rotated) {
      // The refresh cookie did not yield a new access token. Do not clear the
      // local record: the usual cause is a concurrent rotation in another tab,
      // and the next load can still recover from the bridge cookies.
      throw new Error("平台登录已过期，请重新登录。");
    }
    const refreshedSession = { ...current, ...rotated };
    savePlatformSession(refreshedSession);

    const revalidated = await createProductPlatformClient({
      accessToken: refreshedSession.access_token,
      csrfToken: refreshedSession.csrf_token,
    }).GET("/api/v1/account/me");
    if (revalidated.error || !revalidated.data) throw new Error("平台账户读取失败。");
    const nextSession = { ...refreshedSession, user_id: revalidated.data.subject_id, current_subject_id: revalidated.data.subject_id };
    savePlatformSession(nextSession);

    return {
      session: nextSession,
      profile: { user_id: revalidated.data.subject_id, phone_number: "", display_name: revalidated.data.name, locale: "zh-CN", region_code: "CN" },
    };
  }
};

export const listPlatformPlans = async (productCode: string): Promise<PlatformPlanState> => {
  void productCode;
  return { items: [], channels: [] };
};

export const fetchPlatformUsage = async (
  accessToken = "",
  csrfToken = "",
  planCode = AGENT_PLAN_CODE,
): Promise<PlatformUsage> => {
  const config = requirePlatformClientConfig();
  // This product sells two per-use plans with different units (analysis_turn and
  // kline_report). Reading usage without a plan code makes the platform sum the
  // units into one "mixed" balance, which would show K-line reports as agent
  // turns and mis-open the agent entry. Always scope the read to one plan.
  const result = await createProductPlatformClient({ accessToken, csrfToken }).GET("/api/v1/usage/balance", { params: { query: { product_code: config.productCode } } });
  if (result.error || !result.data) throw new Error("无法读取平台用量余额。");
  const metric = planCode === "qimen-kline-precise-1" ? "kline_report" : "analysis_turn";
  const body = result.data.find((entry) => entry.metric === metric);
  return {
    product_code: config.productCode,
    available: Number(body?.remaining ?? 0), reserved: 0, consumed: 0,
    usage_unit: metric, usage_label: metric,
    by_plan: body ? [{ plan_code: planCode, available: Number(body.remaining ?? 0), reserved: 0, consumed: 0, usage_unit: metric, usage_label: metric }] : [],
  };
};
