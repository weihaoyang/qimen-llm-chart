# Qimen CLI live registration recheck (2026-10-24)

The Consumer Platform production container `consumer-platform-api-shadow` is
running image `consumer-platform-shadow-consumer-platform-api:20261024-b0c34c9-cli-registry`.
Its runtime `SS_OAUTH_REDIRECT_URI_ALLOWLIST` contains the exact
`qimen-cli|http://127.0.0.1:47832/oauth/callback` entry. The website authorize
website release `0cf1fba` contains the matching `qimen-cli` client catalog
entry. A complete authorize URL receives HTTP 200, although that route serves
the SPA and the status alone is not treated as proof of client acceptance.

The CLI no longer requires a locally injected `QIMEN_CLI_OAUTH_REGISTERED`
boolean. It emits the canonical PKCE URL and lets the platform authorize/token
endpoints decide registration; invalid client or redirect responses remain
structured failures. State and PKCE validation, token redaction, refresh and
session persistence remain unchanged.

Verification:

```powershell
npm run test:platform-cli -- --run
npm run typecheck
```

Result: 13/13 CLI tests passed and TypeScript passed. The platform allowlist is
the authoritative live registration check; the website source/release provides
the matching authorization-page catalog entry. No CAPTCHA/OTP was
automated, no production OAuth code was exchanged, and no order, payment,
usage reservation or AI provider call was created.
