/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker deployment
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      // Images uploaded from the admin panel are served from media.<our domain> (Cloudflare R2).
      {
        protocol: 'https',
        hostname: 'media.oluwabamiseomolaso.com.ng',
      },
    ],
    // WebP only. AVIF is switched off because Next.js 14 has an unpatched remote-code-execution
    // flaw in the image optimiser when it handles AVIF files (fixed only in Next 15.5.24+).
    // Remove this line's restriction again after upgrading Next.js.
    formats: ['image/webp'],
  },
  experimental: {
    optimizePackageImports: ['framer-motion', '@heroicons/react', 'lucide-react'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize bundle size
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
