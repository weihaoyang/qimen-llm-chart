import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every response must state its cache policy explicitly.
 *
 * This Next.js version sends no default `Cache-Control`, so omitting the header
 * does not mean "uncacheable" — it means "whatever the intermediary decides". A
 * shared cache is then free to store and replay a cookie-authenticated response
 * containing another account's data, and these routes do not send `Vary: Cookie`.
 *
 * Two helpers cover the two cases: `noStore()` for anything scoped to an account,
 * `publicCatalog()` for the account-free catalogs. A route that builds its own
 * response with `NextResponse.json` must therefore also set the header itself.
 *
 * Routes that only delegate — importing a shared handler, or re-exporting a
 * sibling route — carry no response of their own and are exempt by construction,
 * which is why the rule is "if you build a response, declare its policy" rather
 * than "every route file must mention a header".
 */
const routeFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });

describe("route cache policy", () => {
  const routes = routeFiles("src/app/api");

  it("never builds a response without declaring a cache policy", () => {
    const offenders = routes.filter((file) => {
      const source = readFileSync(file, "utf8");
      return /NextResponse\.json\(/.test(source) && !/Cache-Control/.test(source);
    });

    expect(offenders).toEqual([]);
  });

  // A guard that silently matches nothing passes for the wrong reason. Pin both
  // the population and the fact that the exempt routes really are delegating.
  it("actually inspects the route tree", () => {
    expect(routes.length).toBeGreaterThan(60);

    const declaring = routes.filter((file) => {
      const source = readFileSync(file, "utf8");
      return /noStore\(|publicCatalog\(|Cache-Control/.test(source);
    });
    expect(declaring.length).toBeGreaterThan(60);

    const delegating = routes.filter((file) => {
      const source = readFileSync(file, "utf8");
      return /export \{.*\} from "\.\.?\//.test(source) || /return handle[A-Za-z]+\(/.test(source);
    });
    expect(delegating.length).toBeGreaterThan(3);
  });
});
