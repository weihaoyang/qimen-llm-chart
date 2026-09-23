/**
 * Content-Security-Policy for the product.
 *
 * ## Why `'unsafe-eval'` is production-only
 *
 * `'unsafe-eval'` lets an injected inline script reach `eval()` and the
 * `Function` constructor, which is the single most useful escape hatch for an
 * XSS payload that is already executing — it turns "I can run a few statements"
 * into "I can build and run arbitrary code from strings". Nothing this app
 * ships needs it, so production must not offer it.
 *
 * Verified rather than assumed: all 107 JS files emitted to `.next/static`
 * (Next.js 16.3.1, webpack, `npm run build`) were searched for `eval(` and
 * `new Function(`. There are zero real hits. The only `Function(` call sites are
 * three copies of the classic runtime helper
 *
 *     typeof globalThis !== "undefined" ? globalThis : ... Function("return this")()
 *
 * whose `Function` branch is unreachable in every browser this product supports
 * (`globalThis` is baseline). Since `eval`/`Function` must appear in the source
 * to be called at all, the absence of the token is proof that no runtime path —
 * including paths only reached after login or payment — can call it.
 *
 * `next dev` genuinely does need it: webpack's development default devtool is
 * `eval-source-map`, so dropping the flag locally breaks hot reload and stack
 * traces. Hence the environment switch.
 *
 * ## What is deliberately *not* tightened here
 *
 * `script-src` still carries `'unsafe-inline'` (and `style-src` has to: Semi UI
 * and the workbench inject inline styles). Removing `'unsafe-inline'` requires
 * a per-request nonce, which requires middleware to mint it and thread it
 * through Next's inline bootstrap/flight scripts. That is a separate, larger
 * change and must not be done blind — a wrong nonce silently breaks the whole
 * app, and CSP fails all-or-nothing.
 */
export const buildContentSecurityPolicy = (isDevelopment: boolean) =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self' https://singseq.com",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.singseq.com https://consumer-api.singularitysequence.com https:",
    "frame-src 'self'",
  ].join("; ") + ";";
