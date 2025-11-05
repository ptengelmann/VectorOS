import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // This is required for Docker deployment
};

export default nextConfig;
