# Platform CLI

The Qimen CLI uses `qimen` / `qimen-core`. `node ops/platform-cli.mjs --help`
lists the commands. Read-only checks include:

```powershell
npm run platform:cli -- status --json
npm run platform:cli -- health --json
npm run platform:cli -- plans --json
npm run platform:cli -- session --json
npm run platform:cli -- gate --json
npm run platform:cli -- usage --json
npm run platform:cli -- payment-result --order-id <platform-order-id> --json
npm run platform:cli -- ai-health --json
npm run platform:cli -- ai-contract --json
```

## CLI OAuth

The CLI uses a distinct OAuth-only client, `qimen-cli`, and the fixed callback
`http://127.0.0.1:47832/oauth/callback`. Its authorization URL includes the
full platform contract, S256 PKCE and a 43-character state. The verifier and
state are stored under `%USERPROFILE%\.qimen\platform-oauth-state.json` (or
`QIMEN_CLI_OAUTH_STATE_FILE`) with owner-only file permissions where supported.

The platform and website must both register this exact client/product/scope/
callback before OAuth can complete. `auth-url` always emits the contract
request; the platform authorize and token endpoints are the registration
boundary and return their real structured error if the tuple is not accepted.
Do not substitute the browser client `qimen` or the platform-only
`singseq-cli` client.

Run `login` once the platform registration is present. It binds only to
`127.0.0.1:47832`, opens the platform authorization page in the default
browser, validates the returned state, exchanges the code, and saves the
session. CAPTCHA and OTP remain completed by the account holder in the browser.
For a manual flow, run `auth-url`, complete login in a browser, then pass the
callback's `code` and `state` to:

```powershell
npm run platform:cli -- oauth-exchange --code <code> --state <state> --json
npm run platform:cli -- session --json
npm run platform:cli -- session-refresh --json
npm run platform:cli -- gate --json
```

The CLI verifies the returned state before exchanging the code. A successful
exchange stores platform-issued access and refresh tokens from the OAuth-only
`desktop_session` response field (and accepts the `session` shape used by
refresh) in
`%USERPROFILE%\.qimen\platform-session.json` (or `QIMEN_CLI_SESSION_FILE`);
the file is created with owner-only permissions where supported. All commands
use that access token unless `--token` or `PLATFORM_ACCESS_TOKEN` overrides it.
Run `session-clear` to delete saved session and pending OAuth state. Tokens are
never printed by the CLI. Browser cookies are not copied into the CLI.

## Side Effects

`checkout` creates a platform order and payment attempt. `usage-reserve`,
`usage-commit`, and `usage-release` change platform usage state. `ai-run` calls
the real Qimen AI endpoint and can consume an entitlement. These commands must
only be run when the operator intends their real platform effects. Prices,
payment state, entitlement, and usage remain owned by Consumer Platform.

Authenticated reads use the CLI session file, `--token`, or
`PLATFORM_ACCESS_TOKEN`. Browser bridge checks may use `--cookie` and
`PLATFORM_CSRF_TOKEN`; the CLI does not persist browser cookies. Anonymous
401/403/405 responses are returned as structured boundary results and never
count as authenticated or gate-allowed.
