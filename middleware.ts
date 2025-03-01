import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const isVercelUrl = hostname.includes('vercel.app')
  const isProd = process.env.NODE_ENV === 'production'

  // Log the request details for debugging
  console.log('🔄 Middleware:', {
    hostname,
    isVercelUrl,
    isProd,
    path: url.pathname
  })

  // If we're on the Vercel domain in production, redirect to the main domain
  if (isProd && isVercelUrl) {
    url.protocol = 'https'
    url.host = 'www.printboothpro.com'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|static|[\\w-]+\\.\\w+).*)',
  ],
} 