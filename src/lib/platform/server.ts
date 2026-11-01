import { requirePlatformServerConfig } from "@/lib/platform/config";
import { createPlatformClient } from "@singseq/platform-sdk";
import { randomUUID } from "node:crypto";
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
  usage_unit?: string;
  usage_label?: string;
  by_plan?: PlatformPlanUsage[];
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

export const readCookieValue = (cookieHeader: string | null, name: string) => {
  const prefix = `${name}=`;
  return cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length) ?? "";
};

type PlatformRequestOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  method?: "GET" | "POST";
  planCode?: string;
  idempotencyKey?: string;
  requestId?: string;
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
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<Response> => {
  try {
    return await fetchImpl(input, { ...init, signal: AbortSignal.timeout(PLATFORM_REQUEST_TIMEOUT_MS) });
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
  return createPlatformClient({
    baseUrl: config.baseUrl,
    auth: { type: "bearer", token: () => accessToken ?? "" },
    fetch: (input, init) => fetchPlatform(fetchImpl, input, init),
  });
};

const mapPlatformError = (error: unknown): never => {
  throw error;
};

const metricForPlan = (planCode: string) => planCode === "qimen-kline-precise-1" ? "kline_report" : "analysis_turn";

const unwrap = <T,>(result: { data?: T; error?: unknown; response: Response }): T => {
  if (result.error || result.data === undefined) {
    throw new PlatformServerRequestError(result.response.status || 502, "platform_request_failed", "平台请求未成功。");
  }
  return result.data;
};

export const fetchPlatformGate = async (
  accessToken: string | null,
  options?: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  },
): Promise<PlatformGate> => {
  const config = requirePlatformServerConfig(options?.env ?? process.env);
  try {
    const balances = unwrap(await createServerProductClient(accessToken, options).GET("/api/v1/usage/balance", { params: { query: { product_code: config.productCode } } }));
    const balance = balances.find((item) => item.metric === metricForPlan(AGENT_PLAN_CODE));
    const allowed = Boolean(balance && (balance.remaining === null || balance.remaining > 0));
    return {
      allowed,
      mode: allowed ? "usage_balance" : "blocked",
      product_code: config.productCode,
      access_scope: config.accessScope,
      subject_type: "user",
      subject_id: "",
      entitlement_source: "usage_balance",
      reason_code: allowed ? "" : "usage_exhausted",
      message: allowed ? "" : "当前账户没有可用分析额度。",
    };
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
    const metric = metricForPlan(options?.planCode ?? AGENT_PLAN_CODE);
    const balances = unwrap(await createServerProductClient(accessToken, options).GET("/api/v1/usage/balance", { params: { query: { product_code: config.productCode } } }));
    const body = balances.find((item) => item.metric === metric);
    if (!body) return { product_code: config.productCode, available: 0, reserved: 0, consumed: 0, usage_unit: metric, usage_label: metric, by_plan: [] };
    return {
      product_code: body.product_code,
      available: Number(body.remaining ?? 0), reserved: 0, consumed: 0,
      usage_unit: metric, usage_label: metric,
      by_plan: [{ plan_code: metric, available: Number(body.remaining ?? 0), reserved: 0, consumed: 0, usage_unit: metric, usage_label: metric }],
    };
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
    const result = unwrap(await createServerProductClient(accessToken, options).POST("/api/v1/usage/reservations", { body: { product_code: config.productCode, metric: metricForPlan(options?.planCode ?? AGENT_PLAN_CODE), quantity: 1, idempotency_key: (options?.idempotencyKey ?? options?.requestId ?? randomUUID()).slice(0, 128) } }));
    return { reservation_id: result.id };
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const commitPlatformUsage = async (
  accessToken: string | null,
  reservationId: string,
  options?: PlatformRequestOptions,
) => {
  requirePlatformServerConfig(options?.env ?? process.env);
  try {
    unwrap(await createServerProductClient(accessToken, options).POST("/api/v1/usage/reservations/{reservation_id}/consume", { params: { path: { reservation_id: reservationId } } }));
    return fetchPlatformUsage(accessToken, options);
  } catch (error) {
    return mapPlatformError(error);
  }
};

export const releasePlatformUsage = async (
  accessToken: string | null,
  reservationId: string,
  options?: PlatformRequestOptions,
) => {
  requirePlatformServerConfig(options?.env ?? process.env);
  try {
    unwrap(await createServerProductClient(accessToken, options).POST("/api/v1/usage/reservations/{reservation_id}/release", { params: { path: { reservation_id: reservationId } } }));
    return fetchPlatformUsage(accessToken, options);
  } catch (error) {
    return mapPlatformError(error);
  }
};
