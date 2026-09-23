import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TAIBU_CORE_REFERENCE } from "./provenance";

/**
 * `provenance.ts` deliberately hard-codes the reference-engine version instead of
 * importing `package.json`, so that research exports stay auditable and the
 * whole manifest is not pulled into the client bundle. That decision is only
 * safe if something notices when the pin moves, which is this test: it is the
 * mechanism that connects `package.json` to the manifest, and it runs in CI
 * rather than in the browser.
 */
describe("TAIBU_CORE_REFERENCE", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const declared = manifest.dependencies?.["taibu-core"] ?? manifest.devDependencies?.["taibu-core"];

  it("is declared in package.json", () => {
    expect(declared).toBeDefined();
  });

  it("does not drift from the version pinned in package.json", () => {
    // `declared` is a semver range ("^3.5.0"), the manifest carries a concrete
    // version ("3.5.0"). Compare the numeric core so a caret/tilde change is not
    // mistaken for drift, but a major or minor bump is.
    const pinned = declared?.replace(/^[^\d]*/, "").split(/[\s.]/).slice(0, 2).join(".");
    const recorded = TAIBU_CORE_REFERENCE.version.split(".").slice(0, 2).join(".");
    expect(recorded).toBe(pinned);
  });

  it("stays reference-only", () => {
    // The engine is a reference for cross-checking, never a runtime dependency:
    // no product output may be derived from it.
    expect(TAIBU_CORE_REFERENCE.role).toBe("reference_only");
    expect(TAIBU_CORE_REFERENCE.license).toBe("MIT");
  });
});
