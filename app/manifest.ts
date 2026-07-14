import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TAGLINE_EN } from "@/lib/siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_TAGLINE_EN,
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9", // stone-50, matches the app background
    theme_color: "#fafaf9",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
