import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get hostname (e.g. vercel.app, example.com)
  const hostname = request.headers.get('host') || '';
  const isWWW = hostname.startsWith('www.');
  const isPrintBoothPro = hostname.includes('printboothpro.com');

  // If it's already on the correct domain without www, don't redirect
  if (isPrintBoothPro && !isWWW) {
    return NextResponse.next();
  }

  // If it's www.printboothpro.com, redirect to printboothpro.com
  if (isPrintBoothPro && isWWW) {
    return NextResponse.redirect(
      `https://printboothpro.com${request.nextUrl.pathname}${request.nextUrl.search}`,
      { status: 301 }
    );
  }

  // For all other cases, proceed normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 