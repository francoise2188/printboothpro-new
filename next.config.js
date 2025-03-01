/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'localhost', 
      'printboothpro.com', 
      'www.printboothpro.com',
      'printboothpro.vercel.app',
      'vercel.app'
    ],
    unoptimized: true
  },
  env: {
    // Use NEXT_PUBLIC_BASE_URL as the primary URL
    // This should be set to https://printboothpro.com in Vercel
    NEXT_PUBLIC_SITE_URL: process.env.NODE_ENV === 'production'
      ? 'https://www.printboothpro.com'
      : 'http://localhost:3000'
  },
  // Force clean builds
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Disable cache during builds
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0
  },
  // Add async rewrites to handle domain redirects
  async rewrites() {
    return {
      beforeFiles: [
        // Handle www subdomain
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: 'printboothpro.vercel.app',
            },
          ],
          destination: 'https://www.printboothpro.com/:path*',
        },
      ],
    }
  },
  // Force full page reload on route changes
  experimental: {
    strictNextHead: true
  },
  // Disable static optimization for camera routes
  async headers() {
    return [
      {
        source: '/camera/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ],
      }
    ]
  }
}

module.exports = nextConfig
