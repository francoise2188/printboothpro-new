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
    NEXT_PUBLIC_SITE_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  }
}

module.exports = nextConfig
