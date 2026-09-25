import { PlatformHttpError, ProductServiceClient } from "@singularity-sequence/web-sdk";
import { requirePlatformServerConfig } from "./config";
import { commitGuestUsage, commitPlatformUsage, releaseGuestUsage, releasePlatformUsage, reserveGuestUsage, reservePlatformUsage, type PlatformUsage } from "./server";
import type { AiBillingAdapter } from "./ai-contract";
import type { AiUsage } from "./ai-contract";

export type AiBillingSubject =
  | { mode: "account"; accessToken: string; cookieHeader?: string; csrfToken?: string }
  | { mode: "guest"; guestToken: string };

export type AiTokenUsageReport = {
  providerCode: string;
  modelCode: string;
  usage: AiUsage;
  idempotencyKey: string;
};

/** Report provider token usage through the server-only product service contract. */
export const reportPlatformTokenUsage = async (
  report: AiTokenUsageReport,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch },
) => {
  const env = options?.env ?? process.env;
  const secret = env.PLATFORM_PRODUCT_SERVICE_SECRET?.trim();
  if (!secret) return { reported: false as const, reasonCode: "platform_product_service_secret_missing" };
  const config = requirePlatformServerConfig(env);
  const client = new ProductServiceClient({
    baseUrl: config.baseUrl,
    refreshOnUnauthorized: false,
    fetchImpl: async (input, init) => (options?.fetchImpl ?? fetch)(input, { ...init, signal: AbortSignal.timeout(10_000) }),
  }, secret);
  try {
    const charge = await client.reportTokenUsage(config.productCode, {
      provider_code: report.providerCode,
      model_code: report.modelCode,
      input_tokens: report.usage.inputTokens ?? 0,
      output_tokens: report.usage.outputTokens ?? 0,
      ...(report.usage.cachedInputTokens !== undefined ? { cached_input_tokens: report.usage.cachedInputTokens } : {}),
      idempotency_key: report.idempotencyKey,
    });
    return { reported: true as const, charge };
  } catch (error) {
    return {
      reported: false as const,
      reasonCode: error instanceof PlatformHttpError ? error.reasonCode : "platform_token_usage_report_failed",
    };
  }
};

/** Build the product-side adapter without exposing payment or entitlement truth. */
export const createAiBillingAdapter = (subject: AiBillingSubject, audit?: AiBillingAdapter["audit"]): AiBillingAdapter => {
  const account = subject.mode === "account";
  return {
    reserve: ({ planCode }) => account
      ? reservePlatformUsage(subject.accessToken, { planCode, cookieHeader: subject.cookieHeader, csrfToken: subject.csrfToken })
      : reserveGuestUsage(subject.guestToken, { planCode }),
    commit: (reservationId, planCode): Promise<PlatformUsage> => account
      ? commitPlatformUsage(subject.accessToken, reservationId, { planCode, cookieHeader: subject.cookieHeader, csrfToken: subject.csrfToken })
      : commitGuestUsage(subject.guestToken, reservationId, { planCode }),
    release: (reservationId, planCode): Promise<PlatformUsage> => account
      ? releasePlatformUsage(subject.accessToken, reservationId, { planCode, cookieHeader: subject.cookieHeader, csrfToken: subject.csrfToken })
      : releaseGuestUsage(subject.guestToken, reservationId, { planCode }),
    audit,
  };
};
