import { PlatformHttpError, type EntitlementGateResponse, type InvitationCodeRedemption, type PlanCatalogItem, type PlatformProfile, type PlatformSession } from "@singularity-sequence/web-sdk";
import { createProductPlatformClient } from "@/lib/platform/client";
import { buildPlatformOAuthLoginUrl, requirePlatformClientConfig, type PlatformClientConfig } from "@/lib/platform/config";
import { AGENT_PLAN_CODE } from "@/lib/platform/contracts";
import {
  clearPlatformSession,
  isPlatformRefreshExpired,
  savePlatformSession,
} from "@/lib/platform/session";

export type PlatformCallbackSession = {
  access_token: string;
  refresh_token: string;
  expires_at_iso: string;
  refresh_expires_at_iso: string;
  user_id: string;
  phone_number: string;
};

export type PlatformOAuthCallback = {
  code: string;
  state: string;
};

const PLATFORM_OAUTH_STORAGE_KEY = "qmdj.platform.oauth.v1";
export const PLATFORM_OAUTH_CALLBACK_PATH = "/#/auth/callback";

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

export type PlatformCheckout = {
  orderId: string;
  checkoutToken: string;
  checkoutMode: "account" | "guest";
  providerCheckoutUrl: string;
};

export type GuestCheckout = {
  order: { order_id: string; amount_cny: number; status: string };
  checkout_token: string;
  checkout_token_expires_at_iso: string;
};

const createIdempotencyKey = (scope: string) => {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `qmdj-${scope}-${random}`.slice(0, 128);
};

export const createGuestCheckout = (planCode: string, paymentChannel: string, idempotencyKey = createIdempotencyKey(planCode)) =>
  createProductPlatformClient().createGuestOrder({
      product_code: requirePlatformClientConfig().productCode,
      plan_code: planCode,
      payment_channel: paymentChannel,
      idempotency_key: idempotencyKey,
    }) as Promise<GuestCheckout>;

export const createGuestPaymentAttempt = (checkout: GuestCheckout, paymentChannel: string, returnUrl: string, paymentScene: "web" | "wap" = "web") =>
  createProductPlatformClient().createGuestPaymentAttempt(checkout.checkout_token, {
      order_id: checkout.order.order_id,
      product_code: requirePlatformClientConfig().productCode,
      payment_channel: paymentChannel,
      payment_scene: paymentScene,
      return_url: returnUrl,
    }) as Promise<{ provider_checkout_url: string }>;

export const getGuestPaymentResult = (orderId: string, checkoutToken: string) => {
  const config = requirePlatformClientConfig();
  return createProductPlatformClient().getGuestPaymentResult(checkoutToken, orderId, config.productCode) as Promise<{ order: { status: string }; entitlement_active: boolean }>;
};

const asOrderId = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof (value as { order_id?: unknown }).order_id === "string") {
    return (value as { order_id: string }).order_id;
  }
  return "";
};

const asProviderCheckoutUrl = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const candidate = value as { provider_checkout_url?: unknown; checkout_url?: unknown; url?: unknown };
    return [candidate.provider_checkout_url, candidate.checkout_url, candidate.url].find(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    ) ?? "";
  }
  return "";
};

export const createAccountCheckout = async (
  accessToken: string,
  planCode: string,
  paymentChannel: string,
  returnUrl: string | ((orderId: string) => string),
  options?: { csrfToken?: string },
  paymentScene: "web" | "wap" = "web",
): Promise<PlatformCheckout> => {
  const config = requirePlatformClientConfig();
  const client = createProductPlatformClient({ accessToken, csrfToken: options?.csrfToken });
  const orderResponse = await client.createOrder({
    product_code: config.productCode,
    plan_code: planCode,
    payment_channel: paymentChannel,
    idempotency_key: createIdempotencyKey(planCode),
  } as { product_code: string; plan_code: string; payment_channel: string; idempotency_key: string }) as { order?: unknown; order_id?: unknown };
  const orderId = asOrderId(orderResponse.order ?? orderResponse.order_id);
  if (!orderId) throw new Error("平台没有返回订单号，未继续发起支付。");
  const paymentResponse = await client.createPaymentAttempt({
    order_id: orderId,
    product_code: config.productCode,
    payment_channel: paymentChannel,
    payment_scene: paymentScene,
    return_url: typeof returnUrl === "function" ? returnUrl(orderId) : returnUrl,
  } as { order_id: string; product_code: string; payment_channel: string; payment_scene: "web" | "wap"; return_url: string }) as { provider_checkout_url?: unknown; checkout_url?: unknown; url?: unknown };
  const providerCheckoutUrl = asProviderCheckoutUrl(paymentResponse);
  if (!providerCheckoutUrl) throw new Error("平台没有返回收银台地址，未继续发起支付。");
  return { orderId, checkoutToken: "", checkoutMode: "account", providerCheckoutUrl };
};

export const getAccountPaymentResult = async (
  accessToken: string,
  orderId: string,
  productCode = requirePlatformClientConfig().productCode,
  options?: { csrfToken?: string },
) => createProductPlatformClient({ accessToken, csrfToken: options?.csrfToken }).getPaymentResult(orderId, productCode) as Promise<{
  order?: { status?: string; order_id?: string };
  entitlement_active?: boolean;
  payment_status?: string;
  status?: string;
  message?: string;
}>;

