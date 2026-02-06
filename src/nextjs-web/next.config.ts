import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal server.js and copies only necessary files
  output: "standalone",
  
  // Configure remote image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flatironscap.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;
