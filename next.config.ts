import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Limit build-time worker processes to prevent OOM (502) on VPS
    cpus: 2,
    workerThreads: false,
    // Match proxy body buffer limit with serverActions & upload 25MB limit
    proxyClientMaxBodySize: "25mb",
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    // Serve images directly from Cloudflare R2 CDN without decoding 20MB buffers in Node RAM
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/classicedge53",
        destination: "https://classicedge53.com",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
