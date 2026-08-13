import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-30T00:00:00.000Z");

  return [
    {
      url: "https://shengtian.singseq.com/",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://paipan.singseq.com/",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
