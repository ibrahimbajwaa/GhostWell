import type { NextConfig } from "next";

// Static export: every page is pre-built to plain HTML at build time,
// so the site can be hosted anywhere (Vercel, GitHub Pages, S3...).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
