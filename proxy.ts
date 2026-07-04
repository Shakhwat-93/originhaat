import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const headers = request.headers;
  const proto = headers.get('x-forwarded-proto');

  console.log(`[PROXY DEBUG] URL: ${request.url} | x-forwarded-proto: ${proto}`);

  const isProd = process.env.NODE_ENV === 'production';

  // Only perform HTTPS redirection in production (deployed proxy environment)
  if (isProd && proto === 'http') {
    const host = headers.get('x-forwarded-host') || headers.get('host');
    if (host) {
      // Reconstruct the HTTPS URL using the forwarded host and path/query.
      // We do not use request.nextUrl.clone() directly as it might include the internal 
      // container port (e.g. :3000), which would break public redirects.
      const httpsUrl = new URL(
        request.nextUrl.pathname + request.nextUrl.search,
        `https://${host}`
      );
      
      // Perform a permanent (301) redirect to preserve SEO link equity.
      return NextResponse.redirect(httpsUrl.toString(), 301);
    }
  }

  return NextResponse.next();
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
