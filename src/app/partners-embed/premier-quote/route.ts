/**
 * Same-origin proxy for the Premier Party Cruises quote page.
 *
 * Iframed by the "Party Boat Rentals" tab on every co-branded partner page
 * (`/partners/<slug>`). Fetches Premier's live shell so their content-hashed
 * bundle URLs are always current — see `src/lib/partners/premier-embed.ts`
 * for why a committed snapshot kept blanking this tab.
 */

import {
  PREMIER_EMBED_REVALIDATE_SECONDS,
  PREMIER_QUOTE_UPSTREAM,
  buildPremierEmbedHtml,
  premierEmbedFallbackHtml,
} from '@/lib/partners/premier-embed';

/** Give up on Premier rather than hang the partner page. */
const UPSTREAM_TIMEOUT_MS = 8000;

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Cached at the edge so a partner page open does not hit Premier every
      // time; stale-while-revalidate keeps the tab working through a blip.
      'Cache-Control': `public, max-age=0, s-maxage=${PREMIER_EMBED_REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET(): Promise<Response> {
  try {
    const upstream = await fetch(PREMIER_QUOTE_UPSTREAM, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: 'text/html' },
      next: { revalidate: PREMIER_EMBED_REVALIDATE_SECONDS },
    });

    if (!upstream.ok) {
      console.error(
        `[premier-embed] upstream ${PREMIER_QUOTE_UPSTREAM} returned ${upstream.status}`
      );
      return htmlResponse(premierEmbedFallbackHtml(), 200);
    }

    const injected = buildPremierEmbedHtml(await upstream.text());
    if (!injected) {
      // 200 but not a shell we can boot — exactly the silent-blank case.
      console.error('[premier-embed] upstream HTML is not a bootable Premier shell');
      return htmlResponse(premierEmbedFallbackHtml(), 200);
    }

    return htmlResponse(injected, 200);
  } catch (error) {
    console.error('[premier-embed] failed to fetch Premier quote shell', error);
    return htmlResponse(premierEmbedFallbackHtml(), 200);
  }
}
