import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Skip ESLint during production build (we run lint separately in CI/dev)
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: '/barber', destination: '/admin/profile', permanent: true },
      { source: '/barber/calendar', destination: '/admin/calendar', permanent: true },
      { source: '/barber/availability', destination: '/admin/profile?tab=hours', permanent: true },
      { source: '/barber/time-off', destination: '/admin/profile?tab=timeoff', permanent: true },
      { source: '/barber/customers', destination: '/admin/customers', permanent: true },
      { source: '/barber/customers/:id', destination: '/admin/customers/:id', permanent: true },
      { source: '/barber/messages', destination: '/admin/profile?tab=templates', permanent: true },
    ];
  },
};

export default nextConfig;
