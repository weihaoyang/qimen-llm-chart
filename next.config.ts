import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // The bundled God's Eye renderer is served at the same origin and embedded
  // by its qmdj route; keep framing restricted to this origin.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self' https://singseq.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.singseq.com https://consumer-api.singularitysequence.com https:; frame-src 'self';" },
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
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
