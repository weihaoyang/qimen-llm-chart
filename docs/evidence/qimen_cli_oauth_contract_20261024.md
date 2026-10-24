# Qimen CLI OAuth/session contract (2026-10-24)

## Scope

Local-only verification of the Qimen platform CLI. No CAPTCHA/OTP was
automated, no OAuth code was exchanged against production, and no order,
payment attempt, usage reservation, or AI provider call was created.

## Verified

- `auth-url` generates the canonical `https://singseq.com/oauth/authorize`
  URL with `client_id=qimen-cli`, `product_code=qimen`,
  `access_scope=qimen-core`, loopback callback, `response_type=code`, S256,
  43-character challenge and 43-character state.
- PKCE verifier/state are stored in a user-scoped pending file and are checked
  before an exchange. A mismatched state never calls `/api/v1/oauth/token`.
- With an explicit registration-confirmed test fixture, token exchange stores
  platform-issued session credentials, `session` reads the stored access token,
  `session-refresh` rotates it through `/api/v1/identity/refresh`, and CLI
  output redacts both token fields.
- `login` is a loopback-only callback helper. It refuses to start a listener
  while the required platform client registration is unconfirmed.
- The current production registry was not changed or claimed complete. The
  default CLI response remains `501 oauth_cli_client_not_registered` and
  includes the exact platform/website registration payload plus a URL preview.

## Verification command

```powershell
npm run test:platform-cli -- --run
npm run typecheck
node ops/platform-cli.mjs --help
```

Result: 14/14 CLI tests passed; TypeScript passed; help listed all supported
commands. Production OAuth still requires the Consumer Platform and website to
register `qimen-cli` with the exact loopback callback before setting
`QIMEN_CLI_OAUTH_REGISTERED=true`.
