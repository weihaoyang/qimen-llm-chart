import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { buildContentSecurityPolicy } from "./security-headers";

describe("content security policy", () => {
  // Regression guard: `'unsafe-eval'` is what turns an already-executing XSS
  // payload into arbitrary code execution. The production bundle was verified to
  // contain no `eval(` / `new Function(` call sites, so production must not
  // advertise the capability.
  it("never offers 'unsafe-eval' in production", () => {
    const policy = buildContentSecurityPolicy(false);
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("script-src 'self' 'unsafe-inline';");
  });

  it("keeps 'unsafe-eval' for the webpack dev server", () => {
    expect(buildContentSecurityPolicy(true)).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
    );
  });

  it("keeps every directive the app depends on", () => {
    const policy = buildContentSecurityPolicy(false);
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self' https://singseq.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.singseq.com https://consumer-api.singularitysequence.com https:",
      "frame-src 'self'",
    ]) {
      expect(policy).toContain(directive);
    }
  });

  it("serializes with single semicolon separators and one terminator", () => {
    const policy = buildContentSecurityPolicy(false);
    expect(policy.endsWith("frame-src 'self';")).toBe(true);
    expect(policy).not.toContain(";;");
    expect(policy).not.toContain(";  ");
  });
});

describe("next.config security headers", () => {
  it("serves the generated policy rather than a hardcoded string", async () => {
    const entries = (await nextConfig.headers?.()) ?? [];
    const headers = "headers" in entries[0] ? entries[0].headers : [];
    const csp = headers.find((header) => header.key === "Content-Security-Policy");

    expect(csp?.value).toBe(buildContentSecurityPolicy(process.env.NODE_ENV !== "production"));
  });

  it("keeps the other transport and framing protections", async () => {
    const entries = (await nextConfig.headers?.()) ?? [];
    const headers = "headers" in entries[0] ? entries[0].headers : [];
    const keys = headers.map((header) => header.key);

    expect(keys).toEqual([
      "Strict-Transport-Security",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy",
    ]);
  });
});
