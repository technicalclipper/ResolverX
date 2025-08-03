import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove standalone output for Vercel
  trailingSlash: false, // Vercel handles this better without trailing slash
  images: {
    domains: ['localhost'], // Add any external image domains you use
    unoptimized: true
  },
  // Ensure API requests are properly routed
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/:path*`
      }
    ];
  },
  // Enable strict mode for better error catching
  reactStrictMode: true
};

export default nextConfig;
