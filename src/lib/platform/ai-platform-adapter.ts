import { commitGuestUsage, commitPlatformUsage, releaseGuestUsage, releasePlatformUsage, reserveGuestUsage, reservePlatformUsage, type PlatformUsage } from "./server";
import type { AiBillingAdapter } from "./ai-contract";

export type AiBillingSubject =
  | { mode: "account"; accessToken: string; cookieHeader?: string; csrfToken?: string }
  | { mode: "guest"; guestToken: string };

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
