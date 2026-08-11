import { PlatformHttpError, type EntitlementGateResponse, type InvitationCodeRedemption, type PlanCatalogItem, type PlatformProfile, type PlatformSession } from "@singularity-sequence/web-sdk";
import { createPlatformClient } from "@/lib/platform/client";
import { requirePlatformClientConfig } from "@/lib/platform/config";
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

export type PlatformAccessState = {
  session: PlatformSession;
  profile: PlatformProfile;
};

export type PlatformPlanState = {
  items: PlanCatalogItem[];
  channels: Array<{
    channel: string;
    ready: boolean;
    reason_code: string;
    message: string;
  }>;
};

export type PlatformUsage = {
  product_code: string;
  available: number;
  reserved: number;
  consumed: number;
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

const guestRequest = async <T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> => {
  const config = requirePlatformClientConfig();
  const response = await fetch(new URL(path, config.baseUrl), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { "X-Guest-Checkout-Token": options.token } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as T & { detail?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.detail?.message ?? "支付请求失败。", { cause: response.status });
  }
  return body;
};

export const createGuestCheckout = (planCode: string, paymentChannel: string, idempotencyKey = createIdempotencyKey(planCode)) =>
  guestRequest<GuestCheckout>("/api/v1/commerce/guest/orders", {
    method: "POST",
    body: {
      product_code: requirePlatformClientConfig().productCode,
      plan_code: planCode,
      payment_channel: paymentChannel,
      idempotency_key: idempotencyKey,
    },
  });

export const createGuestPaymentAttempt = (checkout: GuestCheckout, paymentChannel: string, returnUrl: string) =>
  guestRequest<{ provider_checkout_url: string }>("/api/v1/commerce/guest/payment-attempts", {
    method: "POST",
    token: checkout.checkout_token,
    body: {
      order_id: checkout.order.order_id,
      product_code: requirePlatformClientConfig().productCode,
      payment_channel: paymentChannel,
      return_url: returnUrl,
    },
  });

export const getGuestPaymentResult = (orderId: string, checkoutToken: string) => {
  const config = requirePlatformClientConfig();
  return guestRequest<{ order: { status: string }; entitlement_active: boolean }>(
    `/api/v1/commerce/guest/payment-result/${encodeURIComponent(orderId)}?product_code=${encodeURIComponent(config.productCode)}`,
    { token: checkoutToken },
  );
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
): Promise<PlatformCheckout> => {
  const config = requirePlatformClientConfig();
  const client = createPlatformClient({ accessToken, csrfToken: options?.csrfToken });
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
    return_url: typeof returnUrl === "function" ? returnUrl(orderId) : returnUrl,
  }) as { provider_checkout_url?: unknown; checkout_url?: unknown; url?: unknown };
  const providerCheckoutUrl = asProviderCheckoutUrl(paymentResponse);
  if (!providerCheckoutUrl) throw new Error("平台没有返回收银台地址，未继续发起支付。");
  return { orderId, checkoutToken: "", checkoutMode: "account", providerCheckoutUrl };
};

export const getAccountPaymentResult = async (
  accessToken: string,
  orderId: string,
  productCode = requirePlatformClientConfig().productCode,
  options?: { csrfToken?: string },
) => createPlatformClient({ accessToken, csrfToken: options?.csrfToken }).getPaymentResult(orderId, productCode) as Promise<{
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
) => createPlatformClient({ accessToken, csrfToken: options?.csrfToken }).getCurrentGate(productCode, accessScope) as Promise<EntitlementGateResponse>;

export const redeemInvitationCode = (accessToken: string, code: string, options?: { csrfToken?: string }) =>
  createPlatformClient({ accessToken, csrfToken: options?.csrfToken }).redeemInvitationCode(code) as Promise<InvitationCodeRedemption>;

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
  const normalized = value.startsWith("#") || value.startsWith("?") ? value.slice(1) : value;
  if (!normalized) return null;
  const params = new URLSearchParams(normalized);
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

export const restorePlatformAccessState = async (
  session: PlatformSession,
): Promise<PlatformAccessState> => {
  const authenticatedClient = createPlatformClient({
    accessToken: session.access_token,
    csrfToken: session.csrf_token,
  });

  try {
    const result = await authenticatedClient.me();
    const nextSession = { ...session, ...result.session };
    savePlatformSession(nextSession);
    return {
      session: nextSession,
      profile: result.profile,
    };
  } catch (error) {
    if (
      !(error instanceof PlatformHttpError) ||
      error.status !== 401 ||
      isPlatformRefreshExpired(session)
    ) {
      clearPlatformSession();
      throw error;
    }

    const refreshClient = createPlatformClient({ csrfToken: session.csrf_token });
    const refreshed = await refreshClient.refresh(session.refresh_token);
    const refreshedSession = {
      ...refreshed.session,
      csrf_token: session.csrf_token,
    };
    savePlatformSession(refreshedSession);

    const revalidated = await createPlatformClient({
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
  const client = createPlatformClient();
  const result = (await client.listPlans(productCode)) as PlatformPlanState;
  return {
    items: result.items ?? [],
    channels: result.channels ?? [],
  };
};

export const fetchPlatformUsage = async (accessToken = "", csrfToken = ""): Promise<PlatformUsage> => {
  const config = requirePlatformClientConfig();
  const body = await createPlatformClient({ accessToken, csrfToken }).getUsageSummary(config.productCode) as Partial<PlatformUsage> & { detail?: { message?: string } };
  return {
    product_code: body.product_code ?? config.productCode,
    available: Number(body.available ?? 0),
    reserved: Number(body.reserved ?? 0),
    consumed: Number(body.consumed ?? 0),
  };
};
