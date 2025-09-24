import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bin.bnbstatic.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
