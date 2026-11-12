import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export keeps the internal console off ECS. CloudFront routes
  // /internal-admin* to the admin static origin; the merchant app stays separate.
  output: "export",
  basePath: "/internal-admin",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