export const getAccountGate = (
  accessToken: string,
  productCode = requirePlatformClientConfig().productCode,
  accessScope = requirePlatformClientConfig().accessScope,
  options?: { csrfToken?: string },
) => createProductPlatformClient({ accessToken, csrfToken: options?.csrfToken }).getCurrentGate(productCode, accessScope) as Promise<EntitlementGateResponse>;

export const redeemInvitationCode = (accessToken: string, code: string, options?: { csrfToken?: string }) =>
  createProductPlatformClient({ accessToken, csrfToken: options?.csrfToken }).redeemInvitationCode(code) as Promise<InvitationCodeRedemption>;

const base64UrlEncode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const randomUrlToken = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

export const createPlatformOAuthRequest = async () => {
  const verifier = randomUrlToken(48);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return {
    verifier,
    challenge: base64UrlEncode(new Uint8Array(digest)),
    state: randomUrlToken(32),
  };
};

export const preparePlatformOAuthLogin = async (
  config: PlatformClientConfig,
  origin: string,
) => {
  const request = await createPlatformOAuthRequest();
  const redirectUri = `${origin.replace(/\/$/, "")}${PLATFORM_OAUTH_CALLBACK_PATH}`;
  return {
    request,
    url: buildPlatformOAuthLoginUrl({
      baseUrl: config.baseUrl,
      loginUrl: config.loginUrl,
      clientId: config.productCode,
      productCode: config.productCode,
      accessScope: config.accessScope,
      redirectUri,
      codeChallenge: request.challenge,
      state: request.state,
    }),
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
  if (!value.startsWith("#")) return null;
  const normalized = value.slice(1);
  if (!normalized.startsWith("/auth/callback")) return null;
  const query = normalized.slice("/auth/callback".length);
  if (query && !query.startsWith("?")) return null;
  const params = new URLSearchParams(query.slice(1));
  const code = params.get("code")?.trim() ?? "";
  const state = params.get("state")?.trim() ?? "";
  return code.startsWith("ssp_oauth_") && state ? { code, state } : null;
};

const CALLBACK_KEYS = [
  "access_token",
  "refresh_token",
  "expires_at",
  "refresh_expires_at",
  "user_id",
  "phone_number",
] as const;

export const parsePlatformCallbackFragment = (
  hash: string,
): PlatformCallbackSession | null => {
  const normalized = hash.startsWith("#") || hash.startsWith("?") ? hash.slice(1) : hash;
  if (!normalized) {
    return null;
  }

  const params = new URLSearchParams(normalized);
  const values = Object.fromEntries(CALLBACK_KEYS.map((key) => [key, params.get(key)?.trim() ?? ""]));

  if (CALLBACK_KEYS.some((key) => !values[key])) {
    return null;
  }

  return {
    access_token: values.access_token,
    refresh_token: values.refresh_token,
    expires_at_iso: values.expires_at,
    refresh_expires_at_iso: values.refresh_expires_at,
    user_id: values.user_id,
    phone_number: values.phone_number,
  };
};

export const toPlatformSession = (value: PlatformCallbackSession): PlatformSession => ({
  access_token: value.access_token,
  refresh_token: value.refresh_token,
  // The legacy cross-origin callback carries bearer credentials but not the
  // browser-only CSRF token. Bearer-authenticated SDK requests do not use it.
  csrf_token: "",
  expires_at_iso: value.expires_at_iso,
  refresh_expires_at_iso: value.refresh_expires_at_iso,
  user_id: value.user_id,
  phone_number: value.phone_number,
  current_subject_type: "user",
  current_subject_id: value.user_id,
});

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
 * Rotate the bridge session against the platform.
 *
 * The refresh token is single-use. If two tabs restore together, the loser still
 * carries the previous token and gets a 401 even though the winner just
 * installed a fresh one, so one retry is made after a short delay (by which
 * point the winner's `Set-Cookie` has landed). Only a client retry can tell a
 * genuine expiry apart from an in-flight rotation race.
 */
const rotateBridgeSession = async (): Promise<Partial<PlatformSession> | null> => {
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
};

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
    const result = await authenticatedClient.me();
    const nextSession = { ...current, ...result.session };
    savePlatformSession(nextSession);
    return {
      session: nextSession,
      profile: result.profile,
    };
  } catch (error) {
    if (!(error instanceof PlatformHttpError) || error.status !== 401) {
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
    }).me();
    const nextSession = { ...refreshedSession, ...revalidated.session };
    savePlatformSession(nextSession);

    return {
      session: nextSession,
      profile: revalidated.profile,
    };
  }
};

export const listPlatformPlans = async (productCode: string): Promise<PlatformPlanState> => {
  const client = createProductPlatformClient();
  const result = (await client.listPlans(productCode)) as PlatformPlanState;
  return {
    items: result.items ?? [],
    channels: result.channels ?? [],
  };
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
  const body = await createProductPlatformClient({ accessToken, csrfToken }).getUsageSummary(config.productCode, planCode);
  return {
    product_code: body.product_code ?? config.productCode,
    available: Number(body.available ?? 0),
    reserved: Number(body.reserved ?? 0),
    consumed: Number(body.consumed ?? 0),
    usage_unit: body.usage_unit ?? "",
    usage_label: body.usage_label ?? "",
    by_plan: Array.isArray(body.by_plan) ? body.by_plan : [],
  };
};
