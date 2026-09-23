import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    // The default 5s is too tight for this suite, and tight in a way that
    // disguises the failure. Several files are backed by PGlite, and the first
    // query in a file pays for building the WASM database and replaying all 32
    // migrations — around 5s on its own under parallel forks on a loaded
    // machine. Two of them were measured at 4.83s and 4.90s in isolation, so
    // they passed or failed depending on what else was running, and the report
    // read `Test timed out` rather than naming the actual contract.
    //
    // This only widens the budget; it does not weaken an assertion.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
