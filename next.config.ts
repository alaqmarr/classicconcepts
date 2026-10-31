import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Limit build-time worker processes to prevent OOM (502) on VPS
    cpus: 2,
    workerThreads: false,
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
