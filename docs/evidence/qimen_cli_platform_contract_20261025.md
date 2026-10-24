# Qimen CLI platform contract check (2026-10-25)

`npm run platform:cli -- contract` reads the registered product directory and
the configured product's plan catalog from Consumer Platform. It reports the
platform's scope, capabilities, plans, and channel availability alongside the
product manifest, and exits non-zero when their scopes, capabilities, or plan
codes drift. It performs GET requests only; it does not create orders, payments,
sessions, or AI requests.

The platform already exposes these facts through `GET /api/v1/commerce/products`
and `GET /api/v1/commerce/products/{product_code}/plans`. No platform API or
local duplicate contract was needed.

Verification: `npm run test:platform-cli` passed. A live invocation of the new
command returned HTTP 200 for both endpoints; the platform registered `qimen` /
`qimen-core`, the two expected plans, and Alipay ready / WeChat Pay disabled.
