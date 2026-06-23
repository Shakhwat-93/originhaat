import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  // Compress responses
  compress: true,

  // Power output for Vercel
  poweredByHeader: false,

  // Trailing slash consistency
  trailingSlash: false,
};

export default nextConfig;
