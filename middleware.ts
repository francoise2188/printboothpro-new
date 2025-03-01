import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the hostname and full URL for debugging
  const hostname = request.headers.get('host') || ''
  const url = request.url
  const pathname = new URL(url).pathname
  
  // Debug log
  console.log('Middleware running:', {
    hostname,
    url,
    pathname,
    isProduction: process.env.NODE_ENV === 'production'
  })

  // Skip www redirect for event and camera routes
  if (pathname.startsWith('/event/') || pathname.startsWith('/camera/')) {
    return NextResponse.next()
  }

  // Only run this in production and only for the main domain
  if (process.env.NODE_ENV === 'production' && hostname.includes('printboothpro.com')) {
    // If the hostname doesn't start with 'www.'
    if (!hostname.startsWith('www.')) {
      // Create the new URL with 'www.'
      const newUrl = new URL(url)
      newUrl.host = `www.${hostname}`
      
      console.log('Redirecting to:', newUrl.toString())
      
      // Return a permanent redirect response
      return NextResponse.redirect(newUrl.toString(), {
        status: 308
      })
    }
  }

  // For all other cases, continue with the request
  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. all root files (e.g. /favicon.ico)
     */
    '/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)',
  ],
} 