import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  // Single-page export: assetPrefix keeps prerendering at / while Pages
  // serves the exported files under the repository URL.
  assetPrefix: process.env.PAGES_BASE_PATH || '',
  images: { unoptimized: true },
};

export default nextConfig;
