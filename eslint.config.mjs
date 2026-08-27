import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Isolated local verification builds use NEXT_DIST_DIR=.next-<name>.
    // They contain generated bundles, never source files.
    ".next-*/**",
    ".codex-release-stage-*/**",
    "out/**",
    "outputs/**",
    "build/**",
    // God's Eye View is a separately-built static renderer mounted under
    // public/. Its minified Vite output is not qmdj source and should not be
    // parsed by the application lint pass.
    "gods-eye-view/**",
    "public/gods-eye-view/**",
    "node_modules/**",
    ".superpowers/**",
    "next-env.d.ts",
    "vendor/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
