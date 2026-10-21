# Linked Web SDK build recheck, 2026-10-23

The Qimen build helper now accepts an explicit `QIMEN_WEB_SDK_SOURCE` directory
for isolated checkout layouts, while still validating the SDK package name and
version and preserving the default junction checks.

## Verification

- SDK source: `E:\quant_staging\product-closures\consumer-platform-readonly\packages\web-sdk`
- Command: `$env:QIMEN_WEB_SDK_SOURCE=...; npm run build`
- Result: production Next build passed; SDK TypeScript compilation, Next
  compilation, TypeScript checking, page data collection, 16/16 static pages,
  and trace finalization all completed successfully.
- Focused paid-analysis recovery tests: `9/9` passed.
- `git diff --check`: passed.
- The Consumer Platform checkout was read only; no platform source, config,
  database, or deployment state was changed.

## Boundary

This proves a reproducible local Qimen build and callback/payment recovery
implementation. It does not prove production deployment or a real account
login/payment settlement; the public Qimen path callback remains unavailable
until its registered callback is updated or the hash-compatible product build
is deployed.

