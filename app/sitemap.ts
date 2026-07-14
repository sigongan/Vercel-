import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";
import { ALTERNATIVES } from "@/lib/alternatives";
import { BLOG_POSTS } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/margin-calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/alternatives`, changeFrequency: "monthly", priority: 0.6 },
    ...ALTERNATIVES.map((a) => ({
      url: `${SITE_URL}/alternatives/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...BLOG_POSTS.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
      lastModified: p.date,
    })),
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
