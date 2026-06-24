import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // output: 'standalone', // disabled — standalone server.js not generating in monorepo
  reactCompiler: true,
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  async redirects() {
    return [
      { source: '/jobs/:path*', destination: '/feed', permanent: false },
      { source: '/menu', destination: '/feed', permanent: false },
    ];
  },
};

export default nextConfig;
