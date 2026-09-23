/**
 * Interpreting the platform's answer to a usage commit.
 *
 * The platform's commit is a **compare-and-set**, not a counter increment: it
 * consumes the credit only while `status == "reserved"`, and otherwise answers
 * `409 usage_reservation_expired`. That distinction matters to the product because
 * two different situations produce the same 409 and the response does not say
 * which one happened:
 *
 *   1. the earlier attempt's commit landed but the local "charged" record did not,
 *      so the credit is already `consumed` — the user **was** charged;
 *   2. the reservation expired before any commit landed, and the platform
 *      refunded it — the user was not charged.
 *
 * Retrying cannot help: the answer is terminal, and that reservation will never be
 * committable again. Treating it as a transient failure is therefore not a safe
 * default — it is a permanent one. Every caller reaches this point with the model
 * result (or the paid module state) already durably stored, and every caller tells
 * the user to retry, so failing here turns something the user paid for into
 * something they can never open, while each retry reproduces the same 409.
 *
 * So the 409 is reconciled as settled and the caller proceeds. Three things keep
 * that honest:
 *
 *   - **A double charge is impossible either way.** The platform's compare-and-set
 *     cannot consume one credit twice, and this path never issues a second commit
 *     for a reservation that has already been settled.
 *   - **Nothing else is swallowed.** A network error, a timeout, or a 5xx says
 *     nothing about whether the credit was consumed. Settling those would hand out
 *     results for charges that never landed, so they stay retryable and propagate.
 *   - **Only the one reason code settles.** That the commit path raises exactly one
 *     409 today is an observation, not a contract. Discriminating on the reason
 *     code means a future second 409 cannot silently settle an unconfirmed charge.
 *
 * The reconciled case is reported rather than silently absorbed: in sub-case 2 the
 * user received a paid result without being charged, and an operator should be able
 * to find that later.
 */
import { reportSwallowedError } from "@/lib/internal-log";
import { PlatformServerRequestError } from "./server";

/** The only reason code that means "this reservation is settled", not "try again". */
const SETTLED_REASON_CODE = "usage_reservation_expired";

/**
 * What a settled reservation resolves to. Callers pass it through to the client in
 * place of the platform's usage summary; it is deliberately shaped like the
 * summary enough to be JSON-serialized alongside it, and self-describing enough
 * that an operator reading a stored record can tell the charge was never confirmed.
 */
export type SettledUsage = { reconciled: "already_settled"; reason_code: string };

/**
 * Run a usage commit, treating the platform's one terminal 409 as "already
 * settled" rather than a failure.
 *
 * `commit` is a thunk instead of a token/reservation pair so each caller keeps its
 * own account-versus-guest choice visible at the call site: the platform exposes
 * separate `commit` and `guest/.../commit` endpoints, and **both** raise the same
 * terminal 409, so both need this reconciliation.
 */
export const settledCommit = async <T>(
  /** Log scope for the reconciled case, e.g. `"battle-ai"`. */
  scope: string,
  /**
   * Identifies what was settled, for the operator who later reads the log — e.g.
   * `` `reservation ${reservationId}` ``. The helper cannot derive this from a
   * thunk, and the log line is the only trace of a user who received a paid result
   * without being charged, so it has to name the reservation.
   */
  detail: string,
  commit: () => Promise<T>,
): Promise<T | SettledUsage> => {
  try {
    return await commit();
  } catch (error) {
    if (
      error instanceof PlatformServerRequestError
      && error.status === 409
      && error.reasonCode === SETTLED_REASON_CODE
    ) {
      reportSwallowedError(
        scope,
        `${detail} was already settled by the platform; continuing without re-committing`,
        error,
      );
      return { reconciled: "already_settled", reason_code: error.reasonCode };
    }
    throw error;
  }
};
