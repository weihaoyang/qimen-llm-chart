import { PlatformHttpError, type PlanCatalogItem, type PlatformProfile, type PlatformSession } from "@singularity-sequence/web-sdk";
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

export type GuestCheckout = {
  order: { order_id: string; amount_cny: number; status: string };
  checkout_token: string;
  checkout_token_expires_at_iso: string;
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

export const createGuestCheckout = (planCode: string, paymentChannel: string) =>
  guestRequest<GuestCheckout>("/api/v1/commerce/guest/orders", {
    method: "POST",
    body: { product_code: requirePlatformClientConfig().productCode, plan_code: planCode, payment_channel: paymentChannel },
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
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
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

    const refreshClient = createPlatformClient();
    const refreshed = await refreshClient.refresh(session.refresh_token);
    savePlatformSession(refreshed.session);

    const revalidated = await createPlatformClient({
      accessToken: refreshed.session.access_token,
    }).me();
    const nextSession = { ...refreshed.session, ...revalidated.session };
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

export const fetchPlatformUsage = async (accessToken: string): Promise<PlatformUsage> => {
  const config = requirePlatformClientConfig();
  const response = await fetch(
    new URL(`/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage`, config.baseUrl),
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  const body = (await response.json().catch(() => ({}))) as Partial<PlatformUsage> & { detail?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.detail?.message ?? "读取分析次数失败。", { cause: response.status });
  }
  return {
    product_code: body.product_code ?? config.productCode,
    available: Number(body.available ?? 0),
    reserved: Number(body.reserved ?? 0),
    consumed: Number(body.consumed ?? 0),
  };
};
