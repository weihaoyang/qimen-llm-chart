import { commitPlatformUsage, releasePlatformUsage, reservePlatformUsage, type PlatformUsage } from "./server";
import type { AiBillingAdapter } from "./ai-contract";

export type AiBillingSubject = { mode: "account"; accessToken: string };

/** Build the product-side adapter without exposing payment or entitlement truth. */
export const createAiBillingAdapter = (subject: AiBillingSubject, audit?: AiBillingAdapter["audit"]): AiBillingAdapter => ({
  reserve: ({ planCode, requestId }) => reservePlatformUsage(subject.accessToken, { planCode, requestId }),
  commit: (reservationId, planCode): Promise<PlatformUsage> => commitPlatformUsage(subject.accessToken, reservationId, { planCode }),
  release: (reservationId, planCode): Promise<PlatformUsage> => releasePlatformUsage(subject.accessToken, reservationId, { planCode }),
  audit,
});
