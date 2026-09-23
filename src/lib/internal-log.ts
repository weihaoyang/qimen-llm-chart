/**
 * Reporting for failures that are deliberately not propagated to the caller.
 *
 * Some cleanup and degradation paths must not change the response: releasing a
 * usage reservation inside a catch block, marking a job failed, or falling back
 * to "no research rule release" are all best-effort. Throwing from them would
 * either replace the original error or turn a harmless degradation into a 500.
 *
 * The failure mode this module exists to prevent is the opposite one — a bare
 * `catch {}` that leaves no trace at all. In production those paths are
 * invisible: the user sees a generic failure, and nothing in the logs says that
 * the reservation was never released or that the job is still `running`. So the
 * rule is: swallow the error, but never silently. Every deliberate swallow goes
 * through here.
 */

/**
 * Log a swallowed failure under a greppable scope tag.
 *
 * `scope` is the subsystem (`"battle-ai"`, `"bazi-personality"`), matching the
 * `[db]` convention in `src/lib/db/pool.ts` so one search finds every
 * self-reported internal failure. The original error is passed through intact —
 * a stringified reason would lose the stack that makes the log useful.
 */
export const reportSwallowedError = (scope: string, message: string, error: unknown): void => {
  console.error(`[${scope}] ${message}`, error);
};
