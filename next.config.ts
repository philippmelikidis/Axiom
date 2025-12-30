import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@xyflow/react'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@xyflow/react']
  }
};

export default nextConfig;
