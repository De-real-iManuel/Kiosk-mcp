import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  devIndicators: false,
  webpack(config) {
    // dom-helpers v5 removed addClass/removeClass. react-transition-group 4.x
    // (pulled in by recharts → react-smooth) still imports those old paths.
    // Alias them to local shims so the build doesn't fail.
    config.resolve.alias = {
      ...config.resolve.alias,
      'dom-helpers/addClass': path.resolve('./src/shims/dom-helpers-addClass.js'),
      'dom-helpers/removeClass': path.resolve('./src/shims/dom-helpers-removeClass.js'),
    };
    return config;
  },
};

export default nextConfig;
