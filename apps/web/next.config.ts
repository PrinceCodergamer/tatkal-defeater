import type { NextConfig } from 'next';

/**
 * Proxy /api/* to the NestJS backend (port 3001) so the frontend works
 * through a single public origin (tunnel / domain) without CORS issues.
 */
const API_BASE = process.env.API_BASE || 'http://localhost:3001';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
