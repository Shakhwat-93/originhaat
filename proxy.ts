import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const headers = request.headers;
  const proto = headers.get('x-forwarded-proto');
  const host = headers.get('x-forwarded-host') || headers.get('host') || '';

  // Check if this is a local development host (localhost, loopback IP, or local network IP)
  const isLocalHost =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('[::1]') ||
    host.includes('lvh.me') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.');

  console.log(`[PROXY DEBUG] Host: ${host} | Local: ${isLocalHost} | Proto: ${proto}`);

  // Only redirect to HTTPS in production environments and for non-local domains
  if (!isLocalHost && proto === 'http') {
    // Reconstruct the HTTPS URL using the forwarded host and path/query.
    const httpsUrl = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      `https://${host}`
    );
    
    // Perform a permanent (301) redirect to preserve SEO link equity.
    return NextResponse.redirect(httpsUrl.toString(), 301);
  }

  // ─── ADMIN AUTHENTICATION SESSION CHECKS ──────────────────────────────────
  const isAuthPage = pathname === '/admin';
  const isAuthApi = pathname === '/api/admin/login';
  const isLogoutApi = pathname === '/api/admin/logout';
  
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminApiRoute = pathname.startsWith('/api/admin') && !isAuthApi && !isLogoutApi;

  if (isAdminRoute || isAdminApiRoute) {
    const sessionCookie = request.cookies.get('admin_session');
    const token = sessionCookie?.value;
    const payload = token ? await verifyToken(token) : null;
    const isAuthenticated = !!payload;

    if (isAdminRoute) {
      if (isAuthPage) {
        if (isAuthenticated) {
          // Logged-in admins are redirected to dashboard if visiting login page
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      } else {
        if (!isAuthenticated) {
          // Unauthenticated attempts redirected to login page
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
    }

    if (isAdminApiRoute) {
      if (!isAuthenticated) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized session' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  const response = NextResponse.next();

  // Add Strict-Transport-Security (HSTS) only in production and NOT for localhost/local dev
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !isLocalHost) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

// Config to match all routes except static assets, media files, and manifest/icons
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - common static files (images, css, js, fonts)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|svg|jpg|jpeg|gif|webp|css|js|woff|woff2)$).*)',
  ],
};
