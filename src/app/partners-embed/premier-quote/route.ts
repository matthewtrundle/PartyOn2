/**
 * Same-origin proxy for the Premier Party Cruises quote page.
 *
 * Iframed by the "Party Boat Rentals" tab on every co-branded partner page
 * (`/partners/<slug>`). Fetches Premier's live `/get-a-quote` page so a partner
 * guest always sees the current booking form — see
 * `src/lib/partners/premier-embed.ts` for why a committed snapshot kept blanking
 * this tab, and why the page is now server-rendered rather than a Vite SPA.
 *
 * Query params (manual overrides, mainly for debugging):
 * - `?fresh=1`    bypass the edge cache and refetch the upstream
 * - `?fallback=1` render the link-out card instead of proxying
 */

import type { NextRequest } from 'next/server';
import {
  PREMIER_EMBED_REVALIDATE_SECONDS,
  PREMIER_QUOTE_UPSTREAM,
  buildPremierEmbedHtml,
  premierEmbedFallbackHtml,
} from '@/lib/partners/premier-embed';

/** Give up on Premier rather than hang the partner page. */
const UPSTREAM_TIMEOUT_MS = 8000;

function htmlResponse(body: string, cache: 'store' | 'no-store'): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control':
        cache === 'no-store'
          ? 'no-store'
          : // One TTL, at the edge. The upstream fetch is deliberately
            // uncached so staleness cannot stack.
            `public, max-age=0, s-maxage=${PREMIER_EMBED_REVALIDATE_SECONDS}, stale-while-revalidate=600`,
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/**
 * Fetch Premier's quote page and inject POD's additions. Follows the
 * `/quote` -> `/get-a-quote` redirect. Returns null when the upstream is
 * unreachable or is not the quote page (a redirect stub or error/holding page).
 * Always uncached upstream — see htmlResponse.
 */
async function fetchEmbed(): Promise<string | null> {
  const upstream = await fetch(PREMIER_QUOTE_UPSTREAM, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { Accept: 'text/html' },
    cache: 'no-store',
  });
  if (!upstream.ok) {
    console.error(`[premier-embed] upstream returned ${upstream.status}`);
    return null;
  }
  return buildPremierEmbedHtml(await upstream.text());
}

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  if (params.get('fallback') === '1') {
    return htmlResponse(premierEmbedFallbackHtml(), 'no-store');
  }
  const fresh = params.get('fresh') === '1';
  const cache = fresh ? 'no-store' : 'store';

  try {
    // One cheap retry: a null here is usually Premier mid-deploy, which clears
    // in seconds. A second miss means the page really changed shape — serve the
    // working link-out card rather than a blank tab.
    let injected = await fetchEmbed();
    if (!injected) injected = await fetchEmbed();
    if (!injected) {
      console.error('[premier-embed] upstream is not the Premier quote page — serving fallback');
      return htmlResponse(premierEmbedFallbackHtml(), 'no-store');
    }
    return htmlResponse(injected, cache);
  } catch (error) {
    console.error('[premier-embed] failed to fetch Premier quote page', error);
    return htmlResponse(premierEmbedFallbackHtml(), 'no-store');
  }
}
