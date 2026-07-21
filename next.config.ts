import type { NextConfig } from "next";
import { ARCHIVED_PRODUCT_REDIRECTS } from "./src/lib/seo/archived-product-redirects";

const nextConfig: NextConfig = {
  images: {
    // Enable WebP and AVIF formats
    formats: ['image/avif', 'image/webp'],

    // Set device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Minimize images during build
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year

    // Enable image optimization
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',

    // Allow external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'partyondelivery.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Venue image domains
      {
        protocol: 'https',
        hostname: 'images.squarespace-cdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.squarespace-cdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.showit.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.simpleviewinc.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3-media0.fl.yelpcdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.yelpcdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lirp.cdn-website.com',
        pathname: '/**',
      },
      // Partner logos for bulk-imported affiliates (Affiliate.logoUrl)
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cdn-website.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.gov',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**.com',
        pathname: '/**',
      },
    ],
  },

  // Enable build-time compression
  compress: true,

  // Optimize CSS and JS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'date-fns'],
  },

  // Production source maps for better debugging (can disable for smaller bundles)
  productionBrowserSourceMaps: false,

  // Optimize webpack bundle
  webpack: (config, { isServer }) => {
    // Analyze bundle size warnings
    config.performance = {
      maxAssetSize: 512000, // 512KB
      maxEntrypointSize: 512000,
      hints: 'warning',
    };

    // Optimize chunk splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },

  // 301 Redirects for SEO (from SEMrush audit - January 2025)
  async rewrites() {
    return [
      // Same-origin proxy for the Premier Party Cruises quote-page mirror
      // (public/partners-embed/premier-quote.html — Brian's own site,
      // mirrored per his direction). Premier's Vite build references
      // /assets/* + /attached_assets/* root-relative, and their CDN sends
      // no CORS headers, so <base>-loading the module scripts cross-origin
      // fails. Proxying through our origin sidesteps CORS entirely.
      // Neither path exists in POD (public/ has no assets/attached_assets).
      {
        source: '/assets/:path*',
        destination: 'https://premierpartycruises.com/assets/:path*',
      },
      {
        source: '/attached_assets/:path*',
        destination: 'https://premierpartycruises.com/attached_assets/:path*',
      },
    ];
  },

  async redirects() {
    return [
      // 2026-06-10 archived + orphaned product URL sweep — see
      // src/lib/seo/archived-product-redirects.ts and the rationale in
      // docs/seo/recommendations/product-page-editorial-sprint-2026-06.md
      ...ARCHIVED_PRODUCT_REDIRECTS,

      // Group order v2 slug rename
      {
        source: '/group-v2/:path*',
        destination: '/group/:path*',
        permanent: true,
      },

      // 2026-07-10 event page rename — /buckaroo-rodeo → /buckarodeo.
      // Preserves the invite links Brian already sent out.
      {
        source: '/buckaroo-rodeo',
        destination: '/buckarodeo',
        permanent: true,
      },

      // 2026-07-08 Full Moon Party moved to a date-specific URL so each
      // month's cruise gets its own page (/full-moon → /full-moon-aug1).
      // Keeps the already-live/indexed URL, shared links, and OG preview
      // working, and preserves the Stripe return URL for anyone mid-checkout.
      {
        source: '/full-moon',
        destination: '/full-moon-aug1',
        permanent: true,
      },

      // 2026-07-02 orphaned design-exploration demo pages deleted (zombie
      // catalog pattern — no inbound links, not in sitemap, no metadata,
      // linked to a 404ing /heritage). GSC + GA4 confirmed zero
      // impressions/clicks/pageviews in the prior 90 days before removal.
      {
        source: '/gin-martini',
        destination: '/cocktail-kits',
        permanent: true,
      },
      {
        source: '/old-fashioned',
        destination: '/cocktail-kits',
        permanent: true,
      },
      {
        source: '/negroni',
        destination: '/cocktail-kits',
        permanent: true,
      },
      {
        source: '/aperol-spritz',
        destination: '/cocktail-kits',
        permanent: true,
      },

      // Legacy Shopify blog URL space (/blogs/news/<slug>) → canonical /blog/<slug>.
      // The parallel route at src/app/blogs/news/[slug]/ was serving the same
      // JSON-backed posts as /blog/<slug>, creating duplicate content (143
      // indexed queries on /blogs/news/partyon-delivery-... alone per GSC
      // 2026-06). The /blog/[slug] route already handles JSON-legacy posts,
      // so consolidating is safe. The legacy parallel route is deleted in
      // the same commit.
      {
        source: '/blogs/news',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blogs/news/:slug',
        destination: '/blog/:slug',
        permanent: true,
      },

      // Corporate dual-route consolidation (2026-07-02): /corporate was the
      // older custom page (873 GSC impressions/90d at pos ~23, zero clicks);
      // /austin-corporate-event-delivery is the LandingPageTemplate paid
      // lander the main nav links to. Exact-path redirect only — the
      // /corporate/holiday-party and /corporate/products subpages stay live.
      {
        source: '/corporate',
        destination: '/austin-corporate-event-delivery',
        permanent: true,
      },

      // Product slug rename: ping pong balls 10pcs → 6pcs (pack size changed)
      {
        source: '/products/ping-pong-balls-10pcs',
        destination: '/products/ping-pong-balls-6pcs',
        permanent: true,
      },

      // Main ordering page redirects
      {
        source: '/products',
        destination: '/order',
        permanent: false,
        missing: [{ type: 'query', key: 'search' }],
      },
      {
        source: '/quick-order',
        destination: '/order',
        permanent: true,
      },

      // ALL blog URL truncation redirects REMOVED - they were blocking real blog posts
      // The :suffix* pattern matches ZERO or more chars, so it was catching exact URLs

      // Old /bach-parties URL space → new canonical bach landing.
      // Catches /bach-parties, /bach-parties/packages/<tier>, /bach-parties/products/<sku>,
      // and any other historical sub-routes that may still be indexed externally.
      {
        source: '/bach-parties',
        destination: '/austin-bachelor-party-delivery',
        permanent: true,
      },
      {
        source: '/bach-parties/:path+',
        destination: '/austin-bachelor-party-delivery',
        permanent: true,
      },
      {
        source: '/boat-partie(s)?$',  // Only match /boat-partie or /boat-parties at root (not /blog/boat-parties)
        destination: '/boat-parties',
        permanent: true,
      },

      // Non-existent pages - redirect to relevant sections
      {
        source: '/captains',
        destination: '/boat-parties',
        permanent: true,
      },
      {
        source: '/download-app',
        destination: '/',
        permanent: true,
      },
      // NOTE: ':suffix(.*)' not ':suffix*' — path-to-regexp bundled with
      // Next >=15.5 rejects a '*' repeat on a param glued to literal text
      // ("Can not repeat \"suffix\" without a prefix and suffix"), which
      // crashed dev startup. The custom-regex form matches the exact same
      // URLs (zero or more trailing chars).
      {
        source: '/downloa:suffix(.*)',
        destination: '/',
        permanent: true,
      },
      {
        source: '/fast-deliver:suffix(.*)',
        destination: '/delivery-areas',
        permanent: true,
      },
      {
        source: '/safety',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/weather',
        destination: '/',
        permanent: true,
      },

      // Dead product pages (crawled but no longer in catalog)
      {
        source: '/products/heb-cage-free-white-extra-l:suffix(.*)',
        destination: '/order',
        permanent: true,
      },

      // Catch-all for blog truncations with various patterns (only match obvious truncation artifacts)
      {
        source: '/blog/:slug*(November[0-9]|0\\.06|0\\.07|0\\.04|0\\.01)$',
        destination: '/blog',
        permanent: true,
      },

      // Blog corpus de-duplication (WS4, 2026-05). Source list lives in
      // docs/seo/blog-audit-2026-05.md. Regenerate via scripts/seo/audit-blog-corpus.mjs.
      {
        source: '/blog/all-inclusive-austin-wedding-venues-with-packages',
        destination: '/blog/all-inclusive-austin-wedding-venues',
        permanent: true,
      },
      {
        source: '/blog/austin-elopement-ideas-for-minimalist-couples',
        destination: '/blog/austin-elopement-ideas-minimalist',
        permanent: true,
      },
      {
        source: '/blog/best-party-barge-rentals-in-austin-for-large-groups',
        destination: '/blog/best-party-barge-rentals-austin',
        permanent: true,
      },
      {
        source: '/blog/best-small-wedding-venues-near-austin',
        destination: '/blog/best-small-wedding-venues-austin',
        permanent: true,
      },
      {
        source: '/blog/corporate-events-austin-guide',
        destination: '/blog/ultimate-guide-austin-corporate-events',
        permanent: true,
      },
      {
        source: '/blog/essential-checklist-for-your-lake-travis-party-boat-day',
        destination: '/blog/lake-travis-party-boat-checklist',
        permanent: true,
      },
      {
        source: '/blog/how-to-build-a-stress-free-wedding-vendor-checklist',
        destination: '/blog/stress-free-wedding-vendor-checklist',
        permanent: true,
      },
      {
        source: '/blog/how-to-plan-a-friday-or-sunday-wedding-to-save-money',
        destination: '/blog/friday-sunday-wedding-save-money',
        permanent: true,
      },
      {
        source: '/blog/how-to-plan-a-hill-country-wedding-in-under-six-months',
        destination: '/blog/plan-hill-country-wedding-six-months',
        permanent: true,
      },
      {
        source: '/blog/how-to-plan-a-rehearsal-dinner-at-austin-restaurants',
        destination: '/blog/rehearsal-dinner-austin-restaurants',
        permanent: true,
      },
      {
        source: '/blog/local-austin-florists-and-caterers-for-texas-style-weddings',
        destination: '/blog/austin-florists-caterers-texas-weddings',
        permanent: true,
      },
      {
        source: '/blog/signature-wedding-cocktails-perfect-for-texas-heat',
        destination: '/blog/signature-wedding-cocktails-texas-heat',
        permanent: true,
      },
      {
        source: '/blog/ultimate-guide-austin-boat-parties-lake-travis',
        destination: '/blog/ultimate-guide-lake-travis-boat-parties',
        permanent: true,
      },
      {
        source: '/blog/ultimate-guide-to-austin-boat-parties-on-lake-travis',
        destination: '/blog/ultimate-guide-lake-travis-boat-parties',
        permanent: true,
      },
      {
        source: '/blog/wedding-photography-locations-around-austin-s-lakes-and-hills',
        destination: '/blog/wedding-photography-austin-lakes-hills',
        permanent: true,
      },

      // Blog slug consolidation (2026-05). The source slugs were auto-generated
      // junk content (legacy posts.json entries) with hostile URLs and low-
      // quality content. The JSON entries are removed; redirects send any
      // residual organic traffic to the canonical landing/cluster pages we
      // built in the WS1-3 wedding cluster work.
      {
        source: '/blog/austin-party-houses-wedding-alcohol-delivery-unique-venues-for-austin-celebrations',
        destination: '/austin-wedding-venue-boats',
        permanent: true,
      },
      {
        source: '/blog/outdoor-wedding-alcohol-logistics-hill-country-and-austin-party-houses-coordination',
        destination: '/austin-wedding-venue-boats',
        permanent: true,
      },
      {
        source: '/blog/austin-wedding-venue-alcohol-policies-delivery-solutions-for-every-location',
        destination: '/blog/ultimate-guide-austin-wedding-bar-service',
        permanent: true,
      },
      {
        source: '/blog/wedding-anniversary-celebration-ideas-recreating-your-special-day-with-boat-and-alcohol-packages',
        destination: '/austin-wedding-venue-boats',
        permanent: true,
      },
      {
        source: '/blog/wedding-party-alcohol-coordination-getting-ready-bachelor-bachelorette-and-reception',
        destination: '/wedding-drink-calculator',
        permanent: true,
      },
      {
        source: '/blog/rehearsal-dinner-boat-alcohol-delivery-unique-wedding-weekend-experiences',
        destination: '/austin-wedding-venue-boats',
        permanent: true,
      },

      // Audit-missed near-dupe (the rustic-modern-wedding-decor pair). The
      // MDX with the unusual "-d-cor-" slug is deleted in this PR; canonical
      // lives at /blog/rustic-modern-wedding-decor-texas.
      {
        source: '/blog/how-to-blend-rustic-and-modern-wedding-d-cor-in-texas',
        destination: '/blog/rustic-modern-wedding-decor-texas',
        permanent: true,
      },
    ];
  },

  // Headers for caching, performance, and security
  async headers() {
    // Shared CSP directives used by both the strict (non-partner) and the
    // relaxed (partner landing page) rule. Only `frame-ancestors` differs
    // between the two so affiliates can embed their landing pages on their
    // own sites while the rest of the app stays locked down.
    const baseCspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.shopify.com *.myshopify.com *.google-analytics.com *.googletagmanager.com cdn.vercel-insights.com vercel.live connect.facebook.net *.doubleclick.net www.googleadservices.com *.google.com js.stripe.com *.clarity.ms cdn.plaid.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http: *.shopify.com *.myshopify.com images.unsplash.com *.squarespace-cdn.com *.wixstatic.com *.showit.co *.googleapis.com *.website-files.com *.simpleviewinc.com *.facebook.com www.facebook.com *.clarity.ms",
      "connect-src 'self' *.shopify.com *.myshopify.com *.google-analytics.com *.googletagmanager.com vitals.vercel-insights.com hooks.zapier.com connect.facebook.net *.facebook.com *.doubleclick.net www.googleadservices.com *.google.com api.stripe.com *.clarity.ms production.plaid.com sandbox.plaid.com development.plaid.com",
      // premierpartycruises.com + booking.* — Premier boat-quote embed on
      // two-tab partner pages (PartnerPageTabs). Without these, Chrome
      // blocks the frame with the broken-page icon (ERR_BLOCKED_BY_CSP).
      "frame-src 'self' *.shopify.com *.myshopify.com *.youtube.com *.youtube-nocookie.com *.recomsale.com vercel.live *.googletagmanager.com *.instagram.com js.stripe.com hooks.stripe.com checkout.stripe.com cdn.plaid.com premierpartycruises.com *.premierpartycruises.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' *.shopify.com *.myshopify.com",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ];

    const commonSecurityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];

    return [
      // ─── STRICT iframe policy — internal tools only ────────────────
      // /admin/* and /ops/* stay locked to SAMEORIGIN + frame-ancestors
      // 'self' so an attacker can't UI-redress a logged-in operator's
      // session (clickjacking). These are the only routes that carry
      // ops auth cookies + admin capabilities, so opening them to
      // arbitrary embedders is a real risk. Everything else on the site
      // is safe to embed because it's either public or requires an
      // explicit token/share-code in the URL.
      {
        source: '/:path(admin|admin/.*|ops|ops/.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          ...commonSecurityHeaders,
          {
            key: 'Content-Security-Policy',
            value: [...baseCspDirectives, "frame-ancestors 'self'"].join('; '),
          },
        ],
      },
      // ─── OPEN iframe policy — every customer-facing surface ────────
      // Homepage, landing pages, dashboard, invoice, products, blog,
      // event invites, partner pages, order flow, etc. Partners
      // (Premier Party Cruises, event hosts) can drop the POD site into
      // an iframe on their own web pages so guests never leave the
      // partner's brand experience.
      //
      // X-Frame-Options is intentionally omitted (the header has no
      // spec-compliant "allow all" value, and duplicating it after the
      // rule above would cause browsers to block embedding). Modern
      // browsers honor CSP `frame-ancestors *` instead.
      {
        source: '/:path((?!admin|ops|partners-embed).*)',
        headers: [
          ...commonSecurityHeaders,
          {
            key: 'Content-Security-Policy',
            value: [...baseCspDirectives, 'frame-ancestors *'].join('; '),
          },
        ],
      },
      // ─── PARTNER EMBED MIRRORS — /partners-embed/* ─────────────────
      // Same-origin mirrors of partner booking pages (e.g. Premier Party
      // Cruises' /quote incl. its Xola checkout), shown inside the
      // two-tab partner pages. These run the partner's own scripts via a
      // <base> tag pointing at their origin, so they need a relaxed CSP
      // scoped to this path only. noindex; only POD may frame them.
      {
        source: '/partners-embed/:path*',
        headers: [
          ...commonSecurityHeaders,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "connect-src 'self' https: wss:",
              "frame-src https:",
              "base-uri 'self' https://premierpartycruises.com",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
      // Service worker must never be cached — updates roll out on next
      // launch (registered with updateViaCache: 'none' in the HQ shell)
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Cache headers for images
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache headers for static files. Production-only: production chunk
      // filenames are content-hashed, so caching them forever is safe.
      // Turbopack dev-mode chunk filenames are stable across edits (their
      // *contents* change without the URL changing), so an immutable
      // year-long cache here means a dev's browser silently keeps serving
      // pre-edit JS after every save -- code changes stop showing up in
      // the browser with no error, until the cache is manually cleared.
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value:
              process.env.NODE_ENV === 'production'
                ? 'public, max-age=31536000, immutable'
                : 'no-cache',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
