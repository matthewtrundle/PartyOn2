import { NextRequest, NextResponse } from 'next/server';
import { OPS_SESSION_COOKIE, verifyOpsSessionToken } from '@/lib/auth/ops-token';

/**
 * Middleware:
 * 1. Enforce canonical non-www domain
 * 2. Require a valid ops session for all /api/v1/admin/* routes
 * 3. Set affiliate attribution cookie from ?ref= param OR /partners/<slug> path
 *    (per ADR M0001: partner-page visits must attribute even without ?ref=)
 */
export async function middleware(request: NextRequest) {
  const { hostname } = request.nextUrl;

  // Redirect www to non-www (canonical domain)
  if (hostname.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.hostname = hostname.replace('www.', '');
    // 301 Permanent Redirect for SEO
    // The redirected request will re-enter middleware with the same ?ref= param
    return NextResponse.redirect(url, { status: 301 });
  }

  // Ops auth gate for the entire admin API surface. The matcher below must
  // keep matching /api/v1/admin/* for this to hold — destructive routes also
  // carry their own requireOpsAuth as defense in depth.
  if (request.nextUrl.pathname.startsWith('/api/v1/admin')) {
    const token = request.cookies.get(OPS_SESSION_COOKIE)?.value;
    const session = token ? await verifyOpsSessionToken(token) : null;
    if (!session) {
      // Same shape as requireOpsAuth() so ops-panel error handling sees one format
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users away from affiliate dashboard
  if (request.nextUrl.pathname.startsWith('/affiliate/dashboard')) {
    const session = request.cookies.get('affiliate_session');
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/affiliate/login';
      loginUrl.search = '';
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  const cookieValue = resolveRefCookieValue(request.nextUrl);
  if (cookieValue) {
    response.cookies.set('ref_code', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }

  return response;
}

/**
 * Resolve the ref_code cookie value from a request URL.
 *
 * Precedence (last-touch wins, but explicit ?ref= beats path inference):
 * 1. ?ref=<code> query param — uppercased.
 * 2. /partners/<slug>[/...] path — slug uppercased.
 *
 * Returns null when neither applies (so callers leave any existing cookie alone).
 *
 * The cookie value may be either an Affiliate.code (from ?ref=) or a partnerSlug
 * (from /partners/<slug>). linkOrderToAffiliate at checkout matches either form.
 *
 * Excluded paths: /partners/pitch is the prospective-partner sales page, not an
 * affiliate. Treating it as one would set a junk cookie that downstream lookups
 * would just discard, but we'd rather not pollute the cookie at all.
 */
export function resolveRefCookieValue(url: URL | { searchParams: URLSearchParams; pathname: string }): string | null {
  const refParam = url.searchParams.get('ref');
  if (refParam) return refParam.toUpperCase();

  const partnerMatch = url.pathname.match(/^\/partners\/([^/]+)/i);
  if (partnerMatch) {
    const slug = partnerMatch[1].toLowerCase();
    if (slug === 'pitch') return null;
    return slug.toUpperCase();
  }

  return null;
}

/**
 * Configure which routes should run this middleware
 * Match all paths except Next.js internal files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
