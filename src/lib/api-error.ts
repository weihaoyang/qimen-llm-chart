import { AccountSubjectError } from "@/lib/agent/account-subject";
import { noStore } from "@/lib/http";
import { reportSwallowedError } from "@/lib/internal-log";
import { UserFacingError } from "@/lib/user-facing-error";

export { UserFacingError };

/**
 * Platform failures are recognised structurally rather than with `instanceof`.
 *
 * Several route tests replace `@/lib/platform/server` with a partial mock; a
 * missing `PlatformServerRequestError` export would turn `instanceof` into
 * `TypeError: Right-hand side of 'instanceof' is not callable` and take the
 * whole catch block down with it. The shape check also matches what
 * `src/app/api/agent/route.ts` already did before this helper existed.
 */
const isPlatformFailure = (
  error: unknown,
): error is { status: number; reasonCode?: string; message: string } =>
  typeof error === "object" &&
  error !== null &&
  typeof (error as { status?: unknown }).status === "number" &&
  typeof (error as { message?: unknown }).message === "string";

/**
 * Maps a caught error to a response without leaking internals.
 *
 * `AccountSubjectError` and `UserFacingError` carry deliberate user-facing
 * messages. `AccountSubjectError` owns its status; `UserFacingError` uses the
 * route's `fallbackStatus` unless the error itself asserts a `status` (a
 * request-shape failure is 400/409 from any route). The entitlement platform is
 * the source of truth for its own failures, so its explanation and `reasonCode`
 * are forwarded too. Everything else — database, provider, network,
 * configuration — becomes `fallback`.
 *
 * The last branch is the only one where the cause is deliberately discarded, so
 * it is also the only one that has to be recorded. Without that log the failure
 * is unrecoverable after the fact: the caller gets a generic sentence and
 * nothing anywhere says what actually broke.
 */
export const errorResponse = (error: unknown, fallback: string, fallbackStatus = 500) => {
  if (error instanceof AccountSubjectError) return noStore({ error: error.message }, { status: error.status });
  if (error instanceof UserFacingError) {
    // `status` is set only by errors that are failures of the request itself
    // (see `UserFacingError`); everything else keeps the route's own contract.
    const body = error.reasonCode
      ? { error: error.message, reasonCode: error.reasonCode }
      : { error: error.message };
    return noStore(body, { status: error.status ?? fallbackStatus });
  }
  if (isPlatformFailure(error)) {
    return noStore(
      { error: error.message, reasonCode: error.reasonCode ?? "platform_request_failed" },
      { status: error.status },
    );
  }
  reportSwallowedError("api", `未映射的内部错误已降级为通用响应（status=${fallbackStatus}，fallback=${fallback}）。`, error);
  return noStore({ error: fallback }, { status: fallbackStatus });
};

/**
 * The message to persist in an internal audit row or hand to an operator-only
 * endpoint, where the underlying cause is wanted.
 */
export const internalErrorReason = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;
