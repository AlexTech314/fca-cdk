import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal server.js and copies only necessary files
  output: "standalone",
};

export default nextConfig;
