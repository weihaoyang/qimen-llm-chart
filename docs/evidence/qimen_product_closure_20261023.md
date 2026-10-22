# Qimen product closure probe 2026-10-23

## Read-only production evidence

- `https://qmdj.singseq.com/api/health` returned HTTP 200 with `service=qmdj`.
- `https://qmdj.singseq.com/api/version` returned HTTP 200 with release `20261023-828cd60`, commit `828cd60`.
- `npm run platform:cli -- health --json`, `gate --json`, `payment-result --order-id closure-smoke-20261023 --json`, and `ai-health --json` passed their boundary checks. Anonymous gate and payment-result returned the expected 401 `identity_session_invalid`; `GET /api/agent` returned the expected 405 method boundary.
- `GET https://qmdj.singseq.com/#/auth/callback?code=closure-smoke&state=closure-state` returned 200; the unregistered path callback returned 404.
- `npm run test:platform-cli -- --run` passed 4/4 tests; `npm run typecheck` passed.

## Release gate

`QMDJ_ENV_FILE=.env.example node ops/deploy/cli.mjs doctor` passed the qimen/qimen-core contract check but failed because Docker and rsync are unavailable in this workstation environment. The configured production host `ubuntu@124.221.15.246` was probed with the existing `KeyPair-hzh-6c4c.pem` and returned `Permission denied (publickey)`. No production mutation was attempted. The public release therefore remains `20261023-828cd60`.
