import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define public paths that bypass check
  const isAuthPage = pathname === '/admin';
  const isAuthApi = pathname === '/api/admin/login';
  
  // Retrieve token from the secure cookie
  const sessionCookie = request.cookies.get('admin_session');
  const token = sessionCookie?.value;

  // Verify the JWT token
  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!payload;

  // Protect Admin UI pages
  if (pathname.startsWith('/admin')) {
    if (isAuthPage) {
      if (isAuthenticated) {
        // Logged-in admins are redirected to dashboard if visiting login page
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      // Unauthenticated attempts redirected to login page
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Protect Admin API routes (excluding the login endpoint itself)
  if (pathname.startsWith('/api/admin') && !isAuthApi) {
    if (!isAuthenticated) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*'
  ]
};
