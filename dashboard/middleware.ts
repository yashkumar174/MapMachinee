import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Very basic edge check. The real secure validation happens in Server API routes using firebase-admin!
  const hasToken = request.cookies.has('session');
  
  if (!hasToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
