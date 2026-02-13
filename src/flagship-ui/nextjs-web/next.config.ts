import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal server.js and copies only necessary files
  output: "standalone",

  // Include Sharp native binaries in standalone build for image optimization
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
    ],
  },
  
  // Configure remote image domains
  images: {
    // Prefer modern formats for smaller LCP image payloads.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flatironscap.com',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'd1bjh7dvpwoxii.cloudfront.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
