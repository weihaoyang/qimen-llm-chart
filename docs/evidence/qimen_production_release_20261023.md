# Qimen production release 2026-10-23

## Scope

This release closes the Qimen linked SDK build blocker and publishes the
product checkout at commit `828cd60f2fa75f3a51d881630151a25eb9b2819f`.
Consumer Platform source and data were not changed.

## Build and release evidence

- Local checkout: `E:/quant_staging/product-closures/qimen-llm-chart`
- Local checks: `npm run build` passed; `npm run typecheck` passed; Vitest
  `725` tests ran (`723 passed`, `2 skipped`)
- The product's `file:` SDK target was restored on the build host from the
  complete `@singularity-sequence/web-sdk@0.3.1` source, including `src/`,
  `tsconfig.json`, and workspace `tsconfig.base.json`.
- Remote host: `ubuntu@124.221.15.246`
- SDK backup: `/srv/qmdj-backups/qmdj-sdk-before-20261023-001803.tar.gz`
- Release backup: `/srv/qmdj-backups/qmdj-before-20261023-828cd60.tar.gz`
- Environment backup: `/srv/qmdj-backups/qmdj-env-before-20261023-828cd60`
- Remote `node ops/deploy/cli.mjs doctor`: `DOCTOR=ok`
- Remote release: `20261023-828cd60`
- Image: `qmdj:20261023-828cd60`
- Image ID: `sha256:bb4ac522e0b2846643ab4090e3e2d3306f86738f6e4e0fb70c38b65e3ded7c10`
- Release manifest previous image: `qmdj:20261015-a031550`
- Release result: `RELEASE_OK=20261023-828cd60`

## Public smoke checks

- `GET https://qmdj.singseq.com/api/version`: HTTP 200, release
  `20261023-828cd60`, commit `828cd60`
- `GET https://qmdj.singseq.com/api/health`: HTTP 200, `ok=true`
- `GET https://qmdj.singseq.com/paipan`: HTTP 200
- `GET https://api.singseq.com/api/v1/commerce/products/qimen/plans`:
  HTTP 200; qimen plans present; Alipay `ready=true`, `mobile_ready=true`
- Valid qimen OAuth authorize request with `qimen` / `qimen-core`:
  HTTP 200, no `授权参数不完整`, login continuation rendered
- Runtime container environment reports `PLATFORM_PRODUCT_CODE=qimen` and
  `PLATFORM_ACCESS_SCOPE=qimen-core`.

## Boundary

The smoke checks are read-only. No new order, payment attempt, OTP, or paid AI
call was created by this release verification. Full human OAuth, post-payment
entitlement restoration, and live provider usage settlement still require a
real account session and are not claimed by this evidence.
