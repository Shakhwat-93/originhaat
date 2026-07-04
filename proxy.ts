import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
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

// Config to match all routes except standard static files and metadata
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - common static files (images, css, js, fonts)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|svg|jpg|jpeg|gif|webp|css|js|woff|woff2)$).*)',
  ],
};
