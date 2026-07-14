/**
 * Partner logo extraction — used by the bulk-import flow so a freshly
 * created partner page has a real logo without a code deploy.
 *
 * Resolution order (first candidate that actually serves an image wins):
 *   1. Explicit logoUrl from the CSV row
 *   2. The partner site's own markup, best-first:
 *      <img> whose src/class/alt/id mentions "logo" → apple-touch-icon
 *      → og:image → large <link rel="icon"> (png/svg)
 *   3. Clearbit (https://logo.clearbit.com/<domain>) — validated, since
 *      Clearbit 404s for unknown domains
 *
 * Every candidate is verified with a real fetch (status 200 + image/*
 * content-type) so we never store a URL that renders as a broken image
 * on the partner page. All fetches are tightly time-boxed and restricted
 * to public https hosts (no private ranges — basic SSRF hygiene even
 * though the input is admin-gated).
 */

const PAGE_TIMEOUT_MS = 6000;
const IMAGE_TIMEOUT_MS = 4000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; PartyOnDelivery-LogoBot/1.0; +https://partyondelivery.com)';

/** Reject non-public hosts: localhost, raw private/link-local IPs, .local. */
function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
      return false;
    }
  }
  if (host.includes(':')) return false; // IPv6 literals — skip entirely
  return true;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  if (!isPublicHttpUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,image/*,*/*' },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** True when the URL serves an actual image we can render. */
export async function urlServesImage(url: string): Promise<boolean> {
  const res = await fetchWithTimeout(url, IMAGE_TIMEOUT_MS);
  if (!res || !res.ok) return false;
  const type = res.headers.get('content-type') ?? '';
  // .ico favicons are too small to use as a page logo
  return type.startsWith('image/') && !type.includes('image/vnd.microsoft.icon') && !type.includes('image/x-icon');
}

/** Resolve a possibly-relative src against the page URL; null if unusable. */
function absolutize(src: string, pageUrl: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  try {
    return new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }
}

/** Pull logo candidate URLs out of homepage HTML, best-first. */
export function extractLogoCandidates(html: string, pageUrl: string): string[] {
  const candidates: string[] = [];
  const push = (src: string | undefined) => {
    if (!src) return;
    const abs = absolutize(src, pageUrl);
    if (abs && !candidates.includes(abs)) candidates.push(abs);
  };

  // 1. <img> tags that look like a logo (src, class, alt, or id says so)
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgTags) {
    if (!/logo/i.test(tag)) continue;
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    push(src);
    if (candidates.length >= 3) break; // first few logo-ish imgs are enough
  }

  // 2. apple-touch-icon — usually a clean square brand mark
  for (const tag of html.match(/<link\b[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*>/gi) ?? []) {
    push(tag.match(/\bhref=["']([^"']+)["']/i)?.[1]);
  }

  // 3. og:image (often a hero photo, so it ranks below the real logos)
  push(
    html.match(
      /<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    )?.[1] ??
      html.match(
        /<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
      )?.[1]
  );

  // 4. png/svg favicons (skip .ico — too small)
  for (const tag of html.match(/<link\b[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gi) ?? []) {
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href && /\.(png|svg)(\?|$)/i.test(href)) push(href);
  }

  return candidates;
}

/** Normalize a CSV "website" value to a fetchable homepage URL. */
export function websiteToUrl(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;
  const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  return isPublicHttpUrl(withProto) ? withProto : null;
}

/**
 * Find the best working logo URL for a partner.
 * Returns null when nothing validates — the partner page then renders
 * the all-caps business-name wordmark instead.
 */
export async function resolveLogoUrl(
  website: string,
  explicitLogoUrl?: string | null
): Promise<string | null> {
  // Explicit CSV value wins when it actually serves an image
  if (explicitLogoUrl && (await urlServesImage(explicitLogoUrl))) {
    return explicitLogoUrl;
  }

  const pageUrl = websiteToUrl(website);
  if (!pageUrl) return null;

  // Scrape the partner's homepage for its own logo
  const res = await fetchWithTimeout(pageUrl, PAGE_TIMEOUT_MS);
  if (res?.ok) {
    const html = (await res.text()).slice(0, 500_000);
    for (const candidate of extractLogoCandidates(html, res.url || pageUrl).slice(0, 5)) {
      if (await urlServesImage(candidate)) return candidate;
    }
  }

  // Clearbit fallback — validated, since it 404s for unknown domains
  const domain = new URL(pageUrl).hostname.replace(/^www\./, '');
  const clearbit = `https://logo.clearbit.com/${domain}`;
  if (await urlServesImage(clearbit)) return clearbit;

  return null;
}
