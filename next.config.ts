import type { NextConfig } from "next";

/**
 * The whole site prerenders: the index, every prototype route, and the 404.
 * Nothing needs a server, so it ships as static assets on Cloudflare Workers.
 */
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
