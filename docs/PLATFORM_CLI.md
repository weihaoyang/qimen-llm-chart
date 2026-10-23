# Platform CLI

The product exposes a read-only platform smoke CLI. It uses the same registered
`qimen` / `qimen-core` coordinates as the web adapter and never creates an order,
payment attempt, reservation, or AI inference.

```powershell
npm run platform:cli -- status --json
npm run platform:cli -- health --json
npm run platform:cli -- plans --json
npm run platform:cli -- session --json
npm run platform:cli -- gate --json
npm run platform:cli -- payment-result --order-id <platform-order-id> --json
npm run platform:cli -- ai-health --json
```

For an authenticated read, set `PLATFORM_ACCESS_TOKEN` (or pass `--token`). For
browser bridge checks, pass `--cookie` and optionally `PLATFORM_CSRF_TOKEN`.
HTTP 401/403/405 responses are returned as structured boundary results so an
anonymous smoke does not look like a transport failure.

`auth-url` and `oauth-exchange` currently return
`oauth_cli_client_not_registered`; the CLI does not emit a browser-only login
URL or call the token endpoint with the browser client's identity. The platform
registry currently has no Qimen OAuth-only client. To enable product-scoped CLI
login, register the same fixed callback in both the platform and website:

```json
{
  "platform": {
    "client_code": "qimen-cli",
    "product_code": "qimen",
    "oauth_only": true,
    "platform_identity": false,
    "oauth_redirect_uris": ["http://127.0.0.1:47832/oauth/callback"]
  },
  "website": {
    "client_id": "qimen-cli",
    "oauth_redirect_uris": ["http://127.0.0.1:47832/oauth/callback"],
    "access_scope": "qimen-core"
  },
  "client": {
    "client_id": "qimen-cli",
    "product_code": "qimen",
    "access_scope": "qimen-core",
    "redirect_uri": "http://127.0.0.1:47832/oauth/callback"
  }
}
```

The CLI must not treat `singseq-cli` (platform identity only) as Qimen gate
authentication. No browser cookie or token is copied or persisted by this CLI.
