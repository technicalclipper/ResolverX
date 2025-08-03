import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Using webpack instead of Turbopack for better compatibility
  experimental: {
    turbo: false
  }
};

export default nextConfig;
