import { requirePlatformServerConfig } from "@/lib/platform/config";
import { PlatformHttpError, ProductPlatformClient } from "@singularity-sequence/web-sdk";
import {
  PLATFORM_BRIDGE_ACCESS_COOKIE,
  PLATFORM_BRIDGE_CSRF_COOKIE,
  PLATFORM_BRIDGE_REFRESH_COOKIE,
} from "@/lib/platform/bridge";
import { AGENT_PLAN_CODE } from "@/lib/platform/contracts";
export { AGENT_PLAN_CODE, KLINE_PLAN_CODE } from "@/lib/platform/contracts";

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

const PLATFORM_COOKIE_NAMES = new Set(["ssp_access", "ssp_refresh", "ssp_csrf"]);
const QMDJ_COOKIE_ALIASES: Record<string, string> = {
  [PLATFORM_BRIDGE_ACCESS_COOKIE]: "ssp_access",
  [PLATFORM_BRIDGE_REFRESH_COOKIE]: "ssp_refresh",
  [PLATFORM_BRIDGE_CSRF_COOKIE]: "ssp_csrf",
};

export const readPlatformCookieHeader = (cookieHeader: string | null) => {
  const values = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const selected = new Map<string, string>();
  for (const part of values.filter((value) => PLATFORM_COOKIE_NAMES.has(value.split("=", 1)[0] ?? ""))) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const sourceName = part.slice(0, separator);
    selected.set(sourceName, part);
  }
  for (const part of values) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const targetName = QMDJ_COOKIE_ALIASES[part.slice(0, separator)];
    if (!targetName || selected.has(targetName)) continue;
    selected.set(targetName, `${targetName}=${part.slice(separator + 1)}`);
  }
  return [...selected.values()].join("; ");
};

export const readCookieValue = (cookieHeader: string | null, name: string) => {
  const names = [name, ...Object.entries(QMDJ_COOKIE_ALIASES).filter(([, target]) => target === name).map(([source]) => source)];
  const parts = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim());
  for (const candidate of names) {
    const prefix = `${candidate}=`;
    const found = parts.find((part) => part.startsWith(prefix));
    if (found) return found.slice(prefix.length);
  }
  return "";
};

type PlatformRequestOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  method?: "GET" | "POST";
  planCode?: string;
  cookieHeader?: string;
  csrfToken?: string;
};

const PLATFORM_REQUEST_TIMEOUT_MS = 10_000;

/**
 * A platform call must never hang a product request indefinitely. A stalled
 * gate or usage lookup would otherwise hold the request open — and, on the
 * streaming path, keep a usage reservation alive — until the runtime kills it.
 * Timeouts are surfaced as PlatformServerRequestError so callers can map them
 * to a status code instead of an opaque 500.
 */
const fetchPlatform = async (
  fetchImpl: typeof fetch,
  url: URL,
  init: RequestInit,
): Promise<Response> => {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(PLATFORM_REQUEST_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new PlatformServerRequestError(504, "platform_request_timeout", "平台响应超时，请稍后重试。");
    }
    throw error;
  }
};

const createServerProductClient = (
  accessToken: string | null,
  options?: PlatformRequestOptions,
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  const fetchImpl = options?.fetchImpl ?? fetch;
  return new ProductPlatformClient({
    baseUrl: config.baseUrl,
    getAccessToken: () => accessToken,
    getCookieHeader: () => options?.cookieHeader ?? null,
    getCsrfToken: () => options?.csrfToken ?? null,
    refreshOnUnauthorized: false,
    fetchImpl: (input, init) => fetchPlatform(fetchImpl, new URL(String(input)), init ?? {}),
  });
};

const mapPlatformError = (error: unknown): never => {
  if (error instanceof PlatformHttpError) {
    throw new PlatformServerRequestError(error.status, error.reasonCode, error.message);
  }
  throw error;
};

export const fetchPlatformGate = async (
  accessToken: string | null,
  options?: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    cookieHeader?: string;
    csrfToken?: string;
  },
): Promise<PlatformGate> => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    const body = await createServerProductClient(accessToken, options).getCurrentGate(config.productCode, config.accessScope);
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
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const reserveGuestUsage = async (checkoutToken: string, options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; planCode?: string }) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    return await createServerProductClient(null, options).reserveGuestUsage(config.productCode, checkoutToken, options?.planCode ?? AGENT_PLAN_CODE);
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const commitGuestUsage = async (checkoutToken: string, reservationId: string, options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; planCode?: string }) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    return await createServerProductClient(null, options).commitGuestUsage(config.productCode, checkoutToken, reservationId, options?.planCode ?? AGENT_PLAN_CODE);
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const releaseGuestUsage = async (checkoutToken: string, reservationId: string, options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; planCode?: string }) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    return await createServerProductClient(null, options).releaseGuestUsage(config.productCode, checkoutToken, reservationId, options?.planCode ?? AGENT_PLAN_CODE);
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const fetchPlatformUsage = async (
  accessToken: string | null,
  options?: PlatformRequestOptions,
): Promise<PlatformUsage> => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    const body = await createServerProductClient(accessToken, options).getUsageSummary(config.productCode);
    return { product_code: body.product_code ?? config.productCode, available: Number(body.available ?? 0), reserved: Number(body.reserved ?? 0), consumed: Number(body.consumed ?? 0) };
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const reservePlatformUsage = async (
  accessToken: string | null,
  options?: PlatformRequestOptions,
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    return await createServerProductClient(accessToken, options).reserveUsage(config.productCode, options?.planCode ?? AGENT_PLAN_CODE);
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const commitPlatformUsage = async (
  accessToken: string | null,
  reservationId: string,
  options?: PlatformRequestOptions,
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    return await createServerProductClient(accessToken, options).commitUsage(config.productCode, reservationId, options?.planCode ?? AGENT_PLAN_CODE);
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const releasePlatformUsage = async (
  accessToken: string | null,
  reservationId: string,
  options?: PlatformRequestOptions,
) => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    return await createServerProductClient(accessToken, options).releaseUsage(config.productCode, reservationId, options?.planCode ?? AGENT_PLAN_CODE);
  } catch (error) {
    return mapPlatformError(error);
  }
};
