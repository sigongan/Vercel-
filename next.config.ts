import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (pdfjs-dist) ships a worker file that bundlers can't resolve
  // as a chunk; run it as a plain Node require instead.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
