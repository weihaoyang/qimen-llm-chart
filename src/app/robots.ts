import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://qmdj.singseq.com/sitemap.xml",
    host: "https://qmdj.singseq.com",
  };
}
