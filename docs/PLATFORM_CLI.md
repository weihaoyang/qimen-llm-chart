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
