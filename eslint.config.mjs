import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore is this codebase's marker for "intentionally not
      // used" (e.g. `_request` on handlers that take no request, or a parameter
      // kept as part of a contract). Without this, such a parameter only escapes
      // the default `args: "after-used"` rule when a later parameter happens to
      // be used, so the same convention warns or not depending on argument
      // position.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
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
    "node_modules/**",
    ".superpowers/**",
    "next-env.d.ts",
    "vendor/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
