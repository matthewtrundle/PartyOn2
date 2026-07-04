import Link from 'next/link';
import type { ReactElement } from 'react';

/**
 * A single product shown in the "popular for this event" strip. `handle`
 * is the Postgres product handle — the card links to `/products/<handle>`.
 * `blurb` is event-specific copy (why this product fits *this* occasion),
 * which doubles as descriptive anchor context for internal-link SEO.
 */
export interface PopularProduct {
  handle: string;
  name: string;
  blurb: string;
  /** Display price string, e.g. "$19.99". Optional. */
  price?: string;
}

interface PopularProductsStripProps {
  /** Section heading, e.g. "Popular for Austin bachelor parties". */
  heading: string;
  /** Optional intro line under the heading. */
  intro?: string;
  products: PopularProduct[];
  /**
   * Section wrapper classes (background + padding). Defaults to a white
   * band; pass `py-24 bg-gray-50` etc. to alternate against neighbours.
   */
  sectionClassName?: string;
}

/**
 * Contextual "popular for this event" product strip.
 *
 * Drops crawlable, descriptive internal links from high-traffic landing
 * pages down to Tier-1/Tier-3 product pages — the topic-graph signal the
 * May 2026 Core Update rewards. Purely presentational (no data fetching),
 * so it renders inside both the client `LandingPageTemplate` and the
 * standalone `/boat-parties` and `/weddings` pages.
 */
export default function PopularProductsStrip({
  heading,
  intro,
  products,
  sectionClassName = 'py-16 md:py-20 bg-white',
}: PopularProductsStripProps): ReactElement | null {
  if (!products.length) return null;

  return (
    <section className={sectionClassName}>
      <div className="container-custom">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-[0.1em] mb-3">
            {heading}
          </h2>
          {intro && (
            <p className="text-base text-gray-600 leading-relaxed">{intro}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link
              key={product.handle}
              href={`/products/${product.handle}`}
              className="card flex flex-col group focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <h3 className="font-heading text-lg font-bold text-gray-900 tracking-[0.08em] mb-2 group-hover:text-brand-blue transition-colors">
                {product.name}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                {product.blurb}
              </p>
              <div className="mt-4 flex items-center justify-between">
                {product.price && (
                  <span className="text-base font-semibold text-gray-900">
                    {product.price}
                  </span>
                )}
                <span className="text-sm font-semibold tracking-[0.08em] text-brand-blue">
                  View &amp; add &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
