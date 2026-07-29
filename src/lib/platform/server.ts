import { requirePlatformServerConfig } from "@/lib/platform/config";

export type PlatformGate = {
  allowed: boolean;
  mode: string;
  product_code: string;
  access_scope: string;
  subject_type: string;
  subject_id: string;
  entitlement_source: string;
  reason_code: string;
  message: string;
};

export type PlatformUsage = {
  product_code: string;
  available: number;
  reserved: number;
  consumed: number;
};

export class PlatformServerRequestError extends Error {
  status: number;
  reasonCode: string;

  constructor(status: number, reasonCode: string, message: string) {
    super(message);
    this.status = status;
    this.reasonCode = reasonCode;
  }
}

export const readBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

export const readGuestCheckoutToken = (value: string | null) => {
  const token = value?.trim();
  return token || null;
};

export const fetchPlatformGate = async (
  accessToken: string,
  options?: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  },
): Promise<PlatformGate> => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url = new URL(
    `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/gate`,
    config.baseUrl,
  );
  url.searchParams.set("access_scope", config.accessScope);

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as Partial<PlatformGate> & {
    message?: string;
    reason_code?: string;
  };

  if (!response.ok) {
    throw new PlatformServerRequestError(
      response.status,
      body.reason_code ?? "platform_gate_request_failed",
      body.message ?? "平台 gate 请求失败。",
    );
  }

  return {
    allowed: Boolean(body.allowed),
    mode: body.mode ?? "blocked",
    product_code: body.product_code ?? config.productCode,
    access_scope: body.access_scope ?? config.accessScope,
    subject_type: body.subject_type ?? "user",
    subject_id: body.subject_id ?? "",
    entitlement_source: body.entitlement_source ?? "none",
    reason_code: body.reason_code ?? "",
    message: body.message ?? "",
  };
};

const platformUsageRequest = async (
  accessToken: string,
  path: string,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; method?: "GET" | "POST" },
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  const response = await (options?.fetchImpl ?? fetch)(new URL(path, config.baseUrl), {
    method: options?.method ?? "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as Partial<PlatformUsage> & {
    message?: string;
    reason_code?: string;
  };
  if (!response.ok) {
    throw new PlatformServerRequestError(
      response.status,
      body.reason_code ?? "platform_usage_request_failed",
      body.message ?? "分析次数请求失败。",
    );
  }
  return {
    product_code: body.product_code ?? config.productCode,
    available: Number(body.available ?? 0),
    reserved: Number(body.reserved ?? 0),
    consumed: Number(body.consumed ?? 0),
    reservation_id: typeof (body as { reservation_id?: unknown }).reservation_id === "string" ? (body as { reservation_id: string }).reservation_id : "",
  };
};

const guestUsageRequest = async (
  checkoutToken: string,
  path: string,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; method?: "POST" },
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  const response = await (options?.fetchImpl ?? fetch)(new URL(path, config.baseUrl), {
    method: options?.method ?? "POST",
    headers: { "X-Guest-Checkout-Token": checkoutToken },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as Partial<PlatformUsage> & { message?: string; reason_code?: string };
  if (!response.ok) {
    throw new PlatformServerRequestError(response.status, body.reason_code ?? "platform_usage_request_failed", body.message ?? "支付请求失败。");
  }
  return {
    product_code: body.product_code ?? config.productCode,
    available: Number(body.available ?? 0),
    reserved: Number(body.reserved ?? 0),
    consumed: Number(body.consumed ?? 0),
    reservation_id: typeof (body as { reservation_id?: unknown }).reservation_id === "string" ? (body as { reservation_id: string }).reservation_id : "",
  };
};

export const reserveGuestUsage = (checkoutToken: string, options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  return guestUsageRequest(checkoutToken, `/api/v1/entitlement/guest/products/${encodeURIComponent(config.productCode)}/usage/reserve`, options);
};

export const commitGuestUsage = (checkoutToken: string, reservationId: string, options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  return guestUsageRequest(checkoutToken, `/api/v1/entitlement/guest/products/${encodeURIComponent(config.productCode)}/usage/${encodeURIComponent(reservationId)}/commit`, options);
};

export const releaseGuestUsage = (checkoutToken: string, reservationId: string, options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  return guestUsageRequest(checkoutToken, `/api/v1/entitlement/guest/products/${encodeURIComponent(config.productCode)}/usage/${encodeURIComponent(reservationId)}/release`, options);
};

export const fetchPlatformUsage = async (
  accessToken: string,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch },
): Promise<PlatformUsage> => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  return platformUsageRequest(accessToken, `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage`, options);
};

export const reservePlatformUsage = async (
  accessToken: string,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch },
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  return platformUsageRequest(accessToken, `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage/reserve`, { ...options, method: "POST" });
};

export const commitPlatformUsage = async (
  accessToken: string,
  reservationId: string,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch },
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  return platformUsageRequest(accessToken, `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage/${encodeURIComponent(reservationId)}/commit`, { ...options, method: "POST" });
};

export const releasePlatformUsage = async (
  accessToken: string,
  reservationId: string,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch },
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  return platformUsageRequest(accessToken, `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage/${encodeURIComponent(reservationId)}/release`, { ...options, method: "POST" });
};
