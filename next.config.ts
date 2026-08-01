import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "pub-723d911c6a3442c78b2f69b731577d2b.r2.dev",
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
