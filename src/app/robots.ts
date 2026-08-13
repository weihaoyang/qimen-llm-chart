import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://shengtian.singseq.com/sitemap.xml",
    host: "https://shengtian.singseq.com",
  };
}
