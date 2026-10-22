# Qimen platform contract guard (2026-10-24)

## Scope

Read-only production probes plus a Qimen-only release guard. No order, payment,
OAuth exchange, or AI provider call was created.

## Findings and changes

- Runtime product defaults were already sourced from `config/ai-product-manifest.json`
  as `product_code=qimen` and `access_scope=qimen-core`.
- `.env.example` and `README.md` incorrectly documented the retired
  `shengtian-banzi` coordinates; both now use `qimen/qimen-core`.
- `ops/deploy/cli.mjs doctor` now reads the configured env file and fails before
  release when the effective product coordinates are not `qimen/qimen-core`.

## Verification

- `npm run typecheck`: passed.
- `npm test -- --run src/lib/platform/config.test.ts src/lib/platform/browser.test.ts src/lib/platform/client.test.ts src/lib/platform/server.test.ts`: 22/22 passed.
- `NEXT_DIST_DIR=.next-qimen-contract-verify npm run build`: passed; linked web SDK and all Next routes compiled.
- `QMDJ_ENV_FILE=.env.example node ops/deploy/cli.mjs doctor`: product contract check passed; doctor stopped on the workstation-only missing Docker and rsync prerequisites.
- Public `https://qmdj.singseq.com/api/health`: 200; `/api/version`: `20261023-828cd60`.
- Public platform plans `GET /api/v1/commerce/products/qimen/plans`: 200.
- Anonymous gate and usage reserve both returned the expected 401 `identity_session_invalid`.
- Canonical OAuth authorize URL with `qimen`, `qimen-core`, hash callback, 43-character PKCE challenge and 43-character state returned HTTP 200. No credentials were submitted and no code was exchanged.

## Release boundary

The source and build are ready, but this workstation cannot run the guarded
release because Docker and rsync are unavailable and no production SSH/serving
host is reachable from this checkout. Production remains on
`20261023-828cd60` until the existing host release entry point is available.
