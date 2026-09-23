import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every route must map a caught error through `errorResponse()`.
 *
 * The inline form this replaces — `error instanceof AccountSubjectError ? … : …` —
 * looks equivalent and is not. It drops the entitlement platform's `reasonCode`,
 * drops `UserFacingError` (so a deliberately user-facing message becomes a generic
 * 500), and answers an unmapped internal error with a fixed sentence **while
 * recording nothing anywhere**. That last part is the entire reason
 * `internal-log.ts` exists, and 48 routes violated it at once.
 *
 * The same trap appeared twice more in different shapes:
 *  - three routes tested for a domain error class themselves and answered with
 *    `error.message` plus a hardcoded status — which is also how a raw message
 *    escapes to the browser. Those classes now carry their own `status` /
 *    `reasonCode` (see `UserFacingError`), so no route needs to branch on them;
 *  - three internal routes answered with
 *    `error instanceof Error ? error.message : "…"`, which forwards a deliberate
 *    rejection reason **and** a raw Postgres failure with equal enthusiasm.
 *
 * The duplication is invisible to the tests that cover those routes, because each
 * one only exercises the branches it happens to hit. So the invariant is checked
 * structurally here instead: the shared helper is the only place allowed to decide
 * how a caught error becomes a response.
 *
 * This is a tripwire, not a proof — it matches the shapes the codebase actually
 * used. `const { message } = error` would slip past it.
 */
const forbiddenInRoutes = [
  "instanceof AccountSubjectError",
  "instanceof BattleIntegrityError",
];

/** Ways a caught error's own text reaches a response body. */
const rawErrorTextPatterns = [
  /error:\s*error\.message/,
  /error:\s*err\.message/,
  /error:\s*String\(error\)/,
  /error:\s*error\.toString\(\)/,
  /error:\s*error instanceof Error \? error\.message/,
  /error:\s*\(error as Error\)\.message/,
];

const routeFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });

/** Bodies of every catch clause, via brace matching (nesting depth is unbounded). */
const catchBodies = (source: string): { bound: boolean; body: string }[] => {
  const clauses: { bound: boolean; body: string }[] = [];
  // The leading `}` is load-bearing: a real catch clause always follows the
  // closing brace of its `try` block, while a comment that merely *mentions*
  // `catch {` (as this file's own doc comment does) does not. Without it the
  // matcher invents phantom clauses out of prose.
  const opener = /}\s*catch\s*(\(([^)]*)\))?\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source))) {
    let depth = 1;
    let index = match.index + match[0].length;
    while (index < source.length && depth > 0) {
      if (source[index] === "{") depth += 1;
      else if (source[index] === "}") depth -= 1;
      index += 1;
    }
    clauses.push({ bound: Boolean(match[2]), body: source.slice(match.index + match[0].length, index - 1) });
  }
  return clauses;
};

/** An explicit 5xx handed to the caller, in either response shape this tree uses. */
const fiveXxResponse = /status\s*:\s*5\d\d|jsonError\(\s*5\d\d/;
/** A call that records the cause, or forwards it through the shared mapper. */
const recordsCause = /errorResponse\(|reportSwallowedError\(|internalErrorReason\(/;

describe("route error mapping", () => {
  const routes = routeFiles("src/app/api");

  it("never reimplements the mapping inline", () => {
    const offenders = routes.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return forbiddenInRoutes
        .filter((pattern) => source.includes(pattern))
        .map((pattern) => `${file}: ${pattern}`);
    });
    expect(offenders).toEqual([]);
  });

  it("never puts a caught error's own text into a response body", () => {
    const offenders = routes.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return rawErrorTextPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern}`);
    });
    expect(offenders).toEqual([]);
  });

  /**
   * A catch that answers 5xx must record the cause somewhere.
   *
   * The extreme case is a bare `catch {`: it cannot bind the error, so it can
   * never record anything, and a 5xx from one is *always* a silent internal
   * failure. That was the shape the 48-route refactor was structurally blind to —
   * it matched `error instanceof AccountSubjectError ? … : …`, and a bare catch
   * contains no such expression, so it was never converted and never gained the
   * logging `errorResponse()` provides. The multiset comparison that later
   * verified that refactor could not see it either: the old code already answered
   * with a literal sentence, so the (message, status) pair matched before and
   * after. Semantic comparison and population coverage catch different failures;
   * this file needs both.
   *
   * The rule below is the general form, because binding the error is only half
   * the job — `catch (error) { void error; return …500… }` satisfies it and still
   * records nothing. There is no allow-list: a route that deliberately degrades
   * still wants the cause in the logs, and recording it never changes the
   * response.
   *
   * Tripwire, not a proof: a route that hands the status to a response as a
   * variable (`{ status }`) is not matched, and neither is a 5xx produced outside
   * a catch clause.
   */
  it("records the cause behind every explicit 5xx a catch returns", () => {
    const offenders = routes.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return catchBodies(source)
        .map((clause) => clause.body.replace(/\s+/g, " ").trim())
        .filter((body) => fiveXxResponse.test(body) && !recordsCause.test(body))
        .map((body) => `${file}: ${body.slice(0, 90)}`);
    });
    expect(offenders).toEqual([]);
  });

  // A guard that silently matches nothing passes for the wrong reason and protects
  // nothing — the same failure this whole audit keeps finding. Pin the population.
  it("actually inspects the route tree", () => {
    expect(routes.length).toBeGreaterThan(60);
    const usingHelper = routes.filter((file) => /errorResponse\(/.test(readFileSync(file, "utf8")));
    expect(usingHelper.length).toBeGreaterThan(40);
    const clauses = routes.flatMap((file) => catchBodies(readFileSync(file, "utf8")));
    expect(clauses.length).toBeGreaterThan(60);
    expect(clauses.some((clause) => !clause.bound)).toBe(true);
    expect(clauses.filter((clause) => fiveXxResponse.test(clause.body)).length).toBeGreaterThan(2);
  });
});
