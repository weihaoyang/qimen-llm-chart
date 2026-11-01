# Local quality gate

Run the checks against the pinned `@singseq/platform-sdk` dependency:

```bash
npm run ci
```

This runs TypeScript, ESLint, Vitest, and the standalone Next.js build. The
application has no workspace link to the retired consumer-platform SDK.
