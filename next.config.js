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
    // WebP only. AVIF was switched off while Next.js 14 had an unpatched remote-code-execution
    // flaw in the AVIF path. Next.js 15.5.27 has the fix, so AVIF could be turned back on
    // (it makes smaller files but costs more CPU); left off for now.
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
  // (swcMinify was removed: SWC minification is always on in Next.js 15)
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
