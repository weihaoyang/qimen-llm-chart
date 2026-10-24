# Qimen CLI desktop session response fix (2026-10-25)

The platform non-browser OAuth contract returns CLI bearer credentials in
`desktop_session`, while refresh responses use `session`. The CLI previously
only inspected `session` during the authorization-code exchange, so a real
OAuth success could be reported as `oauth_session_missing` and leave no usable
CLI session.

The exchange now prefers `desktop_session`, falls back to `session` for
refresh-compatible responses, and persists only token metadata. Regression
coverage uses the production response shape without calling the provider or
creating an order.

Verification:

```text
npm run test:platform-cli -- --run   # 14 passed
npm run typecheck                     # passed
```
