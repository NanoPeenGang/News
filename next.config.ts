import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
    ],
  },
  // Transpile react-globe.gl for Next.js compatibility
  transpilePackages: ['react-globe.gl', 'globe.gl', 'three-globe'],
};

export default nextConfig;
