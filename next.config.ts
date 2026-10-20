import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
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
        source: '/classicedge53',
        destination: 'https://classicedge53.com',
        permanent: true, // Use false if it's a temporary redirect
      },
    ];
  },
};

export default nextConfig;
