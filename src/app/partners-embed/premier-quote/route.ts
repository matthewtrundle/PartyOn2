/**
 * Same-origin proxy for the Premier Party Cruises quote page.
 *
 * Iframed by the "Party Boat Rentals" tab on every co-branded partner page
 * (`/partners/<slug>`). Fetches Premier's live shell so their content-hashed
 * bundle URLs are always current — see `src/lib/partners/premier-embed.ts`
 * for why a committed snapshot kept blanking this tab.
 *
 * Query params (both set by the injected watchdog, never by a person):
 * - `?fresh=1`    bypass every cache layer — the one retry after a blank panel
 * - `?fallback=1` render the link-out card instead of proxying
 */

import type { NextRequest } from 'next/server';
import {
  PREMIER_EMBED_REVALIDATE_SECONDS,
  PREMIER_QUOTE_UPSTREAM,
  buildPremierEmbedHtml,
  extractEntryScriptUrl,
  isJavaScriptContentType,
  premierEmbedFallbackHtml,
} from '@/lib/partners/premier-embed';

/** Give up on Premier rather than hang the partner page. */
const UPSTREAM_TIMEOUT_MS = 8000;

/** Validating the entry bundle must not add meaningful latency. */
const ASSET_CHECK_TIMEOUT_MS = 4000;

function htmlResponse(body: string, cache: 'store' | 'no-store'): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control':
        cache === 'no-store'
          ? 'no-store'
          : // One TTL, at the edge. The upstream fetch is deliberately
            // uncached so staleness cannot stack into ~10min (or an hour of
            // stale-while-revalidate) of a shell whose assets have expired.
            `public, max-age=0, s-maxage=${PREMIER_EMBED_REVALIDATE_SECONDS}, stale-while-revalidate=600`,
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/** Fetch Premier's shell. Always uncached upstream — see htmlResponse. */
async function fetchShell(): Promise<string | null> {
  const upstream = await fetch(PREMIER_QUOTE_UPSTREAM, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { Accept: 'text/html' },
    cache: 'no-store',
  });
  if (!upstream.ok) {
    console.error(`[premier-embed] upstream returned ${upstream.status}`);
    return null;
  }
  return upstream.text();
}

/**
 * Is the shell's entry bundle actually JavaScript?
 *
 * This is the check that would have caught both blank-panel outages, moved
 * server-side: Netlify answers a vanished bundle with 200 + `text/html`, and
 * the browser then refuses to execute it. Costs one ranged request per cache
 * miss (~once per 5 minutes site-wide).
 *
 * Fails OPEN — a network blip here must not blank a working tab.
 */
async function entryBundleIsLive(html: string): Promise<boolean> {
  const entry = extractEntryScriptUrl(html);
  if (!entry) return false;
  try {
    const res = await fetch(new URL(entry, PREMIER_QUOTE_UPSTREAM), {
      signal: AbortSignal.timeout(ASSET_CHECK_TIMEOUT_MS),
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store',
    });
    if (!res.ok && res.status !== 206) return true;
    return isJavaScriptContentType(res.headers.get('content-type'));
  } catch (error) {
    console.error('[premier-embed] entry-bundle check failed, serving anyway', error);
    return true;
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  if (params.get('fallback') === '1') {
    return htmlResponse(premierEmbedFallbackHtml(), 'no-store');
  }
  const fresh = params.get('fresh') === '1';
  const cache = fresh ? 'no-store' : 'store';

  try {
    let html = await fetchShell();

    // A stale shell paired with vanished assets is the blank-panel bug. Our
    // fetch is already uncached, so one refetch only helps against an upstream
    // deploy race — but it is cheap and turns a blank tab into a working one.
    if (html && !(await entryBundleIsLive(html))) {
      console.error('[premier-embed] entry bundle is not JavaScript — refetching');
      html = await fetchShell();
      if (html && !(await entryBundleIsLive(html))) {
        console.error('[premier-embed] entry bundle still dead — serving fallback');
        return htmlResponse(premierEmbedFallbackHtml(), 'no-store');
      }
    }

    const injected = html ? buildPremierEmbedHtml(html) : null;
    if (!injected) {
      // 200 but not a shell we can boot — exactly the silent-blank case.
      console.error('[premier-embed] upstream HTML is not a bootable Premier shell');
      return htmlResponse(premierEmbedFallbackHtml(), 'no-store');
    }

    return htmlResponse(injected, cache);
  } catch (error) {
    console.error('[premier-embed] failed to fetch Premier quote shell', error);
    return htmlResponse(premierEmbedFallbackHtml(), 'no-store');
  }
}
