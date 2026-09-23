import path from "node:path";
import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/lib/security-headers";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Same-origin framing stays restricted to this origin: the world-pulse
  // panels embed first-party views, and no third-party page should be able to
  // frame the product.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy(process.env.NODE_ENV !== "production") },
];

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
  // Lets a local verification build run beside an active preview server
  // without touching or deleting that server's .next artifacts.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The account SDK is linked from the adjacent platform repository. Tell
  // Turbopack that it is first-party source instead of treating the junction
  // as an unresolved external package during production builds.
  transpilePackages: ["@singularity-sequence/web-sdk"],
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    // `__dirname` is the application root. Pointing Turbopack at its parent
    // makes a local /paipan request crawl the entire drive before compiling.
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
  async headers() {
    // NOTE: config headers OVERRIDE headers set by a route handler (verified
    // against this Next.js version). A blanket `/api/:path*` no-store rule
    // would therefore silently clobber the deliberately public caching on the
    // observation proxy and the public catalogs. Per-account responses instead
    // declare `Cache-Control: no-store` in the route itself.
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
