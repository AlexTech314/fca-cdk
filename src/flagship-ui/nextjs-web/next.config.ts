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
    unoptimized: true,
  },
};

export default nextConfig;
