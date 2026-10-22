# Qimen bounded live closure recheck (2026-10-23)

## Scope

Read-only production verification for the Qimen product. No order, payment
attempt, OAuth exchange, OTP/CAPTCHA action, AI provider call, or Consumer
Platform write was performed.

## Evidence

| Surface | Result |
| --- | --- |
| `https://qmdj.singseq.com/api/version` | HTTP 200; `releaseId=20261015-a031550`, `commit=a031550` |
| `https://qmdj.singseq.com/api/health` | HTTP 200; `{"ok":true,"service":"qmdj"}` |
| `/`, `/paipan`, `/billing/result` | HTTP 200 |
| `GET https://api.singseq.com/api/v1/commerce/products/qimen/plans` | HTTP 200; qimen plans returned |
| Anonymous `GET /api/v1/entitlement/products/qimen/gate?access_scope=qimen-core` | rejected (no account session), as required |
| GitHub `origin/main` | `f223446f32bccc78ffc01e1bc6aba0ff1537b4a6` |
| Product checkout HEAD | `f223446f32bccc78ffc01e1bc6aba0ff1537b4a6` |

The production release is therefore behind the pushed product commit. A healthy
old release is not evidence that the new checkout recovery code is live.

## Release gate

`node ops/deploy/cli.mjs doctor` failed before any mutation:

```text
FAIL docker
FAIL rsync
FAIL env file (/srv/qmdj/.env.local)
FAIL disk free >= 2GB (0.1GB)
DOCTOR=failed (4)
```

The canonical SSH read-only probe to `ubuntu@124.221.15.246` using the existing
host key and local key returned `Permission denied (publickey)`. No deployment
or rollback was attempted because the product release guard, production
credentials, and rollback target were not all available.

## Boundary

The product's focused OAuth/session/payment-recovery/AI reserve-settlement tests
were previously verified at 79/79 on the pushed checkout. This does not prove a
real browser OAuth session, settled payment recovery, or hosted AI provider
usage. Those require the account holder's browser/OTP/payment and a reachable
production serving host.
