import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // This is required for Docker deployment

  // Skip static generation for authenticated pages during build
  // Clerk requires runtime environment variables
  experimental: {
    skipTrailingSlashRedirect: true,
  },
};

export default nextConfig;
